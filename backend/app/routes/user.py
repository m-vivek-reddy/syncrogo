import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.rating import Rating
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.rating import RatingSummaryResponse
from app.utils.security import hash_password
from app.routes.auth import get_current_user

# 👈 Make sure you are importing the new send_otp_email function!
from app.utils.email import send_otp_email
from app.utils.security import verify_password 

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"]
)

# ==========================================
# 📄 SCHEMAS & UTILS
# ==========================================
# Pydantic Schema for OTP Input
class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

def generate_6_digit_otp() -> str:
    return f"{random.randint(100000, 999999)}"

# ==========================================
# 📝 REGISTER (Generates OTP)
# ==========================================
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate 6-digit OTP & 10 min expiration
    otp = generate_6_digit_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    new_user = User(
        email=user.email,
        password=hash_password(user.password),  
        full_name=user.full_name,
        phone=user.phone,     
        role=user.role,
        is_verified=False,
        otp_code=otp,
        otp_expires_at=expires_at
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send OTP email in background
    background_tasks.add_task(send_otp_email, new_user.email, new_user.full_name, otp)
    
    return new_user

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ==========================================
# 🔐 VERIFY OTP ROUTE
from datetime import datetime

@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "Email is already verified"}

    if not user.otp_code or user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Compare using the same type of datetime
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new one."
        )

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None

    db.commit()

    return {"message": "Email successfully verified!"}
# ==========================================
# 👤 GET CURRENT PROFILE
# ==========================================
def get_rating_summary_for_user(db: Session, user_id: int) -> RatingSummaryResponse:
    rating_stats = db.query(
        func.avg(Rating.score).label("average_score"),
        func.count(Rating.id).label("review_count")
    ).filter(Rating.reviewee_id == user_id).one()

    if rating_stats.review_count == 0:
        return RatingSummaryResponse(user_id=user_id, average_score=0.0, review_count=0)

    return RatingSummaryResponse(
        user_id=user_id,
        average_score=float(round(rating_stats.average_score, 2)),
        review_count=rating_stats.review_count,
    )


@router.get("/me", response_model=UserResponse)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the profile of the currently authenticated user.
    """
    rating_summary = get_rating_summary_for_user(db, current_user.id)
    current_user.rating = rating_summary.average_score
    current_user.total_reviews = rating_summary.review_count
    return current_user


@router.get("/me", response_model=UserResponse)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the profile of the currently authenticated user.
    """

    rating_summary = get_rating_summary_for_user(
        db,
        current_user.id
    )

    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
        "rating": rating_summary.average_score,
        "total_reviews": rating_summary.review_count,
        "created_at": current_user.created_at,
    }

@router.get("/{user_id}/rating", response_model=RatingSummaryResponse)
def get_user_rating_summary(user_id: int, db: Session = Depends(get_db)):
    """Returns a user's average rating and total review count."""
    rating_stats = db.query(
        func.avg(Rating.score).label("average_score"),
        func.count(Rating.id).label("review_count")
    ).filter(Rating.reviewee_id == user_id).one()

    if rating_stats.review_count == 0:
        return RatingSummaryResponse(user_id=user_id, average_score=0.0, review_count=0)

    return RatingSummaryResponse(
        user_id=user_id,
        average_score=float(round(rating_stats.average_score, 2)),
        review_count=rating_stats.review_count,
    )



@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Check old password
    if not verify_password(data.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Update password
    user.password = hash_password(data.new_password)

    db.commit()

    return {
        "message": "Password changed successfully"
    }