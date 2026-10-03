"""Phase 1 integrity tests: server-authoritative distance, vehicle-type and
registered-vehicle validation, and coordinate validation.

These exercise the real ride-offer handler so a manipulated request cannot
bypass the controls by calling the service directly.
"""

import os
import sys
from pathlib import Path

from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
import importlib
import pkgutil
import app.models as _models

for _mod in pkgutil.iter_modules(_models.__path__):
    importlib.import_module(f"app.models.{_mod.name}")

import pytest
from pydantic import ValidationError

from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.document import Document
from app.models.ride import Ride
from app.schemas.document import DocumentStatus, DocumentStatusUpdate
from app.routes.admin import update_document_status, verify_admin_role
from app.routes.ride import RideOfferCreate, publish_ride_offer
from app.services.driver_verification import normalize_document_type
from app.services import ride_validation
from app.services.ride_validation import (
    enforce_driver_vehicle_type,
    normalize_vehicle_type,
    resolve_authoritative_distance,
    supported_vehicle_types,
    validate_coordinate,
    validate_coordinate_pair,
    validate_seat_count,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

# Hyderabad-ish points with a genuinely long separation, used to prove that a
# tiny client-supplied distance cannot shrink the fare.
FAR_PICKUP = (17.3850, 78.4867)   # Hyderabad
FAR_DROPOFF = (17.6868, 83.2185)  # Visakhapatnam (~600 km straight line)


@pytest.fixture(autouse=True)
def stub_routing(monkeypatch):
    """Make routing deterministic and offline.

    ``resolve_authoritative_distance`` asks the routing service for a road
    distance; tests must not depend on the public OSRM demo server.
    """

    def fake_route_distance(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon):
        # Return 1.25x the great-circle distance, mirroring the road-curvature
        # assumption used by the mobile client.
        return ride_validation.haversine_km(
            pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
        ) * 1.25

    monkeypatch.setattr(
        ride_validation, "calculate_route_distance_km", fake_route_distance
    )
    yield


def make_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_driver(db, email="offer_driver@x.com", vehicle_type=None, with_docs=True):
    driver = User(
        email=email,
        full_name="Offer Driver",
        role="driver",
        password="password",
        is_verified=True,
    )
    db.add(driver)
    db.commit()

    if vehicle_type is not None:
        db.add(
            Vehicle(
                driver_id=driver.id,
                make="Test",
                model="Model",
                license_plate=f"TS{driver.id:04d}",
                capacity=4,
                vehicle_type=vehicle_type,
            )
        )
        db.commit()

    if with_docs:
        db.add_all(
            [
                Document(
                    user_id=driver.id,
                    document_type="driving_licence",
                    file_path="test/approved-license.pdf",
                    status="approved",
                ),
                Document(
                    user_id=driver.id,
                    document_type="rc_book",
                    file_path="test/approved-rc.pdf",
                    status="approved",
                ),
            ]
        )
        db.commit()

    return driver


def make_offer(**overrides):
    payload = {
        "pickup_location": "Hyderabad",
        "pickup_lat": FAR_PICKUP[0],
        "pickup_lon": FAR_PICKUP[1],
        "dropoff_location": "Visakhapatnam",
        "dropoff_lat": FAR_DROPOFF[0],
        "dropoff_lon": FAR_DROPOFF[1],
        "distance_km": 630.0,
        "vehicle_type": "car",
        "available_seats": 3,
        "gender_preference": "any",
    }
    payload.update(overrides)
    return RideOfferCreate(**payload)


# ---------------------------------------------------------------------------
# 1. Server-authoritative distance
# ---------------------------------------------------------------------------

def test_manipulated_short_distance_is_rejected():
    """A client claiming 1 km for a ~600 km route must be rejected."""
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(distance_km=1.0), db, driver)

    assert exc.value.status_code == 400
    assert "does not match the route" in exc.value.detail


