from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from pydantic import BaseModel

from app.db.database import get_db
from app.models.sos import SOSAlert
from app.models.user import User

router = APIRouter(
    prefix="/api/v1/sos",
    tags=["SOS"]
)


# ==========================================================
# Request Schemas
# ==========================================================

class SOSTriggerSchema(BaseModel):
    user_id: int
    ride_id: int | None = None
    latitude: float
    longitude: float


# ==========================================================
# Trigger SOS
# ==========================================================

@router.post("/trigger", status_code=status.HTTP_201_CREATED)
def trigger_sos(
    payload: SOSTriggerSchema,
    db: Session = Depends(get_db)
):
    """
    Trigger an emergency SOS alert.
    """

    user = db.query(User).filter(User.id == payload.user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    alert = SOSAlert(
        user_id=payload.user_id,
        ride_id=payload.ride_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="active"
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return {
        "success": True,
        "alert_id": alert.id,
        "status": alert.status,
        "message": "Emergency SOS triggered successfully."
    }


# ==========================================================
# Active Alerts (Admin)
# ==========================================================

@router.get("/active-alerts")
def get_active_alerts(
    db: Session = Depends(get_db)
):
    """
    Returns every unresolved SOS alert.
    """

    alerts = (
        db.query(SOSAlert)
        .filter(SOSAlert.status == "active")
        .order_by(SOSAlert.created_at.desc())
        .all()
    )

    return {
        "active_emergencies_count": len(alerts),
        "alerts": [
            {
                "alert_id": alert.id,
                "user_id": alert.user_id,
                "ride_id": alert.ride_id,
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "status": alert.status,
                "created_at": alert.created_at,
            }
            for alert in alerts
        ]
    }


# ==========================================================
# Alert Details
# ==========================================================

@router.get("/{alert_id}")
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single SOS alert.
    """

    alert = (
        db.query(SOSAlert)
        .filter(SOSAlert.id == alert_id)
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="SOS alert not found."
        )

    return {
        "alert_id": alert.id,
        "user_id": alert.user_id,
        "ride_id": alert.ride_id,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "status": alert.status,
        "created_at": alert.created_at,
    }


# ==========================================================
# Resolve Alert
# ==========================================================

@router.put("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """
    Resolve an active SOS alert.
    """

    alert = (
        db.query(SOSAlert)
        .filter(SOSAlert.id == alert_id)
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="SOS alert not found."
        )

    if alert.status == "resolved":
        return {
            "success": True,
            "message": "Alert already resolved."
        }

    alert.status = "resolved"

    db.commit()
    db.refresh(alert)

    return {
        "success": True,
        "alert_id": alert.id,
        "status": alert.status,
        "message": "SOS alert resolved successfully."
    }


# ==========================================================
# Alert History
# ==========================================================

@router.get("/history/all")
def alert_history(
    db: Session = Depends(get_db)
):
    """
    Returns all SOS alerts.
    """

    alerts = (
        db.query(SOSAlert)
        .order_by(SOSAlert.created_at.desc())
        .all()
    )

    return {
        "total_alerts": len(alerts),
        "alerts": [
            {
                "alert_id": alert.id,
                "user_id": alert.user_id,
                "ride_id": alert.ride_id,
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "status": alert.status,
                "created_at": alert.created_at,
            }
            for alert in alerts
        ]
    }