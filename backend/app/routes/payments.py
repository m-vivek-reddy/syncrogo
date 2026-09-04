from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hmac
import hashlib
import os
import razorpay

from app.db.session import get_db
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.ride import Ride
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.wallet_service import credit_driver_earnings
from datetime import datetime, timezone
from decimal import Decimal

router = APIRouter(prefix="/payments", tags=["Payments"])

# Razorpay secret key from your environment variables
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret_key")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")

class PaymentVerifySchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: int
    idempotency_key: str


class PaymentOrderSchema(BaseModel):
    booking_id: int


@router.post("/create-order")
def create_payment_order(payload: PaymentOrderSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create checkout only for the passenger of an unpaid completed booking."""
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.passenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the booking passenger can create payment.")
    if booking.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Payment is available only after the ride is completed.")
    if not RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET == "your_secret_key":
        raise HTTPException(status_code=503, detail="Payment provider is not configured.")

    order = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)).order.create({
        "amount": int((Decimal(str(booking.fare)) * 100).quantize(Decimal("1"))),
        "currency": "INR",
        "receipt": f"booking_{booking.id}",
        "notes": {"booking_id": str(booking.id)},
    })
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": RAZORPAY_KEY_ID}

@router.post("/verify-payment")
def verify_payment(payload: PaymentVerifySchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Verify a passenger payment after their booked ride has completed."""

    # A retry with the same key returns the recorded payment and never credits twice.
    existing_payment = db.query(Payment).filter(Payment.idempotency_key == payload.idempotency_key).first()
    if existing_payment:
        if existing_payment.booking_id != payload.booking_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Idempotency key belongs to another booking.")
        return {
            "status": existing_payment.status,
            "message": "Payment was already processed.",
            "payment_id": existing_payment.id,
        }

    # 1. Verify Razorpay Signature for security
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, payload.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Verification failed."
        )

    # 2. Only the passenger of a completed booking may pay.
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.passenger_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the booking passenger can make payment.")
    if booking.status != "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is available only after the ride is completed.")

    # 3. Fetch the ride to get exact pricing details
    ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found."
        )

    if ride.driver_id != booking.driver_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking driver does not match the ride.")

    amount = booking.fare
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking fare must be positive before payment.")

    # 3b. Confirm with Razorpay that the order exists, belongs to this booking,
    # and was created for the exact fare (prevents replay/tampered-amount attacks).
    try:
        rzp_order = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)).order.fetch(payload.razorpay_order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order could not be verified with the provider.")
    if int(rzp_order.get("amount", -1)) != int((Decimal(str(amount)) * 100).quantize(Decimal("1"))):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid amount does not match the booking fare.")
    if str(rzp_order.get("notes", {}).get("booking_id")) != str(booking.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order does not belong to this booking.")

    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_payment_id=payload.razorpay_payment_id,
        provider_order_id=payload.razorpay_order_id,
        amount=amount,
        status="PROCESSING",
        idempotency_key=payload.idempotency_key,
    )
    db.add(payment)
    try:
        db.flush()
    except Exception:
        db.rollback()
        existing_payment = db.query(Payment).filter(
            (Payment.idempotency_key == payload.idempotency_key)
            | (Payment.provider_payment_id == payload.razorpay_payment_id)
        ).first()
        if existing_payment:
            return {"status": existing_payment.status, "message": "Payment was already processed.", "payment_id": existing_payment.id}
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate payment could not be processed.")

    # 4. Calculate driver earnings (booking fare minus the platform fee).
    driver_earnings = max(Decimal(str(amount)) - Decimal(str(ride.platform_fee)), Decimal("0.00"))

    # 5. Credit the booking's driver; do not trust a client-supplied driver id.
    # Credit without committing: payment + wallet + booking must commit atomically.
    updated_wallet = credit_driver_earnings(
        db=db,
        driver_id=booking.driver_id,
        amount=driver_earnings,
        ride_id=f"booking_{booking.id}",
        commit=False,
    )

    payment.status = "PAID"
    payment.paid_at = datetime.now(timezone.utc)
    booking.status = "PAID"
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Payment could not be finalized. Please retry.")
    db.refresh(payment)

    return {
        "status": "success",
        "message": "Payment verified successfully. Driver wallet credited.",
        "payment_id": payment.id,
        "booking_status": booking.status,
        "driver_new_balance": updated_wallet.balance,
    }
