from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.ride import Ride
from app.services.pricing_service import validate_and_update_ride_price


def modify_ride_price(db: Session, ride_id: int, new_price: float, driver_id: int) -> Ride:
    """Updates ride price while enforcing platform fare boundaries."""
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found."
        )

    if ride.driver_id != driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this ride."
        )

    validate_and_update_ride_price(ride, new_price)

    db.commit()
    db.refresh(ride)
    return ride
