"""Security tests for Issue 1: Booking & Ride Completion Lifecycle (pytest)."""
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

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
from app.models.payment import Payment
from app.models.sos import SOSAlert
from app.models.document import Document
from app.models.emergency_contact import EmergencyContact
from app.models.vehicle import Vehicle
from app.models.consent import ConsentRecord
from app.models.privacy_request import PrivacyRequest, PrivacyRequestEvent
from app.models.report import Report
from app.services.account_deletion import process_account_deletion
from app.services import account_deletion as account_deletion_service
from app.services.booking_state_service import (
    complete_booking_for_driver,
    complete_ride_bookings,
)
from app.routes.ride import start_driver_ride, complete_driver_ride
from app.routes.bookings import verify_booking_otp
from app.routes.sos import get_alert, trigger_sos, SOSTriggerSchema
from app.routes.user import delete_own_account, DeleteAccountRequest
from app.routes.privacy import export_user_data
from app.routes.admin import delete_platform_user
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


def test_trigger_sos_rejects_unrelated_ride():
    db = make_session()
    driver = User(email="driver@x.com", full_name="Driver User", role="driver", password="password", is_verified=True)
    passenger = User(email="pass@x.com", full_name="Passenger User", role="passenger", password="password", is_verified=True)
    db.add_all([driver, passenger])
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="Pickup A", destination="Drop B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="started", vehicle_type="car",
        price_per_seat=100.0, final_fare=100.0,
    )
    db.add(ride)
    db.commit()

    with pytest.raises(HTTPException, match="(?i)not authorized|not associated"):
        trigger_sos(SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0), db, passenger)


def test_trigger_sos_rejects_unrelated_driver_ride():
    db = make_session()
    driver, _, other_driver, ride, _ = make_test_data(db)
    ride.status = "started"
    db.commit()

    with pytest.raises(HTTPException) as exc:
        trigger_sos(SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0), db, other_driver)

    assert exc.value.status_code == 403


def test_sos_retrieval_rejects_another_user():
    db = make_session()
    driver, passenger, other_driver, ride, _ = make_test_data(db)
    ride.status = "started"
    db.commit()
    result = trigger_sos(
        SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0),
        db,
        passenger,
    )

    with pytest.raises(HTTPException) as exc:
        get_alert(result["alert_id"], db, other_driver)

    assert exc.value.status_code == 403


def test_trigger_sos_allows_active_passenger_booking():
    db = make_session()
    driver, passenger, _, ride, _ = make_test_data(db)
    ride.status = "started"
    db.commit()

    result = trigger_sos(
        SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0),
        db,
        passenger,
    )

    assert result["success"] is True
    alert = db.query(SOSAlert).filter(SOSAlert.id == result["alert_id"]).one()
    assert alert.user_id == passenger.id
    assert alert.ride_id == ride.id


def test_trigger_sos_allows_assigned_driver_on_active_ride():
    db = make_session()
    driver, _, _, ride, _ = make_test_data(db)
    ride.status = "started"
    db.commit()

    result = trigger_sos(
        SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0),
        db,
        driver,
    )

    assert result["success"] is True


def test_trigger_sos_requires_ride_id_when_user_has_active_ride():
    db = make_session()
    driver, passenger, _, ride, _ = make_test_data(db)
    ride.status = "started"
    db.commit()

    with pytest.raises(HTTPException, match="ride_id is required") as exc:
        trigger_sos(SOSTriggerSchema(latitude=12.0, longitude=77.0), db, driver)

    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as passenger_exc:
        trigger_sos(SOSTriggerSchema(latitude=12.0, longitude=77.0), db, passenger)
    assert passenger_exc.value.status_code == 400


