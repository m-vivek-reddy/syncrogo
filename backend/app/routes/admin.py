from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.ride import Ride
from app.models.sos import SOSAlert
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.report import Report
from app.routes.auth import get_current_user
from app.models.document import Document
from app.schemas.document import DocumentStatus
from app.services.account_deletion import process_account_deletion
from app.services.driver_verification import normalize_document_status, normalize_document_type

router = APIRouter(
    prefix="/admin",
    tags=["Admin Portal"]
)


# ==============================
# ADMIN CHECK
# ==============================

def verify_admin_role(
    current_user: User = Depends(get_current_user)
):

    if current_user.role not in ["admin", "employer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator or Employer privileges required."
        )

    return current_user



# ==============================
# ANALYTICS
# ==============================

@router.get("/analytics")
def get_platform_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):

    total_passengers = (
        db.query(User)
        .filter(User.role == "passenger")
        .count()
    )

    total_drivers = (
        db.query(User)
        .filter(User.role == "driver")
        .count()
    )

    total_rides = db.query(Ride).count()


    completed_rides = (
        db.query(Ride)
        .filter(Ride.status == "completed")
        .count()
    )


    active_sos = (
        db.query(SOSAlert)
        .filter(SOSAlert.status == "active")
        .count()
    )


    fees = (
        db.query(Ride.platform_fee)
        .filter(Ride.status == "completed")
        .all()
    )


    total_revenue = sum(
        fee[0] for fee in fees if fee[0]
    )


    total_users = (
        db.query(User)
        .filter(User.role != "admin")
        .count()
    )

    pending_documents = (
        db.query(Document)
        .filter(Document.status == "pending")
        .count()
    )

    return {

        "total_users": total_users,
        "total_passengers": total_passengers,

        "total_drivers": total_drivers,

        "total_rides": total_rides,
        "total_rides_booked": total_rides,

        "completed_rides": completed_rides,

        "pending_documents": pending_documents,

        "active_emergencies": active_sos,

        "revenue": round(total_revenue, 2),
        "platform_total_revenue": round(
            total_revenue,
            2
        )
    }




# ==============================
# USERS LIST
# ==============================

@router.get("/users")
def list_all_platform_users(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):

    users = db.query(User).all()


    return [
        {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "role": user.role,
            "is_online": getattr(
                user,
                "is_online",
                False
            )
        }
        for user in users
    ]




# ==============================
# CHANGE USER ROLE
# ==============================

@router.patch("/users/{target_user_id}/role")
def update_user_role(
    target_user_id: int,
    new_role: str,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):

    if admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employers cannot change user roles. Admin privileges required."
        )

    allowed_roles = [
        "passenger",
        "driver",
        "employer",
        "admin"
    ]


    if new_role not in allowed_roles:

        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )


    target_user = (
        db.query(User)
        .filter(User.id == target_user_id)
        .first()
    )


    if not target_user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    target_user.role = new_role

    db.commit()


@router.delete("/users/{target_user_id}")
def delete_platform_user(
    target_user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    if admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employers cannot delete accounts. Admin privileges required."
        )
    if target_user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    result = process_account_deletion(
        db=db,
        user=target_user,
        actor_user_id=admin.id,
        source="admin_action",
    )
    return {
        "message": "User account anonymized through the audited retention workflow.",
        "user_id": target_user_id,
        "privacy_request_id": result["request_id"],
    }


# ==============================
# DOCUMENT VERIFICATION
# ==============================