def test_manipulated_distance_cannot_create_a_ride():
    """The rejection must leave no ride behind."""
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException):
        publish_ride_offer(make_offer(distance_km=1.0), db, driver)

    assert db.query(Ride).count() == 0


def test_fare_is_computed_from_server_distance_not_client_value():
    """Pricing must reflect the authoritative distance."""
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    result = publish_ride_offer(make_offer(distance_km=630.0), db, driver)
    assert result["success"] is True

    ride = db.query(Ride).one()
    authoritative = ride_validation.haversine_km(
        FAR_PICKUP[0], FAR_PICKUP[1], FAR_DROPOFF[0], FAR_DROPOFF[1]
    ) * 1.25

    assert ride.distance_km == pytest.approx(round(authoritative, 2), abs=0.01)
    # The stored distance must be the server's figure, not the client's.
    assert ride.distance_km != 630.0
    assert ride.distance_km > 500.0


def test_understated_distance_cannot_lower_the_fare():
    """Two offers for the same route must price identically regardless of the
    client-supplied distance, as long as it is not rejected outright."""
    honest = resolve_authoritative_distance(
        FAR_PICKUP[0], FAR_PICKUP[1], FAR_DROPOFF[0], FAR_DROPOFF[1],
        client_distance_km=630.0,
    )
    slightly_low = resolve_authoritative_distance(
        FAR_PICKUP[0], FAR_PICKUP[1], FAR_DROPOFF[0], FAR_DROPOFF[1],
        client_distance_km=500.0,
    )

    # Both resolve to the same authoritative distance -> same fare basis.
    assert honest["distance_km"] == slightly_low["distance_km"]

    from app.services.pricing_service import calculate_ride_fare

    assert (
        calculate_ride_fare(honest["distance_km"], "car")["mrp_fare"]
        == calculate_ride_fare(slightly_low["distance_km"], "car")["mrp_fare"]
    )


def test_omitted_client_distance_still_prices_authoritatively():
    """A client that sends no distance at all still gets a correct fare."""
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    result = publish_ride_offer(
        make_offer(distance_km=0.0, price_per_seat=None), db, driver
    )
    assert result["success"] is True

    ride = db.query(Ride).one()
    assert ride.distance_km > 500.0
    assert ride.price_per_seat > 0


def test_distance_falls_back_to_haversine_when_routing_unavailable(monkeypatch):
    monkeypatch.setattr(
        ride_validation, "calculate_route_distance_km", lambda *a, **k: None
    )
    info = resolve_authoritative_distance(
        FAR_PICKUP[0], FAR_PICKUP[1], FAR_DROPOFF[0], FAR_DROPOFF[1]
    )
    assert info["source"] == "haversine_fallback"
    assert info["distance_km"] > 500.0


def test_distance_rejected_even_when_honest_value_is_also_supplied():
    """The guard compares against the authoritative route, not the request."""
    with pytest.raises(HTTPException) as exc:
        resolve_authoritative_distance(
            FAR_PICKUP[0], FAR_PICKUP[1], FAR_DROPOFF[0], FAR_DROPOFF[1],
            client_distance_km=0.5,
        )
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# 2. Vehicle type validation
# ---------------------------------------------------------------------------

def test_supported_vehicle_types_are_derived_from_pricing_config():
    supported = supported_vehicle_types()
    assert "car" in supported
    assert "bike" in supported


@pytest.mark.parametrize("value,expected", [
    ("car", "car"),
    ("CAR", "car"),
    ("bike", "bike"),
    (" Bike ", "bike"),
    ("carpool", "car"),
])
def test_vehicle_type_normalisation(value, expected):
    assert normalize_vehicle_type(value) == expected


@pytest.mark.parametrize("value", ["truck", "suv", "plane", "", "   ", None])
def test_invalid_vehicle_type_is_rejected(value):
    with pytest.raises(HTTPException) as exc:
        normalize_vehicle_type(value)
    assert exc.value.status_code == 400


