from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.booking import Booking
from app.models.consent import ALL_PURPOSES, ConsentRecord
from app.models.document import Document
from app.models.emergency_contact import EmergencyContact
from app.models.payment import Payment
from app.models.privacy_request import PrivacyRequest, PrivacyRequestEvent
from app.models.rating import Rating
from app.models.ride import Ride
from app.models.user import User
from app.routes.auth import get_current_user
from app.routes.admin import verify_admin_role
from app.services.account_deletion import process_account_deletion
from app.services.consent_service import POLICY_VERSION, record_consent

router = APIRouter(prefix="/api/v1/privacy", tags=["Privacy"])

_ALLOWED_REQUEST_TYPES = {
    "access",
    "correction",
    "erasure",
    "deletion",
    "consent",
    "export",
    "withdrawal",
}


class PrivacyRequestCreate(BaseModel):
    request_type: str
    reason: str | None = None
    metadata: dict | None = None
    source: str = "settings"


class PrivacyWithdrawalRequest(BaseModel):
    purposes: list[str] | None = None
    note: str | None = None


class PrivacyRequestStatus(str, Enum):
    REVIEWING = "reviewing"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class PrivacyRequestReview(BaseModel):
    status: PrivacyRequestStatus
    admin_note: str | None = Field(default=None, max_length=4000)


def _make_request_record(
    db: Session,
    user: User,
    request_type: str,
    reason: str | None,
    source: str,
    metadata: dict | None,
) -> PrivacyRequest:
    request = PrivacyRequest(
        user_id=user.id,
        request_type=request_type,
        status="open",
        reason=reason,
        source=source,
        request_metadata=metadata or {},
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    db.add(
        PrivacyRequestEvent(
            request_id=request.id,
            actor_user_id=user.id,
            from_status=None,
            to_status="open",
        )
    )
    db.commit()
    return request


def _set_request_status(
    db: Session,
    request: PrivacyRequest,
    actor_user_id: int,
    next_status: str,
    admin_note: str | None = None,
) -> None:
    previous_status = request.status
    request.status = next_status
    if admin_note:
        request.admin_notes = "\n".join(filter(None, [request.admin_notes, admin_note]))
    db.add(
        PrivacyRequestEvent(
            request_id=request.id,
            actor_user_id=actor_user_id,
            from_status=previous_status,
            to_status=next_status,
            admin_note=admin_note,
        )
    )


@router.get("/requests")
def list_privacy_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    requests = (
        db.query(PrivacyRequest)
        .filter(PrivacyRequest.user_id == current_user.id)
        .order_by(PrivacyRequest.created_at.desc())
        .all()
    )
    return {
        "success": True,
        "requests": [
            {
                "id": item.id,
                "request_type": item.request_type,
                "status": item.status,
                "reason": item.reason,
                "source": item.source,
                "metadata": item.request_metadata,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in requests
        ],
    }


@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_privacy_request(
    payload: PrivacyRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request_type = payload.request_type.strip().lower()
    if request_type not in _ALLOWED_REQUEST_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported request type: {payload.request_type}",
        )

    request = _make_request_record(
        db=db,
        user=current_user,
        request_type=request_type,
        reason=payload.reason,
        source=payload.source,
        metadata=payload.metadata,
    )

    return {
        "success": True,
        "request": {
            "id": request.id,
            "request_type": request.request_type,
            "status": request.status,
            "source": request.source,
            "reason": request.reason,
            "metadata": request.request_metadata,
            "created_at": request.created_at.isoformat() if request.created_at else None,
        },
    }


@router.get("/admin/requests")
def list_all_privacy_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    requests = db.query(PrivacyRequest).order_by(PrivacyRequest.created_at.desc()).all()
    return {
        "success": True,
        "requests": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "request_type": item.request_type,
                "status": item.status,
                "reason": item.reason,
                "source": item.source,
                "metadata": item.request_metadata,
                "admin_notes": item.admin_notes,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "events": [
                    {
                        "from_status": event.from_status,
                        "to_status": event.to_status,
                        "actor_user_id": event.actor_user_id,
                        "admin_note": event.admin_note,
                        "created_at": event.created_at.isoformat() if event.created_at else None,
                    }
                    for event in db.query(PrivacyRequestEvent)
                    .filter(PrivacyRequestEvent.request_id == item.id)
                    .order_by(PrivacyRequestEvent.created_at.asc())
                    .all()
                ],
            }
            for item in requests
        ],
    }


