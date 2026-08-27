from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, model_validator
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.notification import Notification
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.document import Document
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.ride_service import modify_ride_price
from app.services.pricing_service import calculate_ride_fare


router = APIRouter(
    prefix="/api/v1",
    tags=["Rides & Bookings"],
)


# ============================================================
# RIDE OFFER SCHEMA
# ============================================================

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
    price_per_seat: Optional[float] = None

    # Scheduled departure (timezone-aware ISO 8601 from the client).
    # Optional so existing clients that omit it keep working.
    departure_time: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_price_fields(self):
        if self.distance_km <= 0:
            raise ValueError(
                "The ride distance must be greater than zero."
            )

        if self.discount is not None and self.discount < 0:
            raise ValueError(
                "Discount cannot be negative."
            )

        if self.available_seats <= 0:
            raise ValueError(
                "Available seats must be greater than zero."
            )

        return self


# ============================================================
# RIDE PRICE UPDATE
# ============================================================

class RidePriceUpdate(BaseModel):
    new_price: float

    @model_validator(mode="after")
    def validate_price_limit(self):
        if self.new_price < 0:
            raise ValueError(
                "The new price must be a positive value."
            )

        return self


# ============================================================
# PUBLISH RIDE
# ============================================================

@router.post(
    "/rides/offer",
    status_code=status.HTTP_201_CREATED,
)
def publish_ride_offer(
    offer_data: RideOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_driver_id = current_user.id

    # Verify that driver documents are not pending verification before offering a ride
    user_docs = db.query(Document).filter(Document.user_id == current_driver_id).all()
    pending_docs = [d for d in user_docs if (d.status or "").lower() == "pending"]
    if pending_docs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your driver documents are currently pending verification. You cannot offer a ride until your documents are approved.",
        )
    if not user_docs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must upload and have your driver documents verified before offering a ride.",
        )
    has_approved = any((d.status or "").lower() in ["approved", "verified"] for d in user_docs)
    if not has_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your driver documents have not been approved yet. You cannot offer a ride until your documents are verified.",
        )

    pricing = calculate_ride_fare(
        distance_km=offer_data.distance_km,
        vehicle_type=offer_data.vehicle_type,
        discount=offer_data.discount or 0.0,
    )

    max_allowed = round(pricing["mrp_fare"] * 1.15, 2)
    chosen_price = pricing["final_fare"]

    if offer_data.price_per_seat is not None and offer_data.price_per_seat > 0:
        if offer_data.price_per_seat > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Offered price cannot exceed 15% above the fare price (Maximum allowed: ₹{max_allowed:.2f})."
            )
        chosen_price = offer_data.price_per_seat

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
        final_fare=chosen_price,

        price_per_seat=chosen_price,

        seats_available=offer_data.available_seats,

        gender_preference=offer_data.gender_preference,

        status="published",
    )

    try:
        db.add(new_offer)
        db.commit()
        db.refresh(new_offer)

        return {
            "success": True,
            "ride_id": new_offer.id,
            "message": "Offer published successfully!",
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Database error while publishing offer: "
                f"{str(e)}"
            ),
        )


# ============================================================
# UPDATE RIDE PRICE
# ============================================================

