from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Boolean, ForeignKey
from app.db.database import Base

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_brand = Column(String, nullable=False)
    last_4 = Column(String, nullable=False)
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    is_default = Column(Boolean, default=False)


class Payment(Base):
    """A provider payment for one completed booking."""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    provider = Column(String, nullable=False, default="razorpay")
    provider_payment_id = Column(String, nullable=False, unique=True, index=True)
    provider_order_id = Column(String, nullable=True, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="PENDING", index=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
