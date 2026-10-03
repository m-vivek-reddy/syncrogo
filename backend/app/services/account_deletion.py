from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.document import Document
from app.models.emergency_contact import EmergencyContact
from app.models.payment import Payment
from app.models.privacy_request import PrivacyRequest, PrivacyRequestEvent
from app.models.report import Report
from app.models.ride import Ride
from app.models.user import User
from app.models.vehicle import Vehicle
from app.services.retention import RETENTION_POLICY
from app.utils.security import hash_password


UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
DOCUMENT_DIR = (UPLOAD_ROOT / "documents").resolve()
PROFILE_PHOTO_DIR = (UPLOAD_ROOT / "profile_photos").resolve()


def _record_transition(
    db: Session,
    request: PrivacyRequest,
    actor_user_id: int | None,
    next_status: str,
    admin_note: str | None = None,
) -> None:
    previous_status = request.status
    request.status = next_status
    db.add(
        PrivacyRequestEvent(
            request_id=request.id,
            actor_user_id=actor_user_id,
            from_status=previous_status,
            to_status=next_status,
            admin_note=admin_note,
        )
    )


def _safe_file_to_remove(raw_path: str | None, allowed_dir: Path) -> Path | None:
    if not raw_path:
        return None
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = (UPLOAD_ROOT / candidate).resolve()
    candidate = candidate.resolve()
    if allowed_dir not in candidate.parents or not candidate.is_file():
        return None
    return candidate


def _deletion_blocker(db: Session, user_id: int) -> str | None:
    active_ride = (
        db.query(Ride.id)
        .filter(
            Ride.driver_id == user_id,
            Ride.status.in_(["available", "published", "full", "started"]),
        )
        .first()
    )
    if active_ride:
        return "Account deletion is blocked while you have an active ride."

    active_booking = (
        db.query(Booking.id)
        .filter(
            or_(Booking.passenger_id == user_id, Booking.driver_id == user_id),
            Booking.status.notin_(["COMPLETED", "CANCELLED", "PAID"]),
        )
        .first()
    )
    if active_booking:
        return "Account deletion is blocked while you have an active booking."

    unresolved_payment = (
        db.query(Payment.id)
        .join(Booking, Booking.id == Payment.booking_id)
        .filter(
            or_(Booking.passenger_id == user_id, Booking.driver_id == user_id),
            or_(
                Payment.status.in_([Payment.PENDING, Payment.PROCESSING]),
                Payment.refund_status.in_(
                    ["REFUND_PENDING", "DISPUTED", "CHARGEBACK", "UNDER_REVIEW"]
                ),
            ),
        )
        .first()
    )
    if unresolved_payment:
        return "Account deletion is blocked while payment or dispute activity is unresolved."

    open_report = (
        db.query(Report.id)
        .filter(
            or_(Report.reporter_id == user_id, Report.reported_user_id == user_id),
            Report.status.in_(["pending", "reviewed"]),
        )
        .first()
    )
    if open_report:
        return "Account deletion is blocked while a safety or security report is unresolved."
    return None


def process_account_deletion(
    db: Session,
    user: User,
    actor_user_id: int | None,
    source: str = "self_service",
    request_record: PrivacyRequest | None = None,
) -> dict:
    completed_request = (
        db.query(PrivacyRequest)
        .filter(
            PrivacyRequest.user_id == user.id,
            PrivacyRequest.request_type == "deletion",
            PrivacyRequest.status == "completed",
        )
        .order_by(PrivacyRequest.created_at.desc())
        .first()
    )
    if request_record is None and user.email == f"deleted-{user.id}@privacy.local" and completed_request:
        return {"request_id": completed_request.id, "already_completed": True}

    if request_record is None:
        request = PrivacyRequest(
            user_id=user.id,
            request_type="deletion",
            status="open",
            source=source,
            reason="Account deletion requested",
            request_metadata={"actor_user_id": actor_user_id},
        )
        db.add(request)
        db.flush()
        db.add(
            PrivacyRequestEvent(
                request_id=request.id,
                actor_user_id=actor_user_id,
                from_status=None,
                to_status="open",
            )
        )
    else:
        request = request_record
        if request.request_type != "deletion" or request.status != "processing":
            raise HTTPException(status_code=400, detail="Deletion request must be processing before fulfillment.")

    blocker = _deletion_blocker(db, user.id)
    if blocker:
        if request_record is None:
            _record_transition(db, request, actor_user_id, "reviewing", blocker)
        else:
            db.add(
                PrivacyRequestEvent(
                    request_id=request.id,
                    actor_user_id=actor_user_id,
                    from_status=request.status,
                    to_status=request.status,
                    admin_note=blocker,
                )
            )
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=blocker)

    if request_record is None:
        _record_transition(db, request, actor_user_id, "reviewing")
        _record_transition(db, request, actor_user_id, "processing")

    documents = db.query(Document).filter(Document.user_id == user.id).all()
    private_files = [
        path
        for path in (_safe_file_to_remove(doc.file_path, DOCUMENT_DIR) for doc in documents)
        if path is not None
    ]
    photo_url = user.profile_photo_url or ""
    if photo_url.startswith("/uploads/profile_photos/"):
        photo_path = _safe_file_to_remove(
            str(PROFILE_PHOTO_DIR / Path(photo_url).name), PROFILE_PHOTO_DIR
        )
        if photo_path is not None:
            private_files.append(photo_path)

    # Keep verification decision metadata for review; discard private file bytes.
    for document in documents:
        document.file_path = ""
    db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(Vehicle).filter(Vehicle.driver_id == user.id).delete(synchronize_session=False)

    user.full_name = "Deleted User"
    user.email = f"deleted-{user.id}@privacy.local"
    user.phone = None
    user.profile_photo_url = None
    user.password = hash_password(f"deleted-{user.id}-{uuid4().hex}")
    user.is_verified = False
    user.is_online = False
    user.latitude = None
    user.longitude = None
    user.otp_code = None
    user.otp_expires_at = None
    for purpose in (
        "terms",
        "privacy",
        "cookies",
        "marketing_email",
        "location",
        "documents",
        "sms",
    ):
        setattr(user, f"consent_{purpose}", False)
    user.consent_recorded_at = None
    user.consent_policy_version = None

    request.reason = "Account anonymized; linked history retained according to policy."
    request.request_metadata = {
        "retention_policy": RETENTION_POLICY,
        "private_files_scheduled_for_removal": len(private_files),
    }
    db.commit()

    removed_file_count = 0
    failed_file_count = 0
    for file_path in private_files:
        try:
            file_path.unlink(missing_ok=True)
            removed_file_count += 1
        except OSError:
            failed_file_count += 1

    if failed_file_count:
        db.add(
            PrivacyRequestEvent(
                request_id=request.id,
                actor_user_id=actor_user_id,
                from_status="processing",
                to_status="processing",
                admin_note=f"{failed_file_count} private file(s) still require removal.",
            )
        )
        request.request_metadata = {
            **(request.request_metadata or {}),
            "private_file_removal_failures": failed_file_count,
        }
        db.commit()
        return {
            "request_id": request.id,
            "removed_file_count": removed_file_count,
            "status": "processing",
        }

    _record_transition(db, request, actor_user_id, "completed")
    db.commit()

    return {"request_id": request.id, "removed_file_count": removed_file_count, "status": "completed"}