@router.patch("/admin/requests/{request_id}")
def review_privacy_request(
    request_id: int,
    payload: PrivacyRequestReview,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    request = db.query(PrivacyRequest).filter(PrivacyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Privacy request not found.")

    transitions = {
        "open": {"reviewing", "rejected"},
        "reviewing": {"processing", "rejected"},
        "processing": {"completed", "rejected"},
    }
    next_status = payload.status.value
    if next_status not in transitions.get(request.status, set()):
        raise HTTPException(status_code=409, detail="Invalid privacy request state transition.")

    if request.request_type == "deletion" and next_status == "completed":
        process_account_deletion(
            db=db,
            user=request.user,
            actor_user_id=admin.id,
            source="admin_fulfillment",
            request_record=request,
        )
    else:
        _set_request_status(db, request, admin.id, next_status, payload.admin_note)
        db.commit()

    return {"success": True, "request_id": request.id, "status": request.status}


@router.post("/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consent_history = (
        db.query(ConsentRecord)
        .filter(ConsentRecord.user_id == current_user.id)
        .order_by(ConsentRecord.created_at.desc())
        .all()
    )

    bookings = (
        db.query(Booking)
        .filter(or_(Booking.passenger_id == current_user.id, Booking.driver_id == current_user.id))
        .all()
    )
    rides = (
        db.query(Ride)
        .filter(or_(Ride.driver_id == current_user.id, Ride.id.in_([b.ride_id for b in bookings if b.ride_id is not None])))
        .all()
    )
    payments = (
        db.query(Payment)
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(or_(Booking.passenger_id == current_user.id, Booking.driver_id == current_user.id))
        .all()
    )
    emergency_contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()
    ratings = db.query(Rating).filter(or_(Rating.reviewer_id == current_user.id, Rating.reviewee_id == current_user.id)).all()
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()

    export_payload = {
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": current_user.role,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "consent_history": [
            {
                "id": row.id,
                "purpose": row.purpose,
                "consent_type": row.consent_type,
                "status": row.status,
                "granted": row.granted,
                "document_version": row.document_version,
                "source": row.source,
                "note": row.note,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "withdrawal_timestamp": row.withdrawal_timestamp.isoformat() if row.withdrawal_timestamp else None,
            }
            for row in consent_history
        ],
        "rides": [
            {
                "id": ride.id,
                "driver_id": ride.driver_id,
                "origin": ride.origin,
                "destination": ride.destination,
                "departure_time": ride.departure_time.isoformat() if ride.departure_time else None,
                "final_fare": str(ride.final_fare) if ride.final_fare is not None else None,
            }
            for ride in rides
        ],
        "bookings": [
            {
                "id": booking.id,
                "ride_id": booking.ride_id,
                "driver_id": booking.driver_id,
                "passenger_id": booking.passenger_id,
                "status": booking.status,
                "pickup_location": booking.pickup_location,
                "dropoff_location": booking.dropoff_location,
            }
            for booking in bookings
        ],
        "payments": [
            {
                "id": payment.id,
                "amount": str(payment.amount) if getattr(payment, "amount", None) is not None else None,
                "status": payment.status,
                "method": payment.method,
                "created_at": payment.created_at.isoformat() if getattr(payment, "created_at", None) else None,
            }
            for payment in payments
        ],
        "emergency_contacts": [
            {
                "id": contact.id,
                "name": contact.name,
                "phone": contact.phone,
                "relationship": contact.relationship,
            }
            for contact in emergency_contacts
        ],
        "ratings": [
            {
                "id": rating.id,
                "reviewer_id": rating.reviewer_id,
                "reviewee_id": rating.reviewee_id,
                "score": rating.score,
                "comment": rating.comment,
            }
            for rating in ratings
        ],
        "documents": [
            {
                "id": document.id,
                "document_type": document.document_type,
                "status": document.status,
                "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
            }
            for document in documents
        ],
    }

    export_request = _make_request_record(
        db=db,
        user=current_user,
        request_type="export",
        reason="User data export prepared",
        source="self_service",
        metadata={"exported": True},
    )
    _set_request_status(db, export_request, current_user.id, "completed")
    db.commit()

    return {
        "success": True,
        "export": export_payload,
        "message": "Your data export has been prepared.",
    }


@router.post("/withdraw-consent")
def withdraw_consent(
    payload: PrivacyWithdrawalRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = payload.note if payload else None
    requested_purposes = payload.purposes if payload and payload.purposes else list(ALL_PURPOSES)
    record_consent(
        db=db,
        user=current_user,
        purposes=requested_purposes,
        granted=False,
        source="privacy_request",
        note=note or "privacy_request_withdrawal",
        policy_version=current_user.consent_policy_version or POLICY_VERSION,
    )

    withdrawal_request = _make_request_record(
        db=db,
        user=current_user,
        request_type="withdrawal",
        reason=note or "User withdrew consent",
        source="privacy_request",
        metadata={"purposes": requested_purposes},
    )
    _set_request_status(db, withdrawal_request, current_user.id, "completed")
    db.commit()

    return {
        "success": True,
        "message": "Consent withdrawn and recorded.",
        "purposes": requested_purposes,
    }
