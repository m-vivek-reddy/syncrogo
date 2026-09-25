"""Tests for Issue 2-A: Payment Capture & Signature/Order Verification (pytest)."""
import os
import sys
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app.db.base import Base
import app.models.user  # noqa
import app.models.ride  # noqa
import app.models.booking  # noqa
import app.models.payment  # noqa
import app.models.wallet  # noqa

from app.models.user import User
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.wallet import Wallet
from app.routes.payments import verify_payment, PaymentVerifySchema, RAZORPAY_KEY_SECRET


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_test_data(db, fare=100.0, booking_status="COMPLETED"):
    driver = User(email="driver@x.com", full_name="Driver User", role="driver", password="password", is_verified=True)
    passenger = User(email="pass@x.com", full_name="Passenger User", role="passenger", password="password", is_verified=True)
    db.add_all([driver, passenger])
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="Pickup A", destination="Drop B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=3, status="completed", vehicle_type="car",
        price_per_seat=fare, final_fare=fare, platform_fee=10.0,
    )
    db.add(ride)
    db.commit()

    booking = Booking(
        ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
        pickup_location="Pickup A", pickup_lat=1.0, pickup_lon=1.0,
        dropoff_location="Drop B", dropoff_lat=2.0, dropoff_lon=2.0,
        fare=fare, status=booking_status, otp_code="123456",
        otp_verified=True,
    )
    db.add(booking)
    db.commit()

    return driver, passenger, ride, booking


def generate_valid_signature(order_id: str, payment_id: str, secret: str = RAZORPAY_KEY_SECRET) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def test_verify_payment_captured_success():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_success_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        res = verify_payment(payload, db, passenger)

    assert res["status"] == "success"
    assert booking.status == "PAID"

    saved_payment = db.query(Payment).filter(Payment.idempotency_key == "idemp_success_1").first()
    assert saved_payment is not None
    assert saved_payment.status == Payment.PAID

    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert driver_wallet is not None
    # 100.0 fare - 10.0 platform_fee = 90.0
    assert driver_wallet.balance == 90.0


def test_verify_payment_rejected_if_not_captured():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_uncaptured_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "authorized",  # NOT captured!
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Should fail when status is authorized, not captured"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "not captured" in exc.detail

    assert booking.status == "COMPLETED"
    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert driver_wallet is None or driver_wallet.balance == 0.0


def test_verify_payment_rejected_if_order_id_mismatch():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_mismatch_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": "order_DIFFERENT_999",  # Mismatched order_id!
        "amount": 10000,
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Should fail when payment's order_id does not match payload's order_id"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "does not match the specified order" in exc.detail

    assert booking.status == "COMPLETED"


def test_verify_payment_rejected_if_amount_mismatch():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_amount_mismatch_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 5000,  # 50 rs instead of 100 rs!
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Should fail when payment amount does not match booking fare"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "does not match" in exc.detail

    assert booking.status == "COMPLETED"


def test_verify_payment_idempotency_success():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_retry_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        res1 = verify_payment(payload, db, passenger)
        res2 = verify_payment(payload, db, passenger)

    assert res1["status"] == "success"
    assert res2["status"] == "PAID"
    assert "already processed" in res2["message"]

    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    # Credit happens ONCE only
    assert driver_wallet.balance == 90.0


def test_verify_payment_rejected_if_failed_status():
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_123"
    payment_id = "pay_test_123"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_failed_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "failed",  # FAILED status
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Should fail when payment status is failed"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "not captured" in exc.detail

    assert booking.status == "COMPLETED"
    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert driver_wallet is None or driver_wallet.balance == 0.0