@pytest.mark.parametrize("ride_status", ["completed", "cancelled"])
def test_trigger_sos_rejects_inactive_ride(ride_status):
    db = make_session()
    driver, _, _, ride, _ = make_test_data(db)
    ride.status = ride_status
    db.commit()

    with pytest.raises(HTTPException, match="active ride") as exc:
        trigger_sos(
            SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0),
            db,
            driver,
        )

    assert exc.value.status_code == 400


def test_trigger_sos_rejects_unknown_ride():
    db = make_session()
    driver = User(email="driver@unknown.test", full_name="Driver", role="driver", password="password")
    db.add(driver)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        trigger_sos(SOSTriggerSchema(ride_id=987654, latitude=12.0, longitude=77.0), db, driver)

    assert exc.value.status_code == 404


def test_trigger_sos_rejects_cancelled_passenger_booking():
    db = make_session()
    _, passenger, _, ride, booking = make_test_data(db)
    ride.status = "started"
    booking.status = "CANCELLED"
    db.commit()

    with pytest.raises(HTTPException) as exc:
        trigger_sos(
            SOSTriggerSchema(ride_id=ride.id, latitude=12.0, longitude=77.0),
            db,
            passenger,
        )

    assert exc.value.status_code == 403


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(91, 0), (-91, 0), (0, 181), (0, -181), (float("nan"), 0), (0, float("inf"))],
)
def test_sos_schema_rejects_invalid_coordinates(latitude, longitude):
    with pytest.raises(ValidationError):
        SOSTriggerSchema(latitude=latitude, longitude=longitude)


def test_sos_schema_rejects_client_user_id():
    with pytest.raises(ValidationError):
        SOSTriggerSchema(latitude=12.0, longitude=77.0, user_id=123)


def test_account_deletion_blocks_active_ride():
    db = make_session()
    driver = User(email="driver@x.com", full_name="Driver User", role="driver", password="password", is_verified=True)
    db.add(driver)
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="Pickup A", destination="Drop B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="started", vehicle_type="car",
        price_per_seat=100.0, final_fare=100.0,
    )
    db.add(ride)
    db.commit()

    with pytest.raises(HTTPException, match="active ride|bookings"):
        delete_own_account(DeleteAccountRequest(email=driver.email), db, driver)


def test_account_deletion_blocks_active_booking():
    db = make_session()
    _, passenger, _, _, _ = make_test_data(db, booking_status="ACCEPTED")

    with pytest.raises(HTTPException, match="active booking") as exc:
        delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)

    assert exc.value.status_code == 409


def test_account_deletion_blocks_pending_payment():
    db = make_session()
    _, passenger, _, ride, booking = make_test_data(db, booking_status="COMPLETED")
    ride.status = "completed"
    db.add(
        Payment(
            booking_id=booking.id,
            provider="razorpay",
            provider_payment_id="pay_pending_delete",
            amount=booking.fare,
            status=Payment.PENDING,
            method=Payment.UPI,
            idempotency_key="pending_delete_key",
        )
    )
    db.commit()

    with pytest.raises(HTTPException, match="payment or dispute") as exc:
        delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)

    assert exc.value.status_code == 409


def test_account_deletion_blocks_unresolved_refund_dispute_and_report():
    db = make_session()
    _, passenger, _, ride, booking = make_test_data(db, booking_status="COMPLETED")
    ride.status = "completed"
    db.add(
        Payment(
            booking_id=booking.id,
            provider="razorpay",
            provider_payment_id="pay_disputed_delete",
            amount=booking.fare,
            status=Payment.PAID,
            refund_status="DISPUTED",
            method=Payment.UPI,
            idempotency_key="disputed_delete_key",
        )
    )
    db.commit()

    with pytest.raises(HTTPException, match="payment or dispute"):
        delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)

    payment = db.query(Payment).one()
    payment.refund_status = None
    db.add(Report(reporter_id=passenger.id, reason="safety", status="pending"))
    db.commit()
    with pytest.raises(HTTPException, match="report is unresolved") as exc:
        delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)
    assert exc.value.status_code == 409


