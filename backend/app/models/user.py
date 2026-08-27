from sqlalchemy import (
    Boolean,
    Column,
    Float,
    Integer,
    String,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    # =========================================================
    # PRIMARY KEY
    # =========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # =========================================================
    # BASIC USER INFORMATION
    # =========================================================

    full_name = Column(
        String,
        nullable=True,
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    phone = Column(
        String,
        nullable=True,
    )

    profile_photo_url = Column(
        String,
        nullable=True,
    )

    password = Column(
        String,
        nullable=False,
    )

    # =========================================================
    # USER ROLE
    # =========================================================

    role = Column(
        String,
        default="customer",
    )

    # =========================================================
    # DRIVER / ONLINE STATUS
    # =========================================================

    is_online = Column(
        Boolean,
        default=False,
    )

    vehicle_type = Column(
        String,
        nullable=True,
    )

    # =========================================================
    # CURRENT USER LOCATION
    # =========================================================

    latitude = Column(
        Float,
        nullable=True,
    )

    longitude = Column(
        Float,
        nullable=True,
    )

    # =========================================================
    # ACCOUNT TIMESTAMP
    # =========================================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # =========================================================
    # VERIFICATION
    # =========================================================

    is_verified = Column(
        Boolean,
        default=False,
    )

    # =========================================================
    # OTP
    # =========================================================

    otp_code = Column(
        String,
        nullable=True,
    )

    otp_expires_at = Column(
        DateTime,
        nullable=True,
    )

    # =========================================================
    # WALLET
    # =========================================================

    wallet = relationship(
        "Wallet",
        back_populates="user",
        uselist=False,
    )

    # =========================================================
    # EMERGENCY CONTACTS
    # =========================================================

    emergency_contacts = relationship(
        "EmergencyContact",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # =========================================================
    # BOOKINGS AS PASSENGER
    # =========================================================
    #
    # Booking.passenger_id -> User.id
    #

    passenger_bookings = relationship(
        "Booking",
        foreign_keys="Booking.passenger_id",
        back_populates="passenger",
        cascade="all, delete-orphan",
    )

    # =========================================================
    # BOOKINGS AS DRIVER
    # =========================================================
    #
    # Booking.driver_id -> User.id
    #

    driver_bookings = relationship(
        "Booking",
        foreign_keys="Booking.driver_id",
        back_populates="driver",
        cascade="all, delete-orphan",
    )

    # =========================================================
    # NAME PROPERTY
    # =========================================================

    @property
    def name(self):
        return self.full_name