def test_verify_payment_rejected_if_payment_id_reused_for_different_booking():
    """Attempting to reuse a payment_id/order_id from Booking A to pay for Booking B must fail."""
    db = make_session()
    driver, passenger, ride, booking_a = make_test_data(db, fare=100.0)

    # Create Booking B for same passenger
    booking_b = Booking(
        ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
        pickup_location="Pickup A", pickup_lat=1.0, pickup_lon=1.0,
        dropoff_location="Drop B", dropoff_lat=2.0, dropoff_lon=2.0,
        fare=100.0, status="COMPLETED", otp_code="654321",
        otp_verified=True,
    )
    db.add(booking_b)
    db.commit()

    order_id_a = "order_for_booking_a"
    payment_id_a = "pay_for_booking_a"
    signature = generate_valid_signature(order_id_a, payment_id_a)

    # Attacker tries to submit Booking A's payment details for Booking B
    payload = PaymentVerifySchema(
        razorpay_order_id=order_id_a,
        razorpay_payment_id=payment_id_a,
        razorpay_signature=signature,
        booking_id=booking_b.id,
        idempotency_key="idemp_reuse_attempt",
    )

    mock_client = MagicMock()
    # Razorpay order for order_id_a notes booking_id = booking_a.id
    mock_client.order.fetch.return_value = {
        "id": order_id_a,
        "amount": 10000,
        "notes": {"booking_id": str(booking_a.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id_a,
        "order_id": order_id_a,
        "amount": 10000,
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Should fail when order notes do not match booking_b"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "Order does not belong to this booking" in exc.detail

    assert booking_b.status == "COMPLETED"


# ---------------------------------------------------------------------------
# ISSUE 2-B: CONCURRENCY & RACE CONDITION TESTS
# ---------------------------------------------------------------------------

from app.routes.payments import confirm_cash_received
from app.services.wallet_service import credit_driver_earnings, request_withdrawal
from app.services.cash_fee_service import accrue_cash_fee
from app.models.cash_fee_ledger import CashFeeLedger


def test_online_payment_succeeds_then_cash_confirmation_fails():
    """Online payment succeeds -> cash confirmation cannot also succeed."""
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    order_id = "order_test_race_1"
    payment_id = "pay_test_race_1"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_race_online_1",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "captured",
    }

    # Step 1: Online payment succeeds
    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        res = verify_payment(payload, db, passenger)
    assert res["status"] == "success"
    assert booking.status == "PAID"

    # Step 2: Driver attempts cash confirmation for the same booking
    try:
        confirm_cash_received(booking.id, db, driver)
        assert False, "Cash confirmation must fail when online payment is already settled"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "already settled" in exc.detail

    # Invariants verification
    assert db.query(Payment).filter(Payment.booking_id == booking.id).count() == 1
    assert db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking.id).count() == 0
    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert driver_wallet.balance == 90.0  # Credited once for online, NOT double-handled


def test_cash_confirmation_succeeds_then_online_payment_fails():
    """Cash confirmation succeeds -> online payment cannot also succeed."""
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    # Step 1: Cash confirmation succeeds
    res_cash = confirm_cash_received(booking.id, db, driver)
    assert res_cash["success"] is True
    assert booking.status == "PAID"

    # Step 2: Passenger attempts online payment for the same booking
    order_id = "order_test_race_2"
    payment_id = "pay_test_race_2"
    signature = generate_valid_signature(order_id, payment_id)

    payload = PaymentVerifySchema(
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        booking_id=booking.id,
        idempotency_key="idemp_race_online_2",
    )

    mock_client = MagicMock()
    mock_client.order.fetch.return_value = {
        "id": order_id,
        "amount": 10000,
        "notes": {"booking_id": str(booking.id)},
    }
    mock_client.payment.fetch.return_value = {
        "id": payment_id,
        "order_id": order_id,
        "amount": 10000,
        "status": "captured",
    }

    with patch("app.routes.payments.razorpay.Client", return_value=mock_client):
        try:
            verify_payment(payload, db, passenger)
            assert False, "Online payment must fail when cash payment is already settled"
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "already settled" in exc.detail

    # Invariants verification
    assert db.query(Payment).filter(Payment.booking_id == booking.id).count() == 1
    assert db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking.id).count() == 1
    driver_wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert driver_wallet is None or driver_wallet.balance == 0.0  # Cash rides do not credit online wallet


def test_repeated_cash_confirmation_no_duplicate_payment_or_fee():
    """Repeated cash confirmation does not create duplicate Payment or CashFeeLedger records."""
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    res1 = confirm_cash_received(booking.id, db, driver)
    assert res1["success"] is True

    res2 = confirm_cash_received(booking.id, db, driver)
    assert res2["success"] is True
    assert "already confirmed" in res2["message"]

    assert db.query(Payment).filter(Payment.booking_id == booking.id).count() == 1
    assert db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking.id).count() == 1