def test_account_deletion_rejects_confirmation_for_another_user():
    db = make_session()
    _, passenger, _, _, _ = make_test_data(db)

    with pytest.raises(HTTPException) as exc:
        delete_own_account(DeleteAccountRequest(email="driver@x.com"), db, passenger)

    assert exc.value.status_code == 400
    assert passenger.full_name == "Passenger User"


def test_account_deletion_anonymizes_and_preserves_historical_financial_and_consent_records():
    db = make_session()
    driver, passenger, _, ride, booking = make_test_data(db)
    ride.status = "completed"
    booking.status = "COMPLETED"
    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_payment_id="pay_retained_history",
        amount=booking.fare,
        status=Payment.PAID,
        method=Payment.UPI,
        idempotency_key="retained_history_key",
    )
    consent = ConsentRecord(
        user_id=passenger.id,
        purpose="privacy",
        status="granted",
        granted=True,
        source="test",
    )
    document = Document(
        user_id=passenger.id,
        document_type="license",
        file_path="missing/private-license.pdf",
        status="approved",
    )
    contact = EmergencyContact(user_id=passenger.id, name="Contact", phone="+910000000000")
    vehicle = Vehicle(
        driver_id=passenger.id,
        make="Test",
        model="Car",
        license_plate="TS-DELETE-1",
        capacity=4,
        vehicle_type="car",
    )
    db.add_all([payment, consent, document, contact, vehicle])
    db.commit()
    user_id = passenger.id

    result = delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)

    db.refresh(passenger)
    assert passenger.email == f"deleted-{user_id}@privacy.local"
    assert passenger.full_name == "Deleted User"
    assert db.query(Ride).filter(Ride.id == ride.id).count() == 1
    assert db.query(Booking).filter(Booking.id == booking.id).count() == 1
    assert db.query(Payment).filter(Payment.id == payment.id).count() == 1
    assert db.query(ConsentRecord).filter(ConsentRecord.user_id == user_id).count() == 1
    assert db.query(Document).filter(Document.user_id == user_id).one().file_path == ""
    assert db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).count() == 0
    assert db.query(Vehicle).filter(Vehicle.driver_id == user_id).count() == 0
    request = db.query(PrivacyRequest).filter(PrivacyRequest.id == result["privacy_request_id"]).one()
    assert request.status == "completed"
    assert [event.to_status for event in db.query(PrivacyRequestEvent).filter_by(request_id=request.id).all()] == [
        "open",
        "reviewing",
        "processing",
        "completed",
    ]


def test_account_deletion_is_idempotent_after_completion():
    db = make_session()
    driver, passenger, _, ride, booking = make_test_data(db)
    ride.status = "completed"
    booking.status = "COMPLETED"
    db.commit()

    first = delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)
    second = process_account_deletion(db, passenger, actor_user_id=passenger.id)

    assert first["privacy_request_id"] == second["request_id"]
    assert db.query(PrivacyRequest).filter_by(user_id=passenger.id, request_type="deletion").count() == 1


def test_admin_deletion_uses_retention_service_and_preserves_paid_history():
    db = make_session()
    driver, passenger, _, ride, booking = make_test_data(db)
    admin = User(email="admin-delete@example.com", full_name="Admin", role="admin", password="password")
    db.add(admin)
    db.commit()
    ride.status = "completed"
    booking.status = "COMPLETED"
    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_payment_id="admin_delete_paid",
        amount=booking.fare,
        status=Payment.PAID,
        method=Payment.UPI,
        idempotency_key="admin_delete_paid_key",
    )
    db.add(payment)
    db.commit()

    result = delete_platform_user(passenger.id, db, admin)

    db.refresh(passenger)
    assert passenger.email == f"deleted-{passenger.id}@privacy.local"
    assert db.query(Booking).filter(Booking.id == booking.id).count() == 1
    assert db.query(Payment).filter(Payment.id == payment.id).count() == 1
    request = db.query(PrivacyRequest).filter_by(id=result["privacy_request_id"]).one()
    events = db.query(PrivacyRequestEvent).filter_by(request_id=request.id).all()
    assert request.source == "admin_action"
    assert request.status == "completed"
    assert all(event.actor_user_id == admin.id for event in events)


