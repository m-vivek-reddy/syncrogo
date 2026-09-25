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
from app.services.cash_fee_service import accrue_cash_fee
from app.models.cash_fee_ledger import ACCRUED
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


class PaymentMethodChoiceSchema(BaseModel):
    method: str  # "UPI" | "CASH"


@router.post("/{booking_id}/method")
def choose_payment_method(payload: PaymentMethodChoiceSchema, booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Passenger declares how they'll pay after drop-off. Driver then sees
    'Cash payment: ₹X' and confirms receipt, or the passenger pays via gateway."""
    if payload.method not in (Payment.UPI, Payment.CASH):
        raise HTTPException(status_code=400, detail="method must be 'UPI' or 'CASH'.")
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.passenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the booking passenger can choose the payment method.")
    if booking.status == "PAID":
        raise HTTPException(status_code=400, detail="Payment is already settled.")
    if booking.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Payment method can be chosen only after the ride is completed.")
    existing = db.query(Payment).filter(Payment.booking_id == booking.id).with_for_update().first()
    if existing and existing.status == Payment.PAID:
        raise HTTPException(status_code=400, detail="Payment is already settled.")
    if existing:
        existing.method = payload.method
    else:
        # Ledger rows require unique provider_payment_id; cash uses a deterministic id.
        existing = Payment(
            booking_id=booking.id,
            provider="cash",
            provider_payment_id=f"cash_booking_{booking.id}",
            amount=booking.fare,
            status=Payment.PENDING,
            method=payload.method,
            idempotency_key=f"booking_{booking.id}",
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return {
        "success": True,
        "booking_id": booking.id,
        "method": existing.method,
        "amount": float(booking.fare),
        "message": (
            f"Cash payment: ₹{float(booking.fare):.0f} — hand the amount to the driver."
            if payload.method == Payment.CASH
            else "Complete the UPI payment to confirm your booking."
        ),
    }


@router.post("/{booking_id}/confirm-cash")
def confirm_cash_received(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Driver confirms they received cash from the passenger.

    Flow (WORKFLOW.md §6): Payment -> PAID, booking -> PAID, and the platform's
    cash-ride fee accrues to the driver's daily ledger. This endpoint ONLY
    accrues the fee; assignment gating stays in create_booking (prior-day rule).
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the ride driver can confirm cash payment.")

    payment = db.query(Payment).filter(Payment.booking_id == booking.id).with_for_update().first()
    if payment and payment.status == Payment.PAID:
        if payment.method == Payment.CASH:
            # Idempotent: driver double-taps 'Confirm Cash Received'.
            return {"success": True, "message": "Cash payment was already confirmed.", "payment_id": payment.id, "booking_status": booking.status}
        else:
            raise HTTPException(status_code=400, detail="Payment is already settled via online payment.")
    if booking.status == "PAID":
        raise HTTPException(status_code=400, detail="Payment is already settled.")
    if booking.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Cash can be confirmed only after the ride is completed.")

    if not payment:
        payment = Payment(
            booking_id=booking.id,
            provider="cash",
            provider_payment_id=f"cash_booking_{booking.id}",
            amount=booking.fare,
            status=Payment.PENDING,
            method=Payment.CASH,
            idempotency_key=f"booking_{booking.id}",
        )
        db.add(payment)
        db.flush()
    elif payment.method != Payment.CASH:
        raise HTTPException(status_code=400, detail="This booking was not marked as a cash payment.")

    if Decimal(str(booking.fare)) <= 0:
        raise HTTPException(status_code=400, detail="Booking fare must be positive before confirming cash.")

    # Driver receives the full fare in cash; no wallet credit for cash rides.
    payment.transition_to(Payment.PAID)
    booking.status = "PAID"

    ride_day = booking.completed_at or datetime.now(timezone.utc)
    if ride_day.tzinfo is None:
        ride_day = ride_day.replace(tzinfo=timezone.utc)
    fee_row = accrue_cash_fee(db, driver_id=booking.driver_id, booking_id=booking.id, ride_day=ride_day, commit=False)

    # Payment + booking transition + ledger accrual must commit atomically.
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Cash confirmation could not be finalized. Please retry.")
    db.refresh(payment)
    db.refresh(fee_row)

    return {
        "success": True,
        "message": "Cash received. Ride payment settled.",
        "payment_id": payment.id,
        "booking_status": booking.status,
        "cash_fee": {
            "ledger_id": fee_row.id,
            "amount": float(fee_row.amount),
            "status": fee_row.status,
            "ride_date": fee_row.ride_date.date().isoformat(),
            "note": "Added to today's outstanding. Prior-day unpaid fees pause new assignments at booking time.",
        },
    }


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

    # 2. Only the passenger of a completed booking may pay. Acquire lock on Booking.
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).with_for_update().first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.passenger_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the booking passenger can make payment.")

    # Re-check under row lock:
    if booking.status == "PAID":
        existing_p = db.query(Payment).filter(
            (Payment.idempotency_key == payload.idempotency_key)
            | (Payment.provider_payment_id == payload.razorpay_payment_id)
        ).first()
        if existing_p:
            return {
                "status": existing_p.status,
                "message": "Payment was already processed.",
                "payment_id": existing_p.id,
            }
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is already settled for this booking.")

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
    # payment was captured, and amounts/order IDs match (prevents replay/tampered-amount/status bypass attacks).
    try:
        rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        rzp_order = rzp_client.order.fetch(payload.razorpay_order_id)
        rzp_payment = rzp_client.payment.fetch(payload.razorpay_payment_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment order or payment details could not be verified with the provider.")

    if int(rzp_order.get("amount", -1)) != int((Decimal(str(amount)) * 100).quantize(Decimal("1"))):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid amount does not match the booking fare.")
    if str(rzp_order.get("notes", {}).get("booking_id")) != str(booking.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order does not belong to this booking.")

    if rzp_payment.get("status") != "captured":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is not captured with the provider.")
    if str(rzp_payment.get("order_id")) != str(payload.razorpay_order_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment does not match the specified order.")
    if int(rzp_payment.get("amount", -1)) != int((Decimal(str(amount)) * 100).quantize(Decimal("1"))):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount does not match the booking fare.")

    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_payment_id=payload.razorpay_payment_id,
        provider_order_id=payload.razorpay_order_id,
        amount=amount,
        status=Payment.PROCESSING,
        method=Payment.UPI,
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
    driver_earnings = float(max(Decimal(str(amount)) - Decimal(str(ride.platform_fee)), Decimal("0.00")))

    # 5. Credit the booking's driver; do not trust a client-supplied driver id.
    # Credit without committing: payment + wallet + booking must commit atomically.
    updated_wallet = credit_driver_earnings(
        db=db,
        driver_id=booking.driver_id,
        amount=driver_earnings,
        ride_id=f"booking_{booking.id}",
        commit=False,
    )

    payment.transition_to(Payment.PAID)
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