def test_wallet_concurrency_credit_sum():
    """Sequential/locked wallet credits sum correctly without lost updates."""
    db = make_session()
    driver = User(email="driver_w1@x.com", full_name="Driver W1", role="driver", password="password")
    db.add(driver)
    db.commit()

    credit_driver_earnings(db, driver.id, 50.0, "ride_101")
    credit_driver_earnings(db, driver.id, 75.0, "ride_102")

    wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert wallet.balance == 125.0


def test_wallet_concurrency_withdrawal_and_credit():
    """Wallet withdrawal + credit maintains accurate balances."""
    db = make_session()
    driver = User(email="driver_w2@x.com", full_name="Driver W2", role="driver", password="password")
    db.add(driver)
    db.commit()

    credit_driver_earnings(db, driver.id, 100.0, "ride_201")
    request_withdrawal(db, driver.id, 40.0)
    credit_driver_earnings(db, driver.id, 50.0, "ride_202")

    wallet = db.query(Wallet).filter(Wallet.user_id == driver.id).first()
    assert wallet.balance == 110.0
    assert wallet.pending_balance == 40.0


def test_cash_fee_accrual_idempotency_no_500():
    """Concurrent/repeated cash fee accrual returns existing ledger row without HTTP 500 or IntegrityError."""
    db = make_session()
    driver, passenger, ride, booking = make_test_data(db, fare=100.0)

    now = datetime.now(timezone.utc)
    fee1 = accrue_cash_fee(db, driver.id, booking.id, now)
    fee2 = accrue_cash_fee(db, driver.id, booking.id, now)

    assert fee1.id == fee2.id
    assert db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking.id).count() == 1


# ---------------------------------------------------------------------------
# TRUE MULTI-THREADED CONCURRENCY TESTS (Separate Sessions & DB Transactions)
# ---------------------------------------------------------------------------

import threading
import tempfile
from app.services.wallet_service import get_or_create_wallet


def make_file_session_factory():
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_concurrency.db")
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False, "timeout": 15})
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    return session_factory, db_path


def test_true_concurrent_wallet_credits():
    """True multi-threaded concurrent wallet credits using separate DB sessions."""
    session_factory, db_path = make_file_session_factory()

    db_setup = session_factory()
    driver = User(email="driver_concurrent@x.com", full_name="Driver Concurrent", role="driver", password="password")
    db_setup.add(driver)
    db_setup.commit()
    driver_id = driver.id
    db_setup.close()

    def credit_task(amount, ride_ref):
        db_thread = session_factory()
        try:
            credit_driver_earnings(db_thread, driver_id, amount, ride_ref, commit=True)
        finally:
            db_thread.close()

    t1 = threading.Thread(target=credit_task, args=(50.0, "ride_t1"))
    t2 = threading.Thread(target=credit_task, args=(75.0, "ride_t2"))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    db_check = session_factory()
    wallet = db_check.query(Wallet).filter(Wallet.user_id == driver_id).first()
    assert wallet is not None
    assert wallet.balance == 125.0
    db_check.close()

    try:
        os.remove(db_path)
    except Exception:
        pass


def test_true_concurrent_wallet_creation():
    """Two threads simultaneously attempting to create a wallet for the same driver."""
    session_factory, db_path = make_file_session_factory()

    db_setup = session_factory()
    driver = User(email="driver_create@x.com", full_name="Driver Create", role="driver", password="password")
    db_setup.add(driver)
    db_setup.commit()
    driver_id = driver.id
    db_setup.close()

    results = []
    def create_task():
        db_thread = session_factory()
        try:
            w = get_or_create_wallet(db_thread, driver_id, commit=True, lock=True)
            results.append(w.id)
        finally:
            db_thread.close()

    t1 = threading.Thread(target=create_task)
    t2 = threading.Thread(target=create_task)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(results) == 2
    assert results[0] == results[1]  # Both threads retrieved/created the exact same wallet ID

    db_check = session_factory()
    wallets = db_check.query(Wallet).filter(Wallet.user_id == driver_id).all()
    assert len(wallets) == 1
    db_check.close()

    try:
        os.remove(db_path)
    except Exception:
        pass