def test_account_deletion_removes_document_and_profile_photo_files(tmp_path, monkeypatch):
    db = make_session()
    _, passenger, _, ride, booking = make_test_data(db)
    ride.status = "completed"
    booking.status = "COMPLETED"
    documents_dir = tmp_path / "documents"
    photos_dir = tmp_path / "profile_photos"
    documents_dir.mkdir()
    photos_dir.mkdir()
    document_file = documents_dir / "license.pdf"
    photo_file = photos_dir / "profile.jpg"
    document_file.write_bytes(b"private document")
    photo_file.write_bytes(b"private photo")
    monkeypatch.setattr(account_deletion_service, "DOCUMENT_DIR", documents_dir)
    monkeypatch.setattr(account_deletion_service, "PROFILE_PHOTO_DIR", photos_dir)
    passenger.profile_photo_url = "/uploads/profile_photos/profile.jpg"
    db.add(
        Document(
            user_id=passenger.id,
            document_type="license",
            file_path=str(document_file),
            status="approved",
        )
    )
    db.commit()

    result = delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)

    assert not document_file.exists()
    assert not photo_file.exists()
    assert result["privacy_request_id"] is not None


def test_deletion_stays_processing_if_private_file_removal_fails(tmp_path, monkeypatch):
    db = make_session()
    _, passenger, _, ride, booking = make_test_data(db)
    ride.status = "completed"
    booking.status = "COMPLETED"
    documents_dir = tmp_path / "documents"
    documents_dir.mkdir()
    document_file = documents_dir / "license.pdf"
    document_file.write_bytes(b"private document")
    monkeypatch.setattr(account_deletion_service, "DOCUMENT_DIR", documents_dir)
    original_unlink = Path.unlink

    def fail_private_file(path, *args, **kwargs):
        if path == document_file:
            raise OSError("filesystem error")
        return original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", fail_private_file)
    db.add(
        Document(
            user_id=passenger.id,
            document_type="license",
            file_path=str(document_file),
            status="approved",
        )
    )
    db.commit()

    result = delete_own_account(DeleteAccountRequest(email=passenger.email), db, passenger)
    request = db.query(PrivacyRequest).filter_by(id=result["privacy_request_id"]).one()

    assert request.status == "processing"
    assert request.request_metadata["private_file_removal_failures"] == 1


def test_export_user_data_uses_booking_relationship_for_payments():
    db = make_session()
    driver = User(email="driver2@x.com", full_name="Driver", role="driver", password="password", is_verified=True)
    passenger = User(email="pass2@x.com", full_name="Passenger", role="passenger", password="password", is_verified=True)
    db.add_all([driver, passenger])
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="Pickup A", destination="Drop B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="completed", vehicle_type="car",
        price_per_seat=100.0, final_fare=100.0,
    )
    db.add(ride)
    db.commit()

    booking = Booking(
        ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
        pickup_location="Pickup A", pickup_lat=1.0, pickup_lon=1.0,
        dropoff_location="Drop B", dropoff_lat=2.0, dropoff_lon=2.0,
        fare=100.0, status="COMPLETED", otp_code="123456",
        otp_verified=True,
    )
    db.add(booking)
    db.commit()

    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_payment_id="pay_export_123",
        amount=100.0,
        status="PAID",
        method="UPI",
        idempotency_key="idemp_export_123",
    )
    db.add(payment)
    db.commit()

    result = export_user_data(db=db, current_user=passenger)
    assert result["success"] is True
    assert result["export"]["payments"][0]["status"] == "PAID"

