import os
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    status,
    BackgroundTasks,
    UploadFile,
)
from pydantic import BaseModel, EmailStr
from jose import jwt
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.models.user import User
from app.models.rating import Rating

from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
)

from app.schemas.rating import RatingSummaryResponse

from app.utils.security import (
    hash_password,
    verify_password,
)

from app.utils.email import send_otp_email
from app.utils.password_reset_email import send_password_reset_email

# FIX: create_access_token was missing from this import
from app.auth.jwt import (
    create_access_token,
    create_password_reset_token,
    get_reset_token_email,
)

from app.routes.auth import get_current_user


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


# =========================================================
# SCHEMAS
# =========================================================

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


class DeleteAccountRequest(BaseModel):
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# =========================================================
# PROFILE PHOTO CONFIG
# =========================================================

UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"

PROFILE_PHOTO_DIR = UPLOAD_ROOT / "profile_photos"

PROFILE_PHOTO_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024

ALLOWED_PROFILE_PHOTO_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# =========================================================
# OTP GENERATOR
# =========================================================

def generate_6_digit_otp() -> str:
    """
    Generate a random 6-digit OTP.
    """
    return f"{random.randint(100000, 999999)}"


# =========================================================
# PASSWORD VALIDATION
# =========================================================

def validate_new_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )


# =========================================================
# USER RESPONSE HELPER
# =========================================================

def build_user_response(
    db: Session,
    user: User,
) -> dict:
    rating_summary = get_rating_summary_for_user(
        db,
        user.id,
    )

    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "profile_photo_url": user.profile_photo_url,
        "role": user.role,
        "is_verified": user.is_verified,
        "rating": rating_summary.average_score,
        "total_reviews": rating_summary.review_count,
        "created_at": user.created_at,
    }


# =========================================================
# PROFILE PHOTO HELPER
# =========================================================

def remove_existing_profile_photo(
    photo_url: str | None,
) -> None:

    if not photo_url:
        return

    if not photo_url.startswith(
        "/uploads/profile_photos/"
    ):
        return

    filename = Path(photo_url).name

    photo_path = (
        PROFILE_PHOTO_DIR / filename
    ).resolve()

    if (
        PROFILE_PHOTO_DIR.resolve() in photo_path.parents
        and photo_path.exists()
    ):
        photo_path.unlink()


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
)
def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Queue a reset email without revealing
    whether the address is registered.
    """

    user = (
        db.query(User)
        .filter(func.lower(User.email) == str(data.email).lower())
        .first()
    )

    if user:

        token = create_password_reset_token(
            user.email,
            user.password,
        )

        frontend_url = os.getenv(
            "FRONTEND_URL",
            "http://localhost:5173",
        ).rstrip("/")

        reset_url = (
            f"{frontend_url}/reset-password?"
            f"{urlencode({'token': token})}"
        )

        background_tasks.add_task(
            send_password_reset_email,
            user.email,
            user.full_name,
            reset_url,
        )

    return {
        "message": (
            "If an account exists with this email, "
            "a reset link has been sent."
        )
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    validate_new_password(
        data.new_password
    )

    try:
        email = jwt.get_unverified_claims(
            data.token
        ).get("sub")
    except Exception:
        email = None

    user = (
        db.query(User)
        .filter(func.lower(User.email) == email.lower())
        .first()
        if email
        else None
    )

    if (
        not user
        or get_reset_token_email(
            data.token,
            user.password,
        ) != user.email
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This password reset link is "
                "invalid or has expired"
            ),
        )

    if verify_password(
        data.new_password,
        user.password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from the current password"
            ),
        )

    user.password = hash_password(
        data.new_password
    )

    db.commit()

    return {
        "message": (
            "Password reset successfully. "
            "You can now log in."
        )
    }


# =========================================================
# REGISTER USER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Register a new user and send email OTP.
    """

    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    otp = generate_6_digit_otp()

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    new_user = User(
        email=user.email,
        password=hash_password(user.password),
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_verified=False,
        otp_code=otp,
        otp_expires_at=expires_at,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    background_tasks.add_task(
        send_otp_email,
        new_user.email,
        new_user.full_name,
        otp,
    )

    return new_user


# =========================================================
# VERIFY OTP
# =========================================================

@router.post("/verify-otp")
@router.post("/verify-login-otp")
def verify_otp(
    data: OTPVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verify user's email OTP.
    """

    email_clean = (
        data.email.strip().lower()
    )

    user = (
        db.query(User)
        .filter(
            func.lower(User.email)
            == email_clean
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # -----------------------------------------------------
    # Already verified
    # -----------------------------------------------------

    if user.is_verified and not user.otp_code:

        access_token = create_access_token(
            data={
                "sub": user.email,
                "role": user.role,
            }
        )

        return {
            "message": "Email is already verified",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.full_name,
                "email": user.email,
                "role": user.role,
                "profile_photo_url": user.profile_photo_url,
            },
        }

    # -----------------------------------------------------
    # OTP missing
    # -----------------------------------------------------

    if not user.otp_code:

        if user.is_verified:

            access_token = create_access_token(
                data={
                    "sub": user.email,
                    "role": user.role,
                }
            )

            return {
                "message": "Email is already verified",
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "profile_photo_url": user.profile_photo_url,
                },
            }

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No OTP available. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # OTP validation
    # -----------------------------------------------------

    if user.otp_code.strip() != data.otp.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code",
        )

    # -----------------------------------------------------
    # OTP expiration
    # -----------------------------------------------------

    if user.otp_expires_at:

        expires_at = user.otp_expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        if (
            datetime.now(timezone.utc)
            > expires_at
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "OTP has expired. "
                    "Please request a new one."
                ),
            )

    # -----------------------------------------------------
    # Verify user
    # -----------------------------------------------------

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None

    db.commit()
    db.refresh(user)

    # -----------------------------------------------------
    # Generate access token
    # -----------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
        }
    )

    return {
        "message": "Email successfully verified!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "profile_photo_url": user.profile_photo_url,
        },
    }


# =========================================================
# VERIFY EMAIL TOKEN
# =========================================================

@router.get("/verify-email")
def verify_email_token(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Verify user's email via link token.
    """

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is required",
        )

    try:

        from app.auth.jwt import (
            SECRET_KEY,
            ALGORITHM,
        )

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        email = payload.get("sub")

    except Exception:
        email = None

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid or expired "
                "verification link"
            ),
        )

    user = (
        db.query(User)
        .filter(
            func.lower(User.email)
            == email.lower()
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None

    db.commit()

    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
        }
    )

    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "profile_photo_url": user.profile_photo_url,
        },
    }


# =========================================================
# RESEND OTP
# =========================================================

@router.post("/resend-otp")
@router.post("/send-otp")
def resend_otp(
    data: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Generate and email a fresh 6-digit OTP.
    """

    email_clean = (
        data.email.strip().lower()
    )

    user = (
        db.query(User)
        .filter(
            func.lower(User.email)
            == email_clean
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    otp = generate_6_digit_otp()

    user.otp_code = otp
    user.otp_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    db.commit()

    background_tasks.add_task(
        send_otp_email,
        user.email,
        user.full_name,
        otp,
    )

    return {
        "message": (
            "A new OTP code has been "
            "sent to your email."
        )
    }


# =========================================================
# RATING SUMMARY HELPER
# =========================================================

def get_rating_summary_for_user(
    db: Session,
    user_id: int,
) -> RatingSummaryResponse:

    rating_stats = (
        db.query(
            func.avg(
                Rating.score
            ).label("average_score"),
            func.count(
                Rating.id
            ).label("review_count"),
        )
        .filter(
            Rating.reviewee_id == user_id
        )
        .one()
    )

    if rating_stats.review_count == 0:

        return RatingSummaryResponse(
            user_id=user_id,
            average_score=0.0,
            review_count=0,
        )

    return RatingSummaryResponse(
        user_id=user_id,
        average_score=float(
            round(
                rating_stats.average_score,
                2,
            )
        ),
        review_count=rating_stats.review_count,
    )


# =========================================================
# GET CURRENT USER PROFILE
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Returns the currently authenticated user's profile.
    """

    return build_user_response(
        db,
        current_user,
    )


# =========================================================
# UPDATE CURRENT USER PROFILE
# =========================================================

@router.put(
    "/me",
    response_model=UserResponse,
)
def update_user_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Updates the currently authenticated
    user's editable profile fields.
    """

    if data.name is not None:
        current_user.full_name = data.name

    if data.phone is not None:
        current_user.phone = data.phone

    db.commit()
    db.refresh(current_user)

    return build_user_response(
        db,
        current_user,
    )


# =========================================================
# UPLOAD PROFILE PHOTO
# =========================================================

@router.post(
    "/me/profile-photo",
    response_model=UserResponse,
)
async def upload_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Uploads or replaces the currently
    authenticated user's profile photo.
    """

    extension = ALLOWED_PROFILE_PHOTO_TYPES.get(
        file.content_type or ""
    )

    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Profile photo must be a JPG, "
                "PNG, or WEBP image."
            ),
        )

    contents = await file.read(
        MAX_PROFILE_PHOTO_BYTES + 1
    )

    if len(contents) > MAX_PROFILE_PHOTO_BYTES:
        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "Profile photo must be "
                "5 MB or smaller."
            ),
        )

    filename = (
        f"user_{current_user.id}_"
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        PROFILE_PHOTO_DIR / filename
    )

    file_path.write_bytes(contents)

    remove_existing_profile_photo(
        current_user.profile_photo_url
    )

    current_user.profile_photo_url = (
        f"/uploads/profile_photos/{filename}"
    )

    db.commit()
    db.refresh(current_user)

    response = build_user_response(
        db,
        current_user,
    )

    response["profile_photo_url"] = str(
        request.base_url.replace(
            path=current_user.profile_photo_url
        )
    )

    return response


