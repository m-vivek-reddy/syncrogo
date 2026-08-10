from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.models.user import User, IdentityDocument
from app.schemas.identity import (
    IdentityDocumentCreate,
    IdentityDocumentResponse,
    VerificationStatusResponse,
)
from app.api.deps import get_current_user  # Your auth dependency

router = APIRouter(prefix="/identity", tags=["Identity & Documents"])

@router.get("/status", response_model=VerificationStatusResponse)
def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculates verification progress percentage and returns all user documents."""
    docs = db.query(IdentityDocument).filter(IdentityDocument.user_id == current_user.id).all()
    
    # Logic to calculate completion percentage
    required_docs = {"aadhaar", "driving_license"}
    verified_docs = {doc.document_type for doc in docs if doc.status == "verified"}
    
    total_steps = len(required_docs)
    completed_steps = len(verified_docs.intersection(required_docs))
    
    progress = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0

    return {
        "identity_verified": current_user.identity_verified,
        "verification_progress": progress,
        "documents": docs
    }

@router.post("/upload", response_model=IdentityDocumentResponse)
def upload_identity_document(
    doc_data: IdentityDocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or update an identity document record."""
    existing_doc = db.query(IdentityDocument).filter(
        IdentityDocument.user_id == current_user.id,
        IdentityDocument.document_type == doc_data.document_type
    ).first()

    if existing_doc:
        existing_doc.document_url = doc_data.document_url
        existing_doc.status = "under_review"
        existing_doc.uploaded_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_doc)
        return existing_doc

    new_doc = IdentityDocument(
        user_id=current_user.id,
        document_type=doc_data.document_type,
        document_url=doc_data.document_url,
        status="under_review"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc