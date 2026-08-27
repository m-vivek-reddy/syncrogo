import random
from datetime import datetime
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.booking import Booking
from app.models.notification import Notification
from app.models.ride import Ride
from app.schemas.booking import (
    BookingCreate,
    VerifyOTP,
    LocationUpdate,
)
from app.routes.user import get_current_user

router = APIRouter(
    prefix="/api/v1/bookings",
    tags=["Bookings"],
)


# ============================================================
# CREATE BOOKING
# ============================================================

@router.post("")
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ride = (
        db.query(Ride)
        .filter(Ride.id == data.ride_id)
        .first()
    )

    if not ride:
        raise HTTPException(
            status_code=404,
            detail="Ride not found",
        )

    # Prevent driver from booking their own ride
    if ride.driver_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot book your own ride",
        )

    if ride.status not in {"available", "published"} or ride.seats_available <= 0:
        raise HTTPException(status_code=400, detail="Ride is no longer available")

    existing = db.query(Booking).filter(
        Booking.ride_id == ride.id,
        Booking.passenger_id == current_user.id,
        Booking.status != "CANCELLED",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a booking for this ride")

    passenger_name = current_user.full_name or getattr(current_user, "name", None) or current_user.email or "A passenger"
    booking = Booking(
        ride_id=ride.id,

        passenger_id=current_user.id,
        driver_id=ride.driver_id,

        pickup_location=ride.origin,
        pickup_lat=ride.pickup_lat,
        pickup_lon=ride.pickup_lon,

        dropoff_location=ride.destination,
        dropoff_lat=ride.dropoff_lat,
        dropoff_lon=ride.dropoff_lon,

        fare=ride.final_fare or ride.price_per_seat,

        status="PENDING",

        # Boolean
        otp_verified=False,
    )

    ride.seats_available -= 1
    if ride.seats_available == 0:
        ride.status = "full"
    db.add(booking)
    db.add(Notification(
        user_id=ride.driver_id,
        title="New ride booking",
        body=f"{passenger_name} booked your ride from {ride.origin} to {ride.destination}.",
        is_read=False,
    ))
    db.commit()
    db.refresh(booking)

    return {
        "success": True,
        "message": "Ride booking requested",
        "data": booking,
    }


# ============================================================
# DRIVER ACCEPTS BOOKING
# ============================================================

@router.post("/{booking_id}/accept")
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.driver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not the driver for this booking",
        )

    if booking.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Booking cannot be accepted",
        )

    # Generate OTP only after driver accepts
    otp = str(random.randint(100000, 999999))

    booking.status = "ACCEPTED"
    booking.otp_code = otp
    booking.otp_verified = False

    db.commit()
    db.refresh(booking)

    return {
        "success": True,
        "message": "Booking accepted",
        "data": {
            "booking_id": booking.id,
            "status": booking.status,
        },
    }


# ============================================================
# PASSENGER GETS OTP
# ============================================================

@router.get("/{booking_id}/otp")
def get_booking_otp(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.passenger_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not your booking",
        )

    if booking.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="OTP is not available yet",
        )

    return {
        "success": True,
        "booking_id": booking.id,
        "otp": booking.otp_code,
    }


# ============================================================
# DRIVER VERIFIES OTP
# ============================================================

@router.post("/{booking_id}/verify-otp")
def verify_booking_otp(
    booking_id: int,
    data: VerifyOTP,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.driver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the driver can verify the OTP",
        )

    if booking.status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="Ride is not ready to start",
        )

    if not booking.otp_code:
        raise HTTPException(
            status_code=400,
            detail="OTP has not been generated",
        )

    if booking.otp_code != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    booking.otp_verified = True
    booking.status = "STARTED"
    booking.started_at = datetime.utcnow()

    db.commit()
    db.refresh(booking)

    return {
        "success": True,
        "message": "OTP verified. Ride started.",
        "data": {
            "booking_id": booking.id,
            "status": booking.status,
            "started_at": booking.started_at,
        },
    }


# ============================================================
# UPDATE DRIVER LOCATION
# ============================================================

@router.post("/{booking_id}/driver-location")
def update_driver_location(
    booking_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.driver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not the driver",
        )

    if booking.status != "STARTED":
        raise HTTPException(
            status_code=400,
            detail="Ride has not started",
        )

    booking.driver_lat = data.latitude
    booking.driver_lon = data.longitude

    db.commit()

    return {
        "success": True,
        "message": "Driver location updated",
        "data": {
            "latitude": booking.driver_lat,
            "longitude": booking.driver_lon,
        },
    }


# ============================================================
# UPDATE PASSENGER LOCATION
# ============================================================

@router.post("/{booking_id}/passenger-location")
def update_passenger_location(
    booking_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.passenger_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not the passenger",
        )

    if booking.status != "STARTED":
        raise HTTPException(
            status_code=400,
            detail="Ride has not started",
        )

    booking.passenger_lat = data.latitude
    booking.passenger_lon = data.longitude

    db.commit()

    return {
        "success": True,
        "message": "Passenger location updated",
        "data": {
            "latitude": booking.passenger_lat,
            "longitude": booking.passenger_lon,
        },
    }


# ============================================================
# GET LIVE BOOKING
# ============================================================

