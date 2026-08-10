from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.user import User
from app.routes.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter(tags=["Rides & Bookings"])


class RideOfferCreate(BaseModel):
    pickup_location: str
    pickup_lat: float
    pickup_lon: float
    dropoff_location: str
    dropoff_lat: float
    dropoff_lon: float
    ride_type: str = "carpool"
    price_per_seat: float
    available_seats: int
    gender_preference: str


def serialize_ride(ride: Ride | None):
    if not ride:
        return None

    return {
        "id": ride.id,
        "driver_id": ride.driver_id,
        "origin": ride.origin,
        "destination": ride.destination,
        "pickup_lat": ride.pickup_lat,
        "pickup_lon": ride.pickup_lon,
        "dropoff_lat": ride.dropoff_lat,
        "dropoff_lon": ride.dropoff_lon,
        "price_per_seat": ride.price_per_seat,
        "available_seats": ride.seats_available,
        "seats_available": ride.seats_available,
        "status": ride.status,
        "created_at": ride.created_at.isoformat() if ride.created_at else None,
        "gender_preference": ride.gender_preference,
    }


@router.post("/rides/offer", status_code=status.HTTP_201_CREATED)
def publish_ride_offer(
    offer_data: RideOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_offer = Ride(
        driver_id=current_user.id,
        origin=offer_data.pickup_location,
        destination=offer_data.dropoff_location,
        pickup_lat=offer_data.pickup_lat,
        pickup_lon=offer_data.pickup_lon,
        dropoff_lat=offer_data.dropoff_lat,
        dropoff_lon=offer_data.dropoff_lon,
        price_per_seat=offer_data.price_per_seat,
        seats_available=offer_data.available_seats,
        gender_preference=offer_data.gender_preference,
        status="published",
    )

    try:
        db.add(new_offer)
        db.commit()
        db.refresh(new_offer)
        return {"success": True, "ride_id": new_offer.id, "message": "Offer published successfully!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while publishing offer: {str(e)}",
        )


@router.get("/rides/search", status_code=status.HTTP_200_OK)
def search_rides(
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
    db: Session = Depends(get_db),
):
    try:
        matching_offers = db.query(Ride).filter(Ride.status == "published", Ride.seats_available > 0).all()
        return {"success": True, "count": len(matching_offers), "data": [serialize_ride(ride) for ride in matching_offers]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rides/{ride_id}/book", status_code=status.HTTP_200_OK)
def book_seat(ride_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.driver_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot book your own ride")

    if db.query(Booking).filter(Booking.ride_id == ride_id, Booking.customer_id == current_user.id).first():
        raise HTTPException(status_code=400, detail="You have already booked this ride")

    if ride.seats_available <= 0:
        raise HTTPException(status_code=400, detail="Sorry, this ride is full!")

    ride.seats_available -= 1

    if ride.seats_available == 0:
        ride.status = "full"

    try:
        db.add(
            Booking(
                ride_id=ride.id,
                customer_id=current_user.id,
                pickup_location=ride.origin,
                dropoff_location=ride.destination,
                scheduled_time=ride.departure_time or datetime.now(timezone.utc),
                status="scheduled",
            )
        )
        db.commit()
        return {"success": True, "message": "Seat successfully booked!", "seats_left": ride.seats_available}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/rides/driver/active", status_code=status.HTTP_200_OK)
def get_active_driver_ride(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_ride = (
        db.query(Ride)
        .filter(Ride.driver_id == current_user.id, Ride.status.in_(["published", "full"]))
        .order_by(Ride.created_at.desc())
        .first()
    )

    if not active_ride:
        return {"success": False, "message": "No active rides"}

    return {"success": True, "data": serialize_ride(active_ride)}


@router.get("/bookings/my-rides", status_code=status.HTTP_200_OK)
def get_my_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        bookings = db.query(Booking).filter(Booking.customer_id == current_user.id).all()
        results = []
        for booking in bookings:
            ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
            driver = db.query(User).filter(User.id == ride.driver_id).first() if ride else None
            results.append(
                {
                    "booking_id": booking.id,
                    "ride_id": booking.ride_id,
                    "pickup_location": booking.pickup_location,
                    "dropoff_location": booking.dropoff_location,
                    "status": booking.status,
                    "scheduled_time": booking.scheduled_time,
                    "price": ride.price_per_seat if ride else 0,
                    "driver_id": driver.id if driver else None,
                    "driver_name": driver.full_name if driver else "Driver",
                    "driver_phone": driver.phone if driver else None,
                }
            )

        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/driver/bookings", status_code=status.HTTP_200_OK)
def get_driver_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        driver_rides = db.query(Ride).filter(Ride.driver_id == current_user.id).all()
        ride_ids = [ride.id for ride in driver_rides]

        if not ride_ids:
            return {"success": True, "data": []}

        bookings = db.query(Booking).filter(Booking.ride_id.in_(ride_ids)).all()

        results = []
        for booking in bookings:
            passenger = db.query(User).filter(User.id == booking.customer_id).first()
            ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()

            results.append(
                {
                    "booking_id": booking.id,
                    "ride_id": booking.ride_id,
                    "passenger_id": passenger.id if passenger else None,
                    "passenger_name": passenger.full_name if passenger else "Passenger",
                    "passenger_phone": passenger.phone if passenger else None,
                    "pickup_location": booking.pickup_location,
                    "dropoff_location": booking.dropoff_location,
                    "status": booking.status,
                    "scheduled_time": booking.scheduled_time,
                    "price": ride.price_per_seat if ride else 0,
                }
            )

        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_200_OK)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.customer_id == current_user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
    if ride:
        ride.seats_available += 1
        if ride.status == "full":
            ride.status = "published"

    db.delete(booking)
    db.commit()
    return {"success": True, "message": "Booking cancelled successfully"}