def test_unsupported_vehicle_type_rejected_at_offer():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(vehicle_type="truck"), db, driver)
    assert exc.value.status_code == 400


def test_bike_seat_limit_enforced():
    with pytest.raises(HTTPException) as exc:
        validate_seat_count("bike", 3)
    assert exc.value.status_code == 400
    assert validate_seat_count("bike", 1) == 1
    assert validate_seat_count("car", 4) == 4


# ---------------------------------------------------------------------------
# 3. Driver registered-vehicle validation
# ---------------------------------------------------------------------------

def test_car_registered_driver_cannot_offer_bike_ride():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(
            make_offer(vehicle_type="bike", available_seats=1), db, driver
        )

    assert exc.value.status_code == 403
    assert "mismatch" in exc.value.detail.lower()
    assert db.query(Ride).count() == 0


def test_bike_registered_driver_cannot_offer_car_ride():
    db = make_session()
    driver = make_driver(db, vehicle_type="bike")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(
            make_offer(vehicle_type="car", available_seats=3), db, driver
        )

    assert exc.value.status_code == 403
    assert db.query(Ride).count() == 0


def test_car_registered_driver_can_offer_car_ride():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")
    result = publish_ride_offer(make_offer(vehicle_type="car"), db, driver)
    assert result["success"] is True
    assert db.query(Ride).one().vehicle_type == "car"


def test_bike_registered_driver_can_offer_bike_ride():
    db = make_session()
    driver = make_driver(db, vehicle_type="bike")
    result = publish_ride_offer(
        make_offer(vehicle_type="bike", available_seats=1), db, driver
    )
    assert result["success"] is True
    assert db.query(Ride).one().vehicle_type == "bike"


@pytest.mark.parametrize(
    ("approved_type", "missing_type"),
    [("license", "rc_book"), ("rc_book", "license")],
)
def test_ride_offer_requires_both_license_and_rc(approved_type, missing_type):
    db = make_session()
    driver = make_driver(db, vehicle_type="car", with_docs=False)
    db.add(
        Document(
            user_id=driver.id,
            document_type=approved_type,
            file_path=f"test/{approved_type}.pdf",
            status="approved",
        )
    )
    db.commit()

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(), db, driver)

    assert exc.value.status_code == 403


def test_ride_offer_accepts_both_approved_required_documents():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    result = publish_ride_offer(make_offer(), db, driver)

    assert result["success"] is True


def test_rejected_required_document_blocks_ride_offer():
    db = make_session()
    driver = make_driver(db, vehicle_type="car", with_docs=False)
    db.add_all(
        [
            Document(user_id=driver.id, document_type="license", file_path="test/license.pdf", status="rejected"),
            Document(user_id=driver.id, document_type="rc_book", file_path="test/rc.pdf", status="approved"),
        ]
    )
    db.commit()

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(), db, driver)

    assert exc.value.status_code == 403


def test_document_type_aliases_are_bounded():
    assert normalize_document_type("Driving Licence") == "license"
    assert normalize_document_type("Vehicle RC") == "rc_book"
    assert normalize_document_type("arbitrary_admin") is None


def test_admin_document_approval_uses_canonical_status():
    db = make_session()
    driver = make_driver(db, vehicle_type="car", with_docs=False)
    document = Document(
        user_id=driver.id,
        document_type="license",
        file_path="test/license.pdf",
        status="pending",
    )
    db.add(document)
    db.commit()
    admin = User(email="admin@x.com", full_name="Admin", role="admin", password="password")
    db.add(admin)
    db.commit()

    assert verify_admin_role(admin) is admin
    result = update_document_status(document.id, DocumentStatus.APPROVED, db, admin)

    assert result["document"]["status"] == "approved"


