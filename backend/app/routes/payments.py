from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hmac
import hashlib
import os

from app.db.database import get_db
from app.models.ride import Ride
from app.services.wallet_service import credit_driver_earnings

router = APIRouter(prefix="/payments", tags=["Payments"])

# Razorpay secret key from your environment variables
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "your_secret_key")

class PaymentVerifySchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    ride_id: int
    driver_id: int

@router.post("/verify-payment")
def verify_payment(payload: PaymentVerifySchema, db: Session = Depends(get_db)):
    """Verifies Razorpay payment signature, marks ride complete, and credits driver wallet."""
    
    # 1. Verify Razorpay Signature for security
    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if generated_signature != payload.razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Verification failed."
        )

    # 2. Fetch the ride to get exact pricing details
    ride = db.query(Ride).filter(Ride.id == payload.ride_id).first()
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found."
        )

    # 3. Calculate driver earnings (Final Fare minus Platform Fee)
    driver_earnings = ride.final_fare - ride.platform_fee

    # 4. Credit the driver's wallet automatically using your wallet service
    updated_wallet = credit_driver_earnings(
        db=db,
        driver_id=payload.driver_id,
        amount=driver_earnings,
        ride_id=str(ride.id)
    )

    # 5. Update ride status to completed
    ride.status = "completed"
    db.commit()

    return {
        "status": "success",
        "message": "Payment verified successfully. Driver wallet credited.",
        "driver_new_balance": updated_wallet.balance
    }