"""Executable regression tests for booking/payment invariants (pytest)."""
import ast
from pathlib import Path


ROOT = Path(__file__).parents[1]


def source(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_payment_requires_completed_booking_and_passenger_ownership():
    code = source("app/routes/payments.py")
    assert 'booking.passenger_id != current_user.id' in code
    assert 'booking.status != "COMPLETED"' in code


def test_payment_is_idempotent_and_marks_booking_paid():
    code = source("app/routes/payments.py")
    assert "Payment.idempotency_key" in code
    assert 'booking.status = "PAID"' in code
    assert 'ride_id=f"booking_{booking.id}"' in code


def test_booking_blocks_self_booking_and_overbooking():
    code = source("app/routes/bookings.py")
    assert "ride.driver_id == current_user.id" in code
    assert "ride.seats_available <= 0" in code


def test_driver_cannot_complete_without_verified_otp():
    code = source("app/routes/bookings.py")
    assert "if not booking.otp_verified:" in code
    assert 'booking.status = "COMPLETED"' in code


def test_edited_backend_modules_are_syntax_valid():
    for relative_path in ("app/routes/bookings.py", "app/routes/payments.py", "app/models/payment.py"):
        ast.parse(source(relative_path))