def test_admin_document_rejection_uses_canonical_status():
    db = make_session()
    driver = make_driver(db, vehicle_type="car", with_docs=False)
    document = Document(
        user_id=driver.id,
        document_type="rc_book",
        file_path="test/rc.pdf",
        status="pending",
    )
    admin = User(email="admin-reject@x.com", full_name="Admin", role="admin", password="password")
    db.add_all([document, admin])
    db.commit()

    result = update_document_status(document.id, DocumentStatus.REJECTED, db, admin)

    assert result["document"]["status"] == "rejected"


def test_legacy_verified_status_is_not_accepted_as_review_input():
    with pytest.raises(ValidationError):
        DocumentStatusUpdate(status="verified")


def test_ordinary_user_cannot_review_documents():
    user = User(email="ordinary@x.com", full_name="Ordinary", role="driver", password="password")

    with pytest.raises(HTTPException) as exc:
        verify_admin_role(user)

    assert exc.value.status_code == 403


def test_driver_without_registered_vehicle_type_is_not_blocked():
    """Legacy rows have no vehicle_type; they must keep working."""
    db = make_session()
    driver = make_driver(db, vehicle_type=None)
    assert enforce_driver_vehicle_type(db, driver.id, "car") == "car"
    assert enforce_driver_vehicle_type(db, driver.id, "bike") == "bike"


def test_unrecognised_stored_vehicle_type_is_not_enforced():
    """A garbage value on the vehicle row must not hard-fail the driver."""
    db = make_session()
    driver = make_driver(db, vehicle_type="car")
    vehicle = db.query(Vehicle).one()
    vehicle.vehicle_type = "spaceship"
    db.commit()

    # Treated as unknown -> declared type accepted rather than crashing.
    assert enforce_driver_vehicle_type(db, driver.id, "car") == "car"


# ---------------------------------------------------------------------------
# 4. Coordinate validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value", [90.0, -90.0, 0.0, 17.385])
def test_valid_latitudes_accepted(value):
    assert validate_coordinate(value, "latitude") == value


@pytest.mark.parametrize("value", [180.0, -180.0, 0.0, 78.4867])
def test_valid_longitudes_accepted(value):
    assert validate_coordinate(value, "longitude") == value


@pytest.mark.parametrize("value", [90.1, -90.1, 200.0, -1000.0])
def test_out_of_range_latitude_rejected(value):
    with pytest.raises(HTTPException) as exc:
        validate_coordinate(value, "latitude")
    assert exc.value.status_code == 400


@pytest.mark.parametrize("value", [180.1, -180.1, 900.0])
def test_out_of_range_longitude_rejected(value):
    with pytest.raises(HTTPException) as exc:
        validate_coordinate(value, "longitude")
    assert exc.value.status_code == 400


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_coordinates_rejected(value):
    with pytest.raises(HTTPException) as exc:
        validate_coordinate(value, "latitude")
    assert exc.value.status_code == 400


@pytest.mark.parametrize("value", ["abc", None, True, {}])
def test_non_numeric_coordinates_rejected(value):
    with pytest.raises(HTTPException) as exc:
        validate_coordinate(value, "latitude")
    assert exc.value.status_code == 400


def test_coordinate_pair_returns_floats():
    lat, lon = validate_coordinate_pair(17, 78, "Pickup")
    assert lat == 17.0 and lon == 78.0


def test_invalid_latitude_rejected_at_offer():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(pickup_lat=999.0), db, driver)

    assert exc.value.status_code == 400
    assert db.query(Ride).count() == 0


def test_invalid_longitude_rejected_at_offer():
    db = make_session()
    driver = make_driver(db, vehicle_type="car")

    with pytest.raises(HTTPException) as exc:
        publish_ride_offer(make_offer(dropoff_lon=-500.0), db, driver)

    assert exc.value.status_code == 400
    assert db.query(Ride).count() == 0


def test_coordinate_bounds_are_inclusive():
    """Exactly on the boundary is still valid."""
    validate_coordinate_pair(90.0, 180.0, "Edge")
    validate_coordinate_pair(-90.0, -180.0, "Edge")
