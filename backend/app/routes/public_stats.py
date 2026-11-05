from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.booking import Booking
from app.models.rating import Rating
from app.models.ride import Ride

router = APIRouter(prefix="/api/v1/public", tags=["Public"])


@router.get("/stats")
def get_public_stats(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=30)
    participants = (
        db.query(Booking.passenger_id.label("user_id"))
        .filter(Booking.created_at >= since, Booking.status != "CANCELLED")
        .union(
            db.query(Booking.driver_id.label("user_id"))
            .filter(Booking.created_at >= since, Booking.status != "CANCELLED")
        )
        .subquery()
    )
    rating = db.query(func.avg(Rating.score)).scalar()

    return {
        "active_commuters": db.query(func.count()).select_from(participants).scalar() or 0,
        "daily_routes": (
            db.query(func.count(Ride.id))
            .filter(
                func.date(Ride.departure_time) == func.current_date(),
                Ride.status.in_(["available", "published"]),
            )
            .scalar()
            or 0
        ),
        "average_rating": round(float(rating), 1) if rating is not None else None,
        "completed_rides": (
            db.query(func.count(Ride.id)).filter(Ride.status == "completed").scalar()
            or 0
        ),
    }
