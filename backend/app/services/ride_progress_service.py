"""Dynamic trip progress: distance and fare shrink as the driver moves.

A published ride carries a fixed pickup -> dropoff distance. While the driver
is still travelling towards the pickup point (no passenger onboard yet), the
trip that will actually be sold is shorter: the distance already covered by
the driver is deducted, and the fare is recalculated from the remainder.

The moment a passenger books, the price is locked so the driver cannot change
what a passenger agreed to pay simply by driving closer.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.ride import Ride
from app.services.matching_service import calculate_distance
from app.services.pricing_service import calculate_ride_fare

# Passenger statuses that count as "onboard" and therefore lock the fare.
ACTIVE_BOOKING_STATUSES = ("PENDING", "ACCEPTED", "CONFIRMED", "STARTED", "PICKED_UP")


def has_active_bookings(db: Session, ride: Ride) -> bool:
    """True once at least one non-cancelled passenger booking exists."""
    count = (
        db.query(Booking.id)
        .filter(
            Booking.ride_id == ride.id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
        .count()
    )
    return count > 0


def lock_ride_price(db: Session, ride: Ride) -> Ride:
    """Freeze the current distance/fare so later movement cannot alter it."""
    ride.locked_distance_km = float(ride.distance_km or 0.0)
    ride.locked_fare = ride.final_fare
    db.flush()
    return ride


def compute_remaining_distance(ride: Ride) -> float:
    """Remaining travel distance for the driver, given their live position.

    remaining = distance(vehicle -> pickup) + distance(pickup -> dropoff)

    Falls back to the stored distance when the driver position is unknown.
    """
    base = float(ride.distance_km or 0.0)

    if ride.driver_lat is None or ride.driver_lon is None:
        return base

    if ride.pickup_lat is None or ride.pickup_lon is None:
        return base

    approach_km = calculate_distance(
        ride.driver_lat, ride.driver_lon, ride.pickup_lat, ride.pickup_lon
    )

    # A GPS fix more than the full remaining route away (or a bad fix) means we
    # cannot trust the subtraction, so keep the authoritative total.
    if approach_km > base:
        return base

    return round(base - approach_km, 2)


def recalculate_ride_distance_and_fare(db: Session, ride: Ride) -> dict:
    """Recompute ``distance_km`` and the fare fields from driver progress.

    No-ops once the price is locked (a passenger is booked), so the amount a
    passenger agreed to never changes mid-trip.
    """
    if ride.locked_fare is not None:
        return {
            "updated": False,
            "reason": "locked",
            "distance_km": float(ride.distance_km or 0.0),
            "fare": float(ride.final_fare or 0.0),
        }

    if ride.status not in ("published", "available", "full"):
        return {
            "updated": False,
            "reason": "status",
            "distance_km": float(ride.distance_km or 0.0),
            "fare": float(ride.final_fare or 0.0),
        }

    # Never let a stale driver position zero the trip out: the pickup ->
    # dropoff leg is always still ahead.
    floor_km = 0.1
    remaining = max(compute_remaining_distance(ride), floor_km)

    previous_distance = float(ride.distance_km or 0.0)
    previous_fare = float(ride.final_fare or 0.0)

    if abs(remaining - previous_distance) < 0.01:
        return {
            "updated": False,
            "reason": "unchanged",
            "distance_km": previous_distance,
            "fare": previous_fare,
        }

    vehicle_type = (ride.vehicle_type or "car").lower()
    discount = float(ride.discount or 0.0)

    pricing = calculate_ride_fare(
        distance_km=remaining,
        vehicle_type=vehicle_type,
        discount=discount,
    )

    # A driver-set price above the MRP is preserved, but never re-inflated:
    # the price can only stay flat or go down as the driver gets closer.
    fare = min(previous_fare, float(pricing["final_fare"]))

    ride.distance_km = remaining
    ride.per_km_rate = pricing["per_km_rate"]
    ride.platform_fee = pricing["platform_fee"]
    ride.mrp_fare = pricing["mrp_fare"]
    ride.final_fare = fare
    ride.price_per_seat = fare

    db.flush()

    return {
        "updated": True,
        "reason": "driver_moved",
        "distance_km": remaining,
        "fare": fare,
        "distance_saved_km": round(previous_distance - remaining, 2),
        "fare_saved": round(previous_fare - fare, 2),
    }


def update_driver_position(
    db: Session,
    ride: Ride,
    driver_id: int,
    lat: float,
    lon: float,
) -> dict:
    """Record the driver's live position and refresh the remaining trip."""
    if ride.driver_id != driver_id:
        raise HTTPException(status_code=403, detail="Only the driver can update this ride's location")

    ride.driver_lat = lat
    ride.driver_lon = lon
    ride.location_updated_at = datetime.now(timezone.utc)

    progress = recalculate_ride_distance_and_fare(db, ride)

    db.commit()
    db.refresh(ride)

    progress["pickup_distance_km"] = (
        round(
            calculate_distance(lat, lon, ride.pickup_lat, ride.pickup_lon),
            2,
        )
        if ride.pickup_lat is not None and ride.pickup_lon is not None
        else None
    )
    progress["driver_location"] = {"latitude": lat, "longitude": lon}
    progress["price_locked"] = ride.locked_fare is not None

    return progress