@router.get("/{booking_id}/live")
def get_live_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if current_user.id not in [
        booking.driver_id,
        booking.passenger_id,
    ]:
        raise HTTPException(
            status_code=403,
            detail="Not part of this ride",
        )

    ride = booking.ride
    driver_user = ride.driver if ride else None
    if not driver_user:
        driver_user = db.query(User).filter(User.id == booking.driver_id).first()

    all_ride_bookings = (
        db.query(Booking)
        .filter(
            Booking.ride_id == booking.ride_id,
            Booking.status.in_(["ACCEPTED", "CONFIRMED", "STARTED", "COMPLETED", "PENDING"])
        )
        .all()
    ) if booking.ride_id else [booking]

    passengers_list = []
    for idx, b in enumerate(all_ride_bookings):
        p_user = b.passenger
        p_name = f"Passenger {idx + 1}"
        if p_user and getattr(p_user, "name", None):
            p_name = p_user.name.split()[0]
        elif p_user and getattr(p_user, "full_name", None):
            p_name = p_user.full_name.split()[0]

        passengers_list.append({
            "booking_id": b.id,
            "passenger_id": b.passenger_id,
            "name": p_name,
            "is_current_user": b.passenger_id == current_user.id,
            "pickup_location": b.pickup_location,
            "latitude": b.pickup_lat,
            "longitude": b.pickup_lon,
            "dropoff_location": b.dropoff_location,
            "dropoff_lat": b.dropoff_lat,
            "dropoff_lon": b.dropoff_lon,
            "status": b.status,
        })

    driver_name = "Driver"
    if driver_user and getattr(driver_user, "name", None):
        driver_name = driver_user.name
    elif driver_user and getattr(driver_user, "full_name", None):
        driver_name = driver_user.full_name

    return {
        "success": True,
        "data": {
            "booking_id": booking.id,
            "ride_id": booking.ride_id,
            "status": booking.status,
            "otp_code": booking.otp_code if current_user.id == booking.passenger_id else None,
            "otp_verified": booking.otp_verified,
            "fare": booking.fare,

            "driver_start": {
                "name": ride.origin if (ride and ride.origin) else booking.pickup_location,
                "latitude": ride.pickup_lat if (ride and ride.pickup_lat) else booking.pickup_lat,
                "longitude": ride.pickup_lon if (ride and ride.pickup_lon) else booking.pickup_lon,
            },

            "driver_destination": {
                "name": ride.destination if (ride and ride.destination) else booking.dropoff_location,
                "latitude": ride.dropoff_lat if (ride and ride.dropoff_lat) else booking.dropoff_lat,
                "longitude": ride.dropoff_lon if (ride and ride.dropoff_lon) else booking.dropoff_lon,
            },

            "driver_current_location": {
                "latitude": booking.driver_lat,
                "longitude": booking.driver_lon,
            } if (booking.driver_lat and booking.driver_lon) else None,

            "passengers": passengers_list,

            "driver_info": {
                "id": booking.driver_id,
                "name": driver_name,
                "phone": getattr(driver_user, "phone", "") if driver_user else "",
                "rating": getattr(driver_user, "rating", None),
                "vehicle": getattr(ride, "vehicle_type", "Car") if ride else "Car",
                "vehicle_number": getattr(driver_user, "vehicle_number", "") if driver_user else "",
            },

            "ride_info": {
                "price_per_seat": ride.price_per_seat if (ride and ride.price_per_seat) else booking.fare,
                "available_seats": ride.seats_available if (ride and ride.seats_available is not None) else 0,
                "distance_km": ride.distance_km if ride else None,
            },

            "started_at": str(booking.started_at) if booking.started_at else None,
            "completed_at": str(booking.completed_at) if booking.completed_at else None,
        },
    }


# ============================================================
# COMPLETE RIDE
# ============================================================

@router.post("/{booking_id}/complete")
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.driver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only driver can complete ride",
        )

    if booking.status != "STARTED":
        raise HTTPException(
            status_code=400,
            detail="Ride is not currently active",
        )

    if not booking.otp_verified:
        raise HTTPException(
            status_code=400,
            detail="OTP has not been verified",
        )

    booking.status = "COMPLETED"
    booking.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(booking)

    return {
        "success": True,
        "message": "Ride completed. Payment can now be processed.",
        "data": {
            "booking_id": booking.id,
            "status": booking.status,
            "completed_at": booking.completed_at,
            "fare": booking.fare,
        },
    }


@router.get("/mine")
def my_bookings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    bookings = db.query(Booking).filter(Booking.passenger_id == current_user.id).order_by(Booking.created_at.desc()).all()
    return {"success": True, "data": bookings}


@router.get("/driver/mine")
def driver_bookings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    bookings = db.query(Booking).filter(Booking.driver_id == current_user.id).order_by(Booking.created_at.desc()).all()
    return {"success": True, "data": bookings}


@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.passenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the booking passenger can cancel")
    if booking.status not in {"PENDING", "ACCEPTED"}:
        raise HTTPException(status_code=400, detail="This booking can no longer be cancelled")

    booking.status = "CANCELLED"
    ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
    if ride:
        ride.seats_available += 1
        if ride.status == "full":
            ride.status = "published"
    db.commit()
    return {"success": True, "message": "Booking cancelled", "status": booking.status}


class OTPRequest(BaseModel):
    otp: str


@router.post("/{booking_id}/verify-otp")
def verify_booking_otp(
    booking_id: int,
    payload: OTPRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the driver can verify passenger OTP")

    if booking.otp_code and payload.otp.strip() != booking.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check with passenger.")

    booking.otp_verified = "true"
    booking.status = "PICKED_UP"
    db.commit()
    db.refresh(booking)
    return {"success": True, "message": "Passenger OTP verified. Pickup confirmed!", "status": booking.status}


@router.post("/{booking_id}/complete-passenger")
def complete_passenger_journey(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the driver can complete passenger journey")

    booking.status = "COMPLETED"
    booking.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)
    return {"success": True, "message": "Passenger journey completed!", "status": booking.status}
