"""Security tests for Issue 1: Booking & Ride Completion Lifecycle (pytest)."""
import os
import sys
from datetime import datetime, timedelta, timezone
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

from app.models.user import User
from app.models.ride import Ride
from app.models.booking import Booking
from app.services.booking_state_service import (
    complete_booking_for_driver,
    complete_ride_bookings,
)
from app.routes.ride import start_driver_ride, complete_driver_ride
from app.routes.bookings import verify_booking_otp
from app.schemas.booking import VerifyOTP


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_test_data(db, booking_status="ACCEPTED", otp_verified=False, otp_code="123456"):
    driver = User(email="driver@x.com", full_name="Driver User", role="driver", password="password", is_verified=True)
    passenger = User(email="pass@x.com", full_name="Passenger User", role="passenger", password="password", is_verified=True)
    other_driver = User(email="other@x.com", full_name="Other Driver", role="driver", password="password", is_verified=True)
    db.add_all([driver, passenger, other_driver])
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="Pickup A", destination="Drop B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="published", vehicle_type="car",
        price_per_seat=100.0, final_fare=100.0,
    )
    db.add(ride)
    db.commit()

    booking = Booking(
        ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
        pickup_location="Pickup A", pickup_lat=1.0, pickup_lon=1.0,
        dropoff_location="Drop B", dropoff_lat=2.0, dropoff_lon=2.0,
        fare=100.0, status=booking_status, otp_code=otp_code,
        otp_verified=otp_verified,
    )
    db.add(booking)
    db.commit()

    return driver, passenger, other_driver, ride, booking


# ---------------------------------------------------------------------------
# PASS TESTS
# ---------------------------------------------------------------------------

def test_pending_cannot_become_completed():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="PENDING", otp_verified=False)
    try:
        complete_booking_for_driver(db, booking.id, driver.id)
        assert False, "Expected HTTPException 400 for PENDING booking completion"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "not ready to be completed" in exc.detail or "cannot be completed" in exc.detail


def test_accepted_cannot_become_completed():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_verified=False)
    try:
        complete_booking_for_driver(db, booking.id, driver.id)
        assert False, "Expected HTTPException 400 for ACCEPTED booking completion"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "not ready to be completed" in exc.detail


def test_accepted_wrong_otp_cannot_become_started():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_code="123456")
    try:
        verify_booking_otp(booking.id, VerifyOTP(otp="999999"), db, driver)
        assert False, "Expected HTTPException 400 for invalid OTP"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "Invalid OTP" in exc.detail
    db.refresh(booking)
    assert booking.status == "ACCEPTED"
    assert booking.otp_verified is False


def test_accepted_correct_otp_becomes_started():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_code="123456")
    res = verify_booking_otp(booking.id, VerifyOTP(otp="123456"), db, driver)
    assert res["success"] is True
    db.refresh(booking)
    assert booking.status == "STARTED"
    assert booking.otp_verified is True


def test_started_unverified_otp_cannot_become_completed():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="STARTED", otp_verified=False)
    try:
        complete_booking_for_driver(db, booking.id, driver.id)
        assert False, "Expected HTTPException 400 for unverified OTP completion"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "OTP has not been verified" in exc.detail


def test_started_verified_otp_can_become_completed():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="STARTED", otp_verified=True)
    res_booking = complete_booking_for_driver(db, booking.id, driver.id)
    assert res_booking.status == "COMPLETED"
    assert res_booking.completed_at is not None


def test_non_driver_cannot_complete_booking():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="STARTED", otp_verified=True)
    try:
        complete_booking_for_driver(db, booking.id, other_driver.id)
        assert False, "Expected HTTPException 403 for non-driver completion"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "Only the driver can complete this booking" in exc.detail


def test_ride_level_completion_cannot_bypass_otp():
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_verified=False)
    try:
        complete_ride_bookings(db, ride.id, driver.id)
        assert False, "Expected HTTPException 400 for ride-level completion with ACCEPTED unverified booking"
    except HTTPException as exc:
        assert exc.status_code == 400


# ---------------------------------------------------------------------------
# FAILURE / BYPASS TESTS
# ---------------------------------------------------------------------------

def test_bypass_ride_complete_with_accepted_booking():
    """POST /rides/{ride_id}/complete with an ACCEPTED booking must fail."""
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_verified=False)
    try:
        complete_driver_ride(ride.id, db, driver)
        assert False, "Expected HTTPException 400 on ride complete with ACCEPTED booking"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "not ready to be completed" in exc.detail
    db.refresh(booking)
    assert booking.status == "ACCEPTED"


def test_bypass_ride_complete_with_unverified_started_booking():
    """POST /rides/{ride_id}/complete with an unverified STARTED booking must fail."""
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="STARTED", otp_verified=False)
    try:
        complete_driver_ride(ride.id, db, driver)
        assert False, "Expected HTTPException 400 on ride complete with unverified STARTED booking"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "OTP has not been verified" in exc.detail
    db.refresh(booking)
    assert booking.status == "STARTED"


def test_bypass_ride_start_does_not_set_booking_started():
    """POST /rides/{ride_id}/start must NOT set ACCEPTED booking to STARTED."""
    db = make_session()
    driver, passenger, other_driver, ride, booking = make_test_data(db, booking_status="ACCEPTED", otp_verified=False)
    res = start_driver_ride(ride.id, db, driver)
    assert res["success"] is True
    assert res["status"] == "started"
    db.refresh(ride)
    assert ride.status == "started"
    db.refresh(booking)
    # Booking must NOT have bypassed OTP to become STARTED
    assert booking.status == "ACCEPTED"
    assert booking.otp_verified is False

