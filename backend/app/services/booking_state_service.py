from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.ride import Ride


COMPLETION_STATES = {"STARTED", "PICKED_UP"}
TERMINAL_STATES = {"COMPLETED", "PAID", "CANCELLED"}


def _require_verified_otp(booking: Booking) -> None:
    if not booking.otp_verified:
        raise HTTPException(
            status_code=400,
            detail="OTP has not been verified",
        )


def complete_booking_transition(booking: Booking) -> Booking:
    """Apply the only valid booking -> COMPLETED transition."""
    if booking.status in TERMINAL_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"Booking cannot be completed from {booking.status} status",
        )

    if booking.status not in COMPLETION_STATES:
        raise HTTPException(
            status_code=400,
            detail="Booking is not ready to be completed",
        )

    _require_verified_otp(booking)

    booking.status = "COMPLETED"
    booking.completed_at = datetime.utcnow()

    return booking


def complete_booking_for_driver(
    db: Session,
    booking_id: int,
    driver_id: int,
) -> Booking:
    """Lock, authorize, validate, and complete one booking atomically."""
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .with_for_update()
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    if booking.driver_id != driver_id:
        raise HTTPException(
            status_code=403,
            detail="Only the driver can complete this booking",
        )

    complete_booking_transition(booking)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(booking)
    return booking


def complete_ride_bookings(
    db: Session,
    ride_id: int,
    driver_id: int,
) -> tuple[Ride, list[Booking]]:
    """Validate all active bookings, then complete them in one transaction."""
    ride = (
        db.query(Ride)
        .filter(Ride.id == ride_id)
        .with_for_update()
        .first()
    )

    if not ride:
        raise HTTPException(
            status_code=404,
            detail="Ride not found",
        )

    if ride.driver_id != driver_id:
        raise HTTPException(
            status_code=403,
            detail="Only the ride driver can complete this ride",
        )

    bookings = (
        db.query(Booking)
        .filter(
            Booking.ride_id == ride_id,
            Booking.status.in_(
                ["ACCEPTED", "CONFIRMED", "STARTED", "PICKED_UP"]
            ),
        )
        .with_for_update()
        .all()
    )

    # Validate every booking before changing any status.
    for booking in bookings:
        if booking.status == "CONFIRMED":
            raise HTTPException(
                status_code=400,
                detail=f"Booking {booking.id} is not ready to be completed",
            )

        if booking.status not in COMPLETION_STATES:
            raise HTTPException(
                status_code=400,
                detail=f"Booking {booking.id} is not ready to be completed",
            )

        _require_verified_otp(booking)

    try:
        for booking in bookings:
            complete_booking_transition(booking)

        ride.status = "completed"
        db.commit()

    except Exception:
        db.rollback()
        raise

    for booking in bookings:
        db.refresh(booking)

    db.refresh(ride)

    return ride, bookings