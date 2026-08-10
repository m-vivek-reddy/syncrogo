from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=True)

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    phone = Column(String, nullable=True)

    password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default="customer"
    )

    is_online = Column(
        Boolean,
        default=False
    )

    vehicle_type = Column(
        String,
        nullable=True
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    is_verified = Column(
        Boolean,
        default=False
    )

    # OTP
    otp_code = Column(
        String,
        nullable=True
    )

    otp_expires_at = Column(
        DateTime,
        nullable=True
    )


    # Wallet relationship
    wallet = relationship(
        "Wallet",
        back_populates="user",
        uselist=False
    )


    # Emergency contacts relationship
    emergency_contacts = relationship(
        "EmergencyContact",
        back_populates="user",
        cascade="all, delete-orphan"
    )


    @property
    def name(self):
        return self.full_name