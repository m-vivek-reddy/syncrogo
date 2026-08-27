from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Booking(Base):
    __tablename__ = "bookings"

    # =========================================================
    # PRIMARY KEY
    # =========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =========================================================
    # RIDE
    # =========================================================

    ride_id = Column(
        Integer,
        ForeignKey("rides.id"),
        nullable=False,
        index=True,
    )

    # =========================================================
    # PASSENGER
    # =========================================================

    passenger_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
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
    # PICKUP LOCATION
    # =========================================================

    pickup_location = Column(
        String,
        nullable=False,
    )

    pickup_lat = Column(
        Float,
        nullable=False,
    )

    pickup_lon = Column(
        Float,
        nullable=False,
    )

    # =========================================================
    # DROPOFF LOCATION
    # =========================================================

    dropoff_location = Column(
        String,
        nullable=False,
    )

    dropoff_lat = Column(
        Float,
        nullable=False,
    )

    dropoff_lon = Column(
        Float,
        nullable=False,
    )

    # =========================================================
    # FARE
    # =========================================================

    fare = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    # =========================================================
    # BOOKING STATUS
    # =========================================================
    #
    # PENDING
    # ACCEPTED
    # STARTED
    # COMPLETED
    # CANCELLED
    #

    status = Column(
        String,
        nullable=False,
        default="PENDING",
        index=True,
    )

    # =========================================================
    # OTP
    # =========================================================

    otp_code = Column(
        String,
        nullable=True,
    )

    otp_verified = Column(
        String,
        nullable=False,
        default="false",
    )

    # =========================================================
    # PASSENGER LIVE LOCATION
    # =========================================================

    passenger_lat = Column(
        Float,
        nullable=True,
    )

    passenger_lon = Column(
        Float,
        nullable=True,
    )

    # =========================================================
    # DRIVER LIVE LOCATION
    # =========================================================

    driver_lat = Column(
        Float,
        nullable=True,
    )

    driver_lon = Column(
        Float,
        nullable=True,
    )

    # =========================================================
    # RIDE TIMESTAMPS
    # =========================================================

    started_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # =========================================================
    # RELATIONSHIPS
    # =========================================================

    ride = relationship(
        "Ride",
        foreign_keys=[ride_id],
        back_populates="bookings",
    )

    passenger = relationship(
        "User",
        foreign_keys=[passenger_id],
        back_populates="passenger_bookings",
    )

    driver = relationship(
        "User",
        foreign_keys=[driver_id],
        back_populates="driver_bookings",
    )