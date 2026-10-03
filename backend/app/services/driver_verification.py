from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.document import Document


DOCUMENT_TYPE_ALIASES = {
    "aadhaar": "aadhaar",
    "aadhaar card": "aadhaar",
    "pan": "pan",
    "pan card": "pan",
    "license": "license",
    "licence": "license",
    "driving license": "license",
    "driving licence": "license",
    "driving_licence": "license",
    "driving_license": "license",
    "rc": "rc_book",
    "rc book": "rc_book",
    "rc_book": "rc_book",
    "vehicle rc": "rc_book",
    "vehicle registration certificate": "rc_book",
    "vehicle_insurance": "vehicle_insurance",
    "vehicle insurance": "vehicle_insurance",
    "insurance": "vehicle_insurance",
    "pollution_certificate": "pollution_certificate",
    "pollution certificate": "pollution_certificate",
    "puc": "pollution_certificate",
}

ALLOWED_DOCUMENT_TYPES = frozenset(DOCUMENT_TYPE_ALIASES.values())
REQUIRED_DRIVER_DOCUMENT_TYPES = frozenset({"license", "rc_book"})
APPROVED_DOCUMENT_STATUSES = frozenset({"approved", "verified"})


def normalize_document_type(document_type: str) -> str | None:
    return DOCUMENT_TYPE_ALIASES.get(document_type.strip().casefold())


def normalize_document_status(document_status: str | None) -> str:
    value = (document_status or "pending").strip().casefold()
    return "approved" if value == "verified" else value


def assert_driver_documents_approved(db: Session, user_id: int) -> None:
    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.uploaded_at.desc(), Document.id.desc())
        .all()
    )

    latest_status_by_type: dict[str, str] = {}
    for document in documents:
        document_type = normalize_document_type(document.document_type)
        if document_type in REQUIRED_DRIVER_DOCUMENT_TYPES:
            latest_status_by_type.setdefault(
                document_type,
                (document.status or "pending").strip().casefold(),
            )

    missing_types = sorted(
        document_type
        for document_type in REQUIRED_DRIVER_DOCUMENT_TYPES
        if latest_status_by_type.get(document_type) not in APPROVED_DOCUMENT_STATUSES
    )
    if missing_types:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An approved Driving Licence and Vehicle RC are required before offering rides.",
        )