# =========================================================
# GET USER RATING
# =========================================================

@router.get(
    "/{user_id}/rating",
    response_model=RatingSummaryResponse,
)
def get_user_rating_summary(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns a user's average rating
    and review count.
    """

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return get_rating_summary_for_user(
        db,
        user_id,
    )


# =========================================================
# CHANGE PASSWORD
# =========================================================

@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Change the currently authenticated
    user's password.
    """

    validate_new_password(
        data.new_password
    )

    user = (
        db.query(User)
        .filter(
            User.id == current_user.id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_password(
        data.current_password,
        user.password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if verify_password(
        data.new_password,
        user.password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from current password"
            ),
        )

    user.password = hash_password(
        data.new_password
    )

    db.commit()

    return {
        "message": (
            "Password changed successfully"
        )
    }


# =========================================================
# DELETE OWN ACCOUNT
# =========================================================

@router.post("/delete-account")
@router.delete("/me")
def delete_own_account(
    data: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Allows a logged-in user to permanently
    delete their own account after confirming
    their email address.
    """

    if (
        data.email.strip().lower()
        != current_user.email.strip().lower()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The email address you entered "
                "does not match your account "
                "email address."
            ),
        )

    target_user_id = current_user.id

    dependent_deletes = [
        ("documents", "user_id"),
        ("payment_methods", "user_id"),
        ("payments", "user_id"),
        ("notifications", "user_id"),
        ("emergency_contacts", "user_id"),
        ("sos_alerts", "user_id"),
        ("vehicles", "driver_id"),
        ("wallets", "user_id"),
        ("messages", "sender_id"),
        ("messages", "receiver_id"),
        ("ratings", "reviewer_id"),
        ("ratings", "reviewee_id"),
        ("reports", "reporter_id"),
    ]

    for table, column in dependent_deletes:

        try:

            db.execute(
                text(
                    f"DELETE FROM {table} "
                    f"WHERE {column} = :user_id"
                ),
                {
                    "user_id": target_user_id
                },
            )

        except Exception:
            pass

    try:

        db.execute(
            text(
                "DELETE FROM transactions "
                "WHERE wallet_id IN "
                "(SELECT id FROM wallets "
                "WHERE user_id = :user_id)"
            ),
            {
                "user_id": target_user_id
            },
        )

    except Exception:
        pass

    try:

        db.execute(
            text(
                "UPDATE reports "
                "SET reported_user_id = NULL "
                "WHERE reported_user_id = :user_id"
            ),
            {
                "user_id": target_user_id
            },
        )

    except Exception:
        pass

    try:

        db.execute(
            text(
                "DELETE FROM bookings "
                "WHERE passenger_id = :user_id "
                "OR driver_id = :user_id"
            ),
            {
                "user_id": target_user_id
            },
        )

    except Exception:
        pass

    try:

        db.execute(
            text(
                "DELETE FROM rides "
                "WHERE driver_id = :user_id"
            ),
            {
                "user_id": target_user_id
            },
        )

    except Exception:
        pass

    db.delete(current_user)

    db.commit()

    return {
        "message": (
            "Your account has been "
            "deleted successfully."
        )
    }