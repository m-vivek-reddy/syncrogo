from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IdentityDocumentBase(BaseModel):
    document_type: str  # "aadhaar", "driving_license", "pan", "passport", "voter_id"

class IdentityDocumentCreate(IdentityDocumentBase):
    document_url: str

class IdentityDocumentResponse(IdentityDocumentBase):
    id: int
    user_id: int
    document_url: Optional[str] = None
    status: str  # "not_uploaded", "under_review", "verified", "rejected"
    reject_reason: Optional[str] = None
    uploaded_at: datetime
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class VerificationStatusResponse(BaseModel):
    identity_verified: bool
    verification_progress: int  # e.g., 80%
    documents: List[IdentityDocumentResponse]