@router.get("/documents")
def list_all_documents(
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    documents = db.query(Document).all()

    return [
        {
            "id": doc.id,
            "document_id": doc.id,
            "user_id": doc.user_id,
            "document_type": normalize_document_type(doc.document_type) or doc.document_type,
            "status": normalize_document_status(doc.status),
            "uploaded_at": doc.uploaded_at,
            "file_url": str(request.url_for("download_document", document_id=doc.id)),
        }
        for doc in documents
    ]


@router.patch("/documents/{document_id}")
def update_document_status(
    document_id: int,
    status: DocumentStatus,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    document.status = status.value

    db.commit()
    db.refresh(document)

    return {
        "message": "Document status updated",
        "document": {
            "id": document.id,
            "status": document.status
        }
    }

@router.get("/drivers")
def list_drivers(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    drivers = db.query(User).filter(User.role == "driver").all()

    return [
        {
            "id": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "phone": driver.phone,
            "rating": getattr(driver, "rating", 0),
            "is_verified": driver.is_verified,
            "is_online": getattr(driver, "is_online", False),
        }
        for driver in drivers
    ]


# ==============================
# SOS ALERTS (ALL, for admin portal)
# ==============================

@router.get("/sos")
def list_all_sos_alerts(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    alerts = (
        db.query(SOSAlert)
        .order_by(SOSAlert.created_at.desc())
        .all()
    )

    result = []
    for alert in alerts:
        user = db.query(User).filter(User.id == alert.user_id).first()
        ride = (
            db.query(Ride).filter(Ride.id == alert.ride_id).first()
            if alert.ride_id else None
        )
        result.append({
            "id": alert.id,
            "ride_id": f"SG-{alert.ride_id:06d}" if alert.ride_id else None,
            "user_name": user.full_name if user else "Unknown",
            "user_phone": (user.phone if user else "") or "",
            "user_role": user.role if user else "passenger",
            "location_name": (
                ride.origin if ride and ride.origin else "Coordinates on file"
            ),
            "coordinates": {"latitude": alert.latitude, "longitude": alert.longitude},
            "timestamp": alert.created_at.isoformat() if alert.created_at else None,
            "status": alert.status,
        })

    return result


@router.patch("/sos/{alert_id}")
def update_sos_alert_status(
    alert_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    next_status = (payload or {}).get("status")
    if next_status not in ("investigating", "resolved"):
        raise HTTPException(status_code=400, detail="Status must be 'investigating' or 'resolved'.")

    alert = db.query(SOSAlert).filter(SOSAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="SOS alert not found.")

    alert.status = next_status
    db.commit()
    return {"success": True, "id": alert.id, "status": alert.status}


# ==============================
# PAYMENTS (admin portal feed)
# ==============================

@router.get("/payments")
def list_all_payments(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    payments = (
        db.query(Payment)
        .order_by(Payment.created_at.desc())
        .limit(500)
        .all()
    )

    result = []
    for pay in payments:
        booking = db.query(Booking).filter(Booking.id == pay.booking_id).first()
        passenger = (
            db.query(User).filter(User.id == booking.passenger_id).first()
            if booking else None
        )
        driver = (
            db.query(User).filter(User.id == booking.driver_id).first()
            if booking else None
        )

        # Map the Payment state machine to the portal's display status.
        if pay.status == Payment.PAID:
            display_status = "refunded" if pay.refund_status == "REFUNDED" else "completed"
        elif pay.status in (Payment.PENDING, Payment.PROCESSING):
            display_status = "pending"
        elif pay.status == Payment.FAILED:
            display_status = "failed"
        else:
            display_status = "refunded"

        amount = float(pay.amount or 0)
        result.append({
            "id": pay.provider_payment_id or f"PAY-{pay.id}",
            "ride_id": f"SG-{booking.ride_id:06d}" if booking else None,
            "passenger_name": passenger.full_name if passenger else "Unknown",
            "driver_name": driver.full_name if driver else "Unknown",
            "amount": amount,
            "platform_fee": round(amount * 0.10, 2),
            "driver_amount": round(amount * 0.90, 2),
            "payment_method": pay.method or "UPI",
            "status": display_status,
            "timestamp": pay.created_at.isoformat() if pay.created_at else None,
        })

    return result


@router.post("/payments/{payment_pk}/refund")
def refund_payment(
    payment_pk: str,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    # The portal sends the provider payment id; fall back to the numeric PK.
    pay = None
    if payment_pk.isdigit():
        pay = db.query(Payment).filter(Payment.id == int(payment_pk)).first()
    if not pay:
        pay = db.query(Payment).filter(Payment.provider_payment_id == payment_pk).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found.")

    try:
        pay.transition_to(Payment.REFUNDED)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    db.commit()
    return {"success": True, "payment_id": pay.id, "status": pay.status}


# ==============================
# REPORTS (user reports + privacy requests)
# ==============================

_SEVERITY_BY_CATEGORY = {
    "safety": "high",
    "dispute": "medium",
    "vehicle": "medium",
    "system": "low",
}


def _report_category(text: str | None) -> str:
    lowered = (text or "").lower()
    if any(word in lowered for word in ("safety", "sos", "accident", "harass", "threat")):
        return "safety"
    if any(word in lowered for word in ("vehicle", "license", "licence", "document")):
        return "vehicle"
    if any(word in lowered for word in ("payment", "fare", "refund", "cash")):
        return "dispute"
    return "system"


@router.get("/reports")
def list_all_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    from app.models.privacy_request import PrivacyRequest

    items = []

    for rep in (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .limit(300)
        .all()
    ):
        reporter = db.query(User).filter(User.id == rep.reporter_id).first()
        category = _report_category(rep.reason)
        items.append({
            "id": rep.id,
            "title": (rep.reason or "User report")[:80],
            "category": category,
            "severity": _SEVERITY_BY_CATEGORY.get(category, "medium"),
            "reported_by": reporter.full_name if reporter else f"User #{rep.reporter_id}",
            "description": rep.description or rep.reason or "",
            "timestamp": rep.created_at.isoformat() if rep.created_at else None,
            "status": (
                "resolved" if rep.status == "resolved"
                else "investigating" if rep.status == "reviewed"
                else "open"
            ),
        })

    for req in (
        db.query(PrivacyRequest)
        .order_by(PrivacyRequest.created_at.desc())
        .limit(300)
        .all()
    ):
        requester = db.query(User).filter(User.id == req.user_id).first()
        category = _report_category(req.reason)
        severity = "high" if req.request_type in ("deletion", "erasure") else "medium"
        items.append({
            "id": 100000 + req.id,  # offset so privacy requests never collide with reports
            "title": f"Privacy request: {req.request_type}",
            "category": category,
            "severity": severity,
            "reported_by": requester.full_name if requester else f"User #{req.user_id}",
            "description": req.reason or f"DPDP {req.request_type} request raised from {req.source}.",
            "timestamp": req.created_at.isoformat() if req.created_at else None,
            "status": (
                "resolved" if req.status == "completed"
                else "investigating" if req.status in ("reviewing", "processing")
                else "open"
            ),
        })

    items.sort(key=lambda r: r["timestamp"] or "", reverse=True)
    return items


@router.patch("/reports/{report_id}")
def update_report_status(
    report_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    from app.models.privacy_request import PrivacyRequest

    next_status = (payload or {}).get("status")
    if next_status not in ("investigating", "resolved"):
        raise HTTPException(status_code=400, detail="Status must be 'investigating' or 'resolved'.")

    # Privacy requests live in the 100000+ id space (see /admin/reports).
    if report_id > 100000:
        request = db.query(PrivacyRequest).filter(
            PrivacyRequest.id == report_id - 100000
        ).first()
        if not request:
            raise HTTPException(status_code=404, detail="Privacy request not found.")
        request.status = {
            "investigating": "reviewing",
            "resolved": "completed",
        }[next_status]
        db.commit()
        return {"success": True, "id": request.id, "status": request.status}

    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found.")
    rep.status = "reviewed" if next_status == "investigating" else "resolved"
    db.commit()
    return {"success": True, "id": rep.id, "status": rep.status}


# ==============================
# PLATFORM SETTINGS (persisted in platform_settings table)
# ==============================

class AdminSettingsUpdate(BaseModel):
    allow_cash_rides: bool | None = None
    maintenance_mode: bool | None = None
    auto_verify_documents: bool | None = None


def _get_setting(db: Session, key: str, default: str) -> str:
    from app.models.platform_setting import PlatformSetting

    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    return row.value if row else default


def _set_setting(db: Session, key: str, value: str, description: str) -> None:
    from app.models.platform_setting import PlatformSetting

    row = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(PlatformSetting(key=key, value=value, description=description))


@router.get("/settings")
def get_admin_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    pending_payments = (
        db.query(Payment)
        .filter(Payment.status.in_([Payment.PENDING, Payment.PROCESSING]))
        .count()
    )
    pending_docs = (
        db.query(Document)
        .filter(Document.status == "pending")
        .count()
    )

    return {
        "services": {
            "api": {"status": "online", "service": "FastAPI"},
            "database": {"status": "connected"},
            "payments": {"status": "active", "provider": "razorpay"},
            "otp": {"status": "active", "provider": "email + sms"},
        },
        "pending_payments": pending_payments,
        "pending_documents": pending_docs,
        "allow_cash_rides": _get_setting(db, "allow_cash_rides", "true") == "true",
        "maintenance_mode": _get_setting(db, "maintenance_mode", "false") == "true",
        "auto_verify_documents": _get_setting(db, "auto_verify_documents", "false") == "true",
        "platform_commission_rate": 0.10,
    }


@router.patch("/settings")
def update_admin_settings(
    payload: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
):
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required.")

    if payload.allow_cash_rides is not None:
        _set_setting(db, "allow_cash_rides", str(payload.allow_cash_rides).lower(), "Passengers may pay drivers in cash")
    if payload.maintenance_mode is not None:
        _set_setting(db, "maintenance_mode", str(payload.maintenance_mode).lower(), "Pause new ride bookings platform-wide")
    if payload.auto_verify_documents is not None:
        _set_setting(db, "auto_verify_documents", str(payload.auto_verify_documents).lower(), "Auto-approve driver documents that pass provider checks")

    db.commit()
    return {
        "success": True,
        "allow_cash_rides": _get_setting(db, "allow_cash_rides", "true") == "true",
        "maintenance_mode": _get_setting(db, "maintenance_mode", "false") == "true",
        "auto_verify_documents": _get_setting(db, "auto_verify_documents", "false") == "true",
    }
