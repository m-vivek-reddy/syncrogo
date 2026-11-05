from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

from app.utils.security import MAX_PASSWORD_BYTES


# ==========================
# REGISTER REQUEST
# ==========================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = "passenger"

    # ── Consent ──
    # Terms and Privacy are mandatory and must be explicitly true. Optional
    # consents default to False so nothing is processed until it is granted.
    accept_terms: bool = False
    accept_privacy: bool = False
    consent_cookies: bool = False
    consent_marketing_email: bool = False
    consent_location: bool = False
    consent_documents: bool = False
    consent_sms: bool = False
    consent_policy_version: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_within_bcrypt_limit(cls, password: str) -> str:
        if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(
                f"Password must be at most {MAX_PASSWORD_BYTES} UTF-8 bytes"
            )
        return password


# ==========================
# USER RESPONSE
# ==========================
class UserResponse(BaseModel):
    id: int

    name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None

    role: str

    is_verified: bool

    rating: float = 0.0
    total_reviews: int = 0

    created_at: datetime

    # Current consent state, so clients can show the right toggles without a
    # second round-trip.
    consent_terms: bool = False
    consent_privacy: bool = False
    consent_cookies: bool = False
    consent_marketing_email: bool = False
    consent_location: bool = False
    consent_documents: bool = False
    consent_sms: bool = False

    class Config:
        from_attributes = True


# ==========================
# CONSENT SCHEMAS
# ==========================
class ConsentUpdate(BaseModel):
    """Update one or more consent switches.

    ``granted=False`` is a withdrawal and is always accepted.
    """

    purposes: list[str]
    granted: bool = True
    source: Optional[str] = None
    note: Optional[str] = None
    policy_version: Optional[str] = None


# ==========================
# UPDATE PROFILE
# ==========================
class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
