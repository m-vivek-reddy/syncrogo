from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from pydantic import BaseModel, ConfigDict, Field

from app.db.session import get_db
from app.models.booking import Booking
from app.models.ride import Ride
from app.models.sos import SOSAlert
from app.models.user import User
from app.routes.auth import get_current_user
from app.routes.admin import verify_admin_role

router = APIRouter(
    prefix="/api/v1/sos",
    tags=["SOS"]
)


# ==========================================================
# Request Schemas
# ==========================================================

class SOSTriggerSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ride_id: int | None = None
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


# ==========================================================
# Trigger SOS
# ==========================================================

def _assert_user_authorized_for_sos(db: Session, user: User, ride_id: int | None):
    if ride_id is None:
        active_driver_ride = (
            db.query(Ride.id)
            .filter(Ride.driver_id == user.id, Ride.status == "started")
            .first()
        )
        active_passenger_booking = (
            db.query(Booking.id)
            .join(Ride, Booking.ride_id == Ride.id)
            .filter(
                Booking.passenger_id == user.id,
                Booking.status.in_(["ACCEPTED", "STARTED"]),
                Ride.status == "started",
            )
            .first()
        )
        if active_driver_ride or active_passenger_booking:
            raise HTTPException(
                status_code=400,
                detail="ride_id is required while you are on an active ride.",
            )
        return

    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    if ride.status.lower() != "started":
        raise HTTPException(status_code=400, detail="SOS is only valid for an active ride.")

    if ride.driver_id == user.id:
        return

    matching_booking = (
        db.query(Booking)
        .filter(
            Booking.ride_id == ride.id,
            Booking.passenger_id == user.id,
            Booking.status.in_(["ACCEPTED", "STARTED"]),
        )
        .first()
    )
    if not matching_booking:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to trigger SOS for this ride.",
        )

@router.post("/trigger", status_code=status.HTTP_201_CREATED)
def trigger_sos(
    payload: SOSTriggerSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger an emergency SOS alert.
    """

    _assert_user_authorized_for_sos(db, current_user, payload.ride_id)

    alert = SOSAlert(
        user_id=current_user.id,
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
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    if alert.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this alert.")

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
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
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
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role),
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
