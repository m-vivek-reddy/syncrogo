from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ==========================
# REGISTER REQUEST
# ==========================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = "passenger"


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

    class Config:
        from_attributes = True


# ==========================
# UPDATE PROFILE
# ==========================
class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
