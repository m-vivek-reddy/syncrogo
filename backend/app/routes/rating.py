from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.rating import Rating
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from app.routes.auth import get_current_user

router = APIRouter(
    prefix="/api/v1/ratings",
    tags=["Ratings"]
)

@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def submit_rating(
    rating_data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a customer or driver to rate a completed ride."""
    
    # 1. Verify the ride exists
    ride = db.query(Ride).filter(Ride.id == rating_data.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    # 2. Rule: Rides must be completed before they can be rated
    if ride.status != "completed":
        raise HTTPException(status_code=400, detail="You can only rate a completed ride")
        
    # 3. Rule: Figure out who is reviewing whom via Booking table
    booking = db.query(Booking).filter(Booking.ride_id == rating_data.ride_id).first()
    if not booking:
        raise HTTPException(status_code=403, detail="No booking found for this ride.")

    if current_user.id == ride.driver_id and booking.passenger_id == current_user.id:
        # User is both driver and customer (edge case) — not allowed
        raise HTTPException(status_code=403, detail="You cannot rate your own ride.")

    if current_user.id == ride.driver_id:
        # Driver reviewing the passenger
        reviewee_id = booking.passenger_id
    elif current_user.id == booking.passenger_id:
        # Passenger reviewing the driver
        reviewee_id = ride.driver_id
    else:
        raise HTTPException(status_code=403, detail="You are not a participant in this ride.")
        
    # 4. Rule: Prevent duplicate ratings (one review per user, per ride)
    existing_rating = db.query(Rating).filter(
        Rating.ride_id == rating_data.ride_id,
        Rating.reviewer_id == current_user.id
    ).first()
    
    if existing_rating:
        raise HTTPException(status_code=400, detail="You have already rated this ride")
        
    # 5. Save the rating to the database
    new_rating = Rating(
        ride_id=rating_data.ride_id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        score=rating_data.score,
        feedback=rating_data.feedback
    )
    
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    
    return new_rating
