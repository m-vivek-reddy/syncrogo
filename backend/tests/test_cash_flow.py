"""End-to-end tests for the cash payment confirmation flow (pytest)."""
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
import app.models.user  # noqa
import app.models.ride  # noqa
import app.models.booking  # noqa
import app.models.payment  # noqa
import app.models.wallet  # noqa
import app.models.cash_fee_ledger  # noqa
import app.models.vehicle  # noqa
import app.models.message  # noqa
import app.models.rating  # noqa
import app.models.notification  # noqa
import app.models.report  # noqa
import app.models.document  # noqa
import app.models.platform_setting  # noqa
import app.models.coupon  # noqa
import app.models.sos  # noqa
import app.models.emergency_contact  # noqa

from app.models.user import User
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.cash_fee_ledger import CashFeeLedger
from app.services.cash_fee_service import (
    accrue_cash_fee,
    check_driver_assignment_eligibility,
    get_daily_summary,
    settle_cash_fees,
)


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_users(db, suffix=""):
    driver = User(email=f"d{suffix}@x.com", full_name="Driver", role="driver", password="x", is_verified=True)
    passenger = User(email=f"p{suffix}@x.com", full_name="Pass", role="passenger", password="x", is_verified=True)
    db.add_all([driver, passenger])
    db.commit()
    return driver, passenger


def make_completed_cash_booking(db, driver, passenger, completed_at):
    ride = Ride(
        driver_id=driver.id, origin="A", destination="B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="published", vehicle_type="car",
        price_per_seat=120.0, final_fare=120.0, platform_fee=5.0,
    )
    db.add(ride)
    db.flush()
    booking = Booking(
        ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
        pickup_location="A", pickup_lat=1.0, pickup_lon=1.0,
        dropoff_location="B", dropoff_lat=2.0, dropoff_lon=2.0,
        fare=120.0, status="COMPLETED", otp_verified=True,
        completed_at=completed_at,
    )
    db.add(booking)
    db.commit()
    return booking


def test_cash_flow_accrues_fee_and_gates_prior_day():
    db = make_session()
    driver, passenger = make_users(db)

    # A cash ride completed YESTERDAY, never settled.
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    booking = make_completed_cash_booking(db, driver, passenger, yesterday)
    payment = Payment(
        booking_id=booking.id, provider="cash", provider_payment_id=f"cash_booking_{booking.id}",
        amount=booking.fare, status=Payment.PENDING, method=Payment.CASH, idempotency_key=f"booking_{booking.id}",
    )
    db.add(payment)
    db.commit()

    # Driver confirms cash -> PAID + fee accrued for yesterday's ledger day.
    payment.transition_to(Payment.PAID)
    booking.status = "PAID"
    fee = accrue_cash_fee(db, driver.id, booking.id, ride_day=booking.completed_at, commit=False)
    db.commit()
    assert payment.status == "PAID" and booking.status == "PAID"
    assert fee.status == "ACCRUED" and float(fee.amount) == 10.0

    # Prior-day unpaid fees -> new assignments blocked (402).
    try:
        check_driver_assignment_eligibility(db, driver.id)
        assert False, "expected 402"
    except HTTPException as e:
        assert e.status_code == 402

    # Today's accruals never block: accrue a fee dated today, still blocked by
    # yesterday's debt, but a clean-driver-with-today-fees scenario passes.
    clean_driver, _ = make_users(db, suffix="2")
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    b2 = make_completed_cash_booking(db, clean_driver, passenger, today + timedelta(hours=2))
    accrue_cash_fee(db, clean_driver.id, b2.id, ride_day=b2.completed_at, commit=True)
    check_driver_assignment_eligibility(db, clean_driver.id)  # no raise

    # Summary shows today's outstanding for the clean driver, payable at settlement.
    summary = get_daily_summary(db, clean_driver.id, datetime.now(timezone.utc))
    assert summary["cash_rides"] == 1 and float(summary["outstanding"]) == 10.0

    # Settlement clears and restores eligibility.
    result = settle_cash_fees(db, clean_driver.id)
    assert result["status"] == "PAID" and result["settled"] == 1
    check_driver_assignment_eligibility(db, clean_driver.id)  # no raise

    # The blocked driver settles too, then is eligible.
    settle_cash_fees(db, driver.id)
    check_driver_assignment_eligibility(db, driver.id)  # no raise
    print("test_cash_flow_accrues_fee_and_gates_prior_day OK")
