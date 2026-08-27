from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
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
        Float,
        nullable=False,
        default=0.0,
    )

    base_fare = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    per_km_rate = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    platform_fee = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    mrp_fare = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    minimum_fare = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    discount = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    final_fare = Column(
        Float,
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