@router.patch(
    "/rides/{ride_id}/price",
    status_code=status.HTTP_200_OK,
)
def update_ride_price(
    ride_id: int,
    price_update: RidePriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated_ride = modify_ride_price(
            db=db,
            ride_id=ride_id,
            new_price=price_update.new_price,
            driver_id=current_user.id,
        )

        return {
            "success": True,
            "ride_id": updated_ride.id,
            "new_price": updated_ride.price_per_seat,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# SEARCH RIDES
# ============================================================

@router.get(
    "/rides/search",
    status_code=status.HTTP_200_OK,
)
def search_rides(
    pickup_lat: float,
    pickup_lon: float,
    db: Session = Depends(get_db),
):
    try:
        import math
        from app.services.matching_service import calculate_distance

        # Bounding box filter (~10km candidate search area)
        lat_delta = 10.0 / 111.0
        cos_lat = math.cos(math.radians(pickup_lat))
        lon_delta = 10.0 / (111.0 * max(0.01, abs(cos_lat)))

        matching_offers = (
            db.query(Ride)
            .filter(
                Ride.status == "published",
                Ride.seats_available > 0,
                Ride.pickup_lat.isnot(None),
                Ride.pickup_lon.isnot(None),
                Ride.pickup_lat.between(
                    pickup_lat - lat_delta, pickup_lat + lat_delta
                ),
                Ride.pickup_lon.between(
                    pickup_lon - lon_delta, pickup_lon + lon_delta
                ),
            )
            .all()
        )

        nearby_rides = []

        for ride in matching_offers:
            distance = calculate_distance(
                pickup_lat,
                pickup_lon,
                ride.pickup_lat,
                ride.pickup_lon,
            )

            if distance <= 10.0:
                nearby_rides.append(ride)

        return {
            "success": True,
            "count": len(nearby_rides),
            "data": nearby_rides,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# BOOK A SEAT
# ============================================================

@router.post(
    "/rides/{ride_id}/book",
    status_code=status.HTTP_200_OK,
)
def book_seat(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ride = (
        db.query(Ride)
        .filter(Ride.id == ride_id)
        .first()
    )

    if not ride:
        raise HTTPException(
            status_code=404,
            detail="Ride not found",
        )

    # Driver cannot book own ride
    if ride.driver_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot book your own ride",
        )

    # ========================================================
    # IMPORTANT FIX:
    #
    # Booking uses passenger_id, NOT customer_id
    # ========================================================

    existing_booking = (
        db.query(Booking)
        .filter(
            Booking.ride_id == ride_id,
            Booking.passenger_id == current_user.id,
        )
        .first()
    )

    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail="You have already booked this ride",
        )

    # Check seats
    if ride.seats_available <= 0:
        raise HTTPException(
            status_code=400,
            detail="Sorry, this ride is full!",
        )

    ride.seats_available -= 1

    if ride.seats_available == 0:
        ride.status = "full"

    try:
        booking = Booking(
            ride_id=ride.id,

            # =================================================
            # FIXED
            # =================================================
            passenger_id=current_user.id,

            pickup_location=ride.origin,
            dropoff_location=ride.destination,

            scheduled_time=datetime.now(timezone.utc),

            status="scheduled",
        )

        db.add(booking)

        db.commit()
        db.refresh(booking)

        return {
            "success": True,
            "message": "Seat successfully booked!",
            "booking_id": booking.id,
            "ride_id": ride.id,
            "seats_left": ride.seats_available,
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}",
        )


# ============================================================
# DRIVER ACTIVE RIDE
# ============================================================

@router.get(
    "/rides/driver/active",
    status_code=status.HTTP_200_OK,
)
def get_active_driver_ride(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_driver_id = current_user.id

    active_ride = (
        db.query(Ride)
        .filter(
            Ride.driver_id == current_driver_id,
            Ride.status.in_(["published", "full", "started", "STARTED"]),
        )
        .order_by(Ride.created_at.desc())
        .first()
    )

    if not active_ride:
        return {
            "success": False,
            "message": "No active rides",
        }

    # Retrieve booked passengers for this specific active ride
    passengers = []
    bookings = (
        db.query(Booking)
        .filter(
            Booking.ride_id == active_ride.id,
            Booking.status.in_(["ACCEPTED", "PENDING", "CONFIRMED", "STARTED", "PICKED_UP", "COMPLETED"])
        )
        .all()
    )
    for b in bookings:
        p_id = b.passenger_id if b.passenger_id else getattr(b, "customer_id", None)
        p_user = db.query(User).filter(User.id == p_id).first() if p_id else None
        if p_user:
            p_name = getattr(p_user, "full_name", None) or getattr(p_user, "name", None) or "Passenger"
            passengers.append({
                "booking_id": b.id,
                "id": p_user.id,
                "passenger_id": p_user.id,
                "name": p_name.split()[0], # Privacy rule: first name
                "phone": p_user.phone,
                "pickup_location": b.pickup_location,
                "pickup_lat": b.pickup_lat,
                "pickup_lon": b.pickup_lon,
                "dropoff_location": b.dropoff_location,
                "dropoff_lat": b.dropoff_lat,
                "dropoff_lon": b.dropoff_lon,
                "status": b.status,
                "otp_code": b.otp_code,
                "otp_verified": b.otp_verified,
            })

    ride_data = {
        "id": active_ride.id,
        "driver_id": active_ride.driver_id,
        "origin": active_ride.origin,
        "destination": active_ride.destination,
        "pickup_lat": active_ride.pickup_lat,
        "pickup_lon": active_ride.pickup_lon,
        "dropoff_lat": active_ride.dropoff_lat,
        "dropoff_lon": active_ride.dropoff_lon,
        "distance_km": active_ride.distance_km,
        "vehicle_type": active_ride.vehicle_type,
        "price_per_seat": active_ride.price_per_seat or active_ride.final_fare,
        "available_seats": active_ride.seats_available,
        "seats_available": active_ride.seats_available,
        "gender_preference": active_ride.gender_preference,
        "status": active_ride.status,
        "created_at": str(active_ride.created_at),
        "passengers": passengers,
    }

    return {
        "success": True,
        "data": ride_data,
    }


def _fetch_user_bookings_with_details(
    db: Session, passenger_id: int, include_driver: bool = False
):
    query_results = (
        db.query(Booking, Ride, User)
        .outerjoin(Ride, Booking.ride_id == Ride.id)
        .outerjoin(User, Ride.driver_id == User.id)
        .filter(Booking.passenger_id == passenger_id)
        .order_by(Booking.created_at.desc())
        .all()
    )

    results = []

    for booking, ride, driver in query_results:
        item = {
            "booking_id": booking.id,
            "ride_id": booking.ride_id,
            "pickup_location": booking.pickup_location,
            "dropoff_location": booking.dropoff_location,
            "status": booking.status,
            "scheduled_time": booking.scheduled_time,
            "price": ride.price_per_seat if ride else 0,
            "driver_id": ride.driver_id if ride else None,
        }

        if include_driver:
            driver_name = "Driver"
            if driver:
                driver_name = (
                    getattr(driver, "full_name", None)
                    or getattr(driver, "name", None)
                    or "Driver"
                )
            item["driver_name"] = driver_name
            item["payment_id"] = f"pay_TEST_{(booking.id or 0) * 1049}"

        results.append(item)

    return results


@router.post("/rides/{ride_id}/start")
def start_driver_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the ride driver can start this ride")

    ride.status = "started"

    # Also update any accepted bookings to STARTED
    bookings = db.query(Booking).filter(Booking.ride_id == ride_id, Booking.status.in_(["ACCEPTED", "CONFIRMED"])).all()
    for b in bookings:
        b.status = "STARTED"
        b.started_at = datetime.utcnow()

    db.commit()
    db.refresh(ride)
    return {"success": True, "message": "Ride started", "status": ride.status}


@router.post("/rides/{ride_id}/complete")
def complete_driver_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the ride driver can complete this ride")

    ride.status = "completed"

    # Complete all remaining active bookings for this ride
    bookings = db.query(Booking).filter(Booking.ride_id == ride_id, Booking.status.in_(["ACCEPTED", "CONFIRMED", "STARTED", "PICKED_UP"])).all()
    for b in bookings:
        b.status = "COMPLETED"
        b.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(ride)
    return {"success": True, "message": "Entire ride completed", "status": ride.status}


@router.delete("/rides/{ride_id}")
def remove_driver_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the ride driver can remove this ride")

    ride_status = (ride.status or "").lower()
    if ride_status in {"started", "completed"}:
        raise HTTPException(status_code=400, detail="Started or completed rides cannot be removed")

    bookings = db.query(Booking).filter(Booking.ride_id == ride_id).all()
    if any((b.status or "").upper() in {"STARTED", "PICKED_UP", "COMPLETED"} for b in bookings):
        raise HTTPException(status_code=400, detail="Ride with started or completed passengers cannot be removed")

    ride.status = "cancelled"
    for booking in bookings:
        if (booking.status or "").upper() != "CANCELLED":
            booking.status = "CANCELLED"
            db.add(Notification(
                user_id=booking.passenger_id,
                title="Ride cancelled",
                body=f"Your ride from {ride.origin} to {ride.destination} was removed by the driver.",
                is_read=False,
            ))

    db.commit()
    return {"success": True, "message": "Ride removed", "status": ride.status}


# ============================================================
# MY BOOKINGS
# ============================================================

@router.get(
    "/bookings/my-rides",
    status_code=status.HTTP_200_OK,
)
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        results = _fetch_user_bookings_with_details(
            db, current_user.id, include_driver=False
        )
        return {
            "success": True,
            "data": results,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.get(
    "/driver/trips",
    status_code=status.HTTP_200_OK,
)
def get_driver_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rides = (
        db.query(Ride)
        .filter(Ride.driver_id == current_user.id)
        .order_by(Ride.created_at.desc())
        .all()
    )

    results = []
    for ride in rides:
        passenger_count = (
            db.query(Booking)
            .filter(
                Booking.ride_id == ride.id,
                Booking.status != "CANCELLED",
            )
            .count()
        )
        results.append({
            "id": ride.id,
            "ride_id": ride.id,
            "driver_id": ride.driver_id,
            "pickup_location": ride.origin,
            "dropoff_location": ride.destination,
            "status": ride.status,
            "scheduled_time": ride.departure_time or ride.created_at,
            "price": ride.price_per_seat or ride.final_fare,
            "seats_available": ride.seats_available,
            "passenger_count": passenger_count,
            "distance_km": ride.distance_km,
            "type": "driver",
        })

    return {
        "success": True,
        "data": results,
    }


# ============================================================
# TRIP HISTORY
# ============================================================

@router.get(
    "/trips/history",
    status_code=status.HTTP_200_OK,
)
def get_trip_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        results = _fetch_user_bookings_with_details(
            db, current_user.id, include_driver=True
        )
        return {
            "success": True,
            "data": results,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
