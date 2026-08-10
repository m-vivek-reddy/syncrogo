from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pydantic import model_validator
from typing import Optional
from app.db.database import get_db
from app.models.ride import Ride 
from app.models.booking import Booking
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.ride_service import modify_ride_price
from app.services.pricing_service import calculate_ride_fare
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["Rides & Bookings"])

class RideOfferCreate(BaseModel):
    pickup_location: str
    pickup_lat: float
    pickup_lon: float
    dropoff_location: str
    dropoff_lat: float
    dropoff_lon: float
    distance_km: float
    vehicle_type: str
    available_seats: int
    gender_preference: str
    discount: Optional[float] = 0.0

    @model_validator(mode='after')
    def validate_price_fields(self):
        if self.distance_km <= 0:
            raise ValueError("The ride distance must be greater than zero.")
        if self.discount is not None and self.discount < 0:
            raise ValueError("Discount cannot be negative.")
        return self

class RidePriceUpdate(BaseModel):
    new_price: float

    @model_validator(mode='after')
    def validate_price_limit(self):
        if self.new_price < 0:
            raise ValueError("The new price must be a positive value.")
        return self

@router.post("/rides/offer", status_code=status.HTTP_201_CREATED)
def publish_ride_offer(
    offer_data: RideOfferCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_driver_id = current_user.id 
    
    pricing = calculate_ride_fare(
        distance_km=offer_data.distance_km,
        vehicle_type=offer_data.vehicle_type,
        discount=offer_data.discount or 0.0,
    )

    new_offer = Ride(
        driver_id=current_driver_id,
        origin=offer_data.pickup_location,
        destination=offer_data.dropoff_location,
        pickup_lat=offer_data.pickup_lat,
        pickup_lon=offer_data.pickup_lon,
        dropoff_lat=offer_data.dropoff_lat,
        dropoff_lon=offer_data.dropoff_lon,
        distance_km=offer_data.distance_km,
        vehicle_type=offer_data.vehicle_type,
        base_fare=pricing["base_fare"],
        per_km_rate=pricing["per_km_rate"],
        platform_fee=pricing["platform_fee"],
        mrp_fare=pricing["mrp_fare"],
        minimum_fare=pricing["minimum_fare"],
        discount=pricing["discount"],
        final_fare=pricing["final_fare"],
        price_per_seat=pricing["final_fare"],
        seats_available=offer_data.available_seats,
        gender_preference=offer_data.gender_preference,
        status="published"
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
            detail=f"Database error while publishing offer: {str(e)}"
        )

@router.patch("/rides/{ride_id}/price", status_code=status.HTTP_200_OK)
def update_ride_price(
    ride_id: int,
    price_update: RidePriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        updated_ride = modify_ride_price(
            db=db,
            ride_id=ride_id,
            new_price=price_update.new_price,
            driver_id=current_user.id,
        )
        return {"success": True, "ride_id": updated_ride.id, "new_price": updated_ride.price_per_seat}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.get("/rides/search", status_code=status.HTTP_200_OK)
def search_rides(
    pickup_lat: float,
    pickup_lon: float,
    db: Session = Depends(get_db)
):
    try:
        from app.services.matching_service import calculate_distance

        matching_offers = db.query(Ride).filter(
            Ride.status == "published",
            Ride.seats_available > 0
        ).all()

        # Filter rides by proximity to pickup location
        nearby_rides = []
        for ride in matching_offers:
            if ride.pickup_lat is not None and ride.pickup_lon is not None:
                distance = calculate_distance(pickup_lat, pickup_lon, ride.pickup_lat, ride.pickup_lon)
                if distance <= 10.0:  # 10 km radius
                    nearby_rides.append(ride)

        return {
            "success": True,
            "count": len(nearby_rides),
            "data": nearby_rides
        }
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
        db.add(Booking(
            ride_id=ride.id,
            customer_id=current_user.id,
            pickup_location=ride.origin,
            dropoff_location=ride.destination,
            scheduled_time=datetime.now(timezone.utc),
            status="scheduled",
        ))
        db.commit()
        return {"success": True, "message": "Seat successfully booked!", "seats_left": ride.seats_available}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.get("/rides/driver/active", status_code=status.HTTP_200_OK)
def get_active_driver_ride(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_driver_id = current_user.id
    
    active_ride = db.query(Ride).filter(
        Ride.driver_id == current_driver_id,
        Ride.status.in_(["published", "full"])
    ).order_by(Ride.created_at.desc()).first()
    
    if not active_ride:
        return {"success": False, "message": "No active rides"}
        
    return {"success": True, "data": active_ride}

@router.get("/bookings/my-rides", status_code=status.HTTP_200_OK)
def get_my_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        bookings = db.query(Booking).filter(Booking.customer_id == current_user.id).all()
        results = []
        for booking in bookings:
            ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
            results.append({
                "booking_id": booking.id,
                "ride_id": booking.ride_id,
                "pickup_location": booking.pickup_location,
                "dropoff_location": booking.dropoff_location,
                "status": booking.status,
                "scheduled_time": booking.scheduled_time,
                "price": ride.price_per_seat if ride else 0,
                "driver_id": ride.driver_id if ride else None
            })
            
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trips/history", status_code=status.HTTP_200_OK)
def get_trip_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        bookings = db.query(Booking).filter(Booking.customer_id == current_user.id).all()
        results = []
        for booking in bookings:
            ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
            driver = db.query(User).filter(User.id == ride.driver_id).first() if ride and ride.driver_id else None
            results.append({
                "booking_id": booking.id,
                "ride_id": booking.ride_id,
                "pickup_location": booking.pickup_location,
                "dropoff_location": booking.dropoff_location,
                "status": booking.status,
                "scheduled_time": booking.scheduled_time,
                "price": ride.price_per_seat if ride else 0,
                "driver_name": getattr(driver, 'full_name', None) or getattr(driver, 'name', None) or "Driver",
                "payment_id": "pay_TEST_" + str((booking.id or 0) * 1049)
            })
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))