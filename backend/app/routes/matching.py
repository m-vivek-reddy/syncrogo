from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.services.matching_service import find_nearby_drivers
from app.services.pricing_service import calculate_ride_fare

router = APIRouter(prefix="/match", tags=["Ride Matching"])

class RideRequestSchema(BaseModel):
    passenger_id: int
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    distance_km: float
    vehicle_type: str  # "bike" or "car"

@router.post("/request-ride")
def request_ride(payload: RideRequestSchema, db: Session = Depends(get_db)):
    """Calculates fare, finds nearby drivers, and dispatches the request to the closest driver."""
    fare_breakdown = calculate_ride_fare(
        distance_km=payload.distance_km,
        vehicle_type=payload.vehicle_type
    )

    nearby_drivers = find_nearby_drivers(
        db=db,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        vehicle_type=payload.vehicle_type,
        radius_km=5.0
    )

    if not nearby_drivers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drivers available nearby. Please try again later."
        )

    best_driver = nearby_drivers[0]

    return {
        "status": "success",
        "message": "Ride requested successfully. Dispatched to the nearest driver.",
        "pricing": fare_breakdown,
        "dispatched_to_driver": best_driver,
        "total_drivers_found": len(nearby_drivers)
    }
