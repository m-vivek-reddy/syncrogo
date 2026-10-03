from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Float,
    Integer,
    String,
    Numeric,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Ride(Base):
    __tablename__ = "rides"

    # =========================================================
    # PRIMARY KEY
    # =========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =========================================================
    # DRIVER
    # =========================================================

    driver_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # =========================================================
    # ROUTE
    # =========================================================

    origin = Column(
        String,
        nullable=False,
    )

    destination = Column(
        String,
        nullable=False,
    )

    departure_time = Column(
        DateTime,
        nullable=True,
    )

    # =========================================================
    # PICKUP COORDINATES
    # =========================================================

    pickup_lat = Column(
        Float,
        nullable=True,
    )

    pickup_lon = Column(
        Float,
        nullable=True,
    )

    # =========================================================
    # DROPOFF COORDINATES
    # =========================================================

    dropoff_lat = Column(
        Float,
        nullable=True,
    )

    dropoff_lon = Column(
        Float,
        nullable=True,
    )

    # =========================================================
    # PREFERENCE
    # =========================================================

    gender_preference = Column(
        String,
        default="any",
    )

    # =========================================================
    # DISTANCE
    # =========================================================

    distance_km = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    # =========================================================
    # DRIVER LIVE POSITION
    # =========================================================
    # While the driver travels towards the pickup point, the remaining
    # trip distance (and therefore the fare) shrinks. These columns hold the
    # driver's latest reported position for that calculation.

    driver_lat = Column(
        Float,
        nullable=True,
    )

    driver_lon = Column(
        Float,
        nullable=True,
    )

    location_updated_at = Column(
        DateTime,
        nullable=True,
    )

    # Distance snapshot the fare was locked at, once a passenger is onboard.
    locked_distance_km = Column(
        Float,
        nullable=True,
    )

    locked_fare = Column(
        Numeric(10, 2),
        nullable=True,
    )

    # =========================================================
    # VEHICLE
    # =========================================================

    vehicle_type = Column(
        String,
        nullable=False,
        default="car",
    )

    # =========================================================
    # PRICING
    # =========================================================

    price_per_seat = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    base_fare = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    per_km_rate = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    platform_fee = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    mrp_fare = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    minimum_fare = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    discount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    final_fare = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
    )

    # =========================================================
    # SEATS
    # =========================================================

    seats_available = Column(
        Integer,
        nullable=False,
        default=1,
    )

    # =========================================================
    # RIDE STATUS
    # =========================================================
    #
    # available
    # published
    # full
    # started
    # completed
    # cancelled
    #

    status = Column(
        String,
        default="available",
        index=True,
    )

    # =========================================================
    # CREATED AT
    # =========================================================

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # =========================================================
    # DRIVER RELATIONSHIP
    # =========================================================

    driver = relationship(
        "User",
        foreign_keys=[driver_id],
        backref="rides",
    )

    # =========================================================
    # BOOKING RELATIONSHIP
    # =========================================================

    bookings = relationship(
        "Booking",
        foreign_keys="Booking.ride_id",
        back_populates="ride",
        cascade="all, delete-orphan",
    )