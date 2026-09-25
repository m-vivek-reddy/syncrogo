from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Numeric, Integer, String, Boolean, ForeignKey
from app.db.database import Base


# Formal payment status enum: only these states exist and only the transitions
# in PAYMENT_STATUS_TRANSITIONS are allowed.
PENDING = "PENDING"
PROCESSING = "PROCESSING"
PAID = "PAID"
FAILED = "FAILED"
REFUNDED = "REFUNDED"

PAYMENT_STATUS_TRANSITIONS = {
    PENDING: {PROCESSING, PAID, FAILED},
    PROCESSING: {PAID, FAILED},
    PAID: {REFUNDED},
    FAILED: set(),
    REFUNDED: set(),
}


# How the money moved. Digital = gateway-collected post-drop-off.
# CASH = passenger paid the driver directly; the platform fee is recovered
# through the daily cash-fee settlement (see CashFeeLedger).
UPI = "UPI"
CASH = "CASH"

CASH_RIDE_FEE = 10.00  # INR per cash ride, settled at end of day

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

    # Convenience aliases so call sites can use Payment.PENDING etc.
    PENDING = PENDING
    PROCESSING = PROCESSING
    PAID = PAID
    FAILED = FAILED
    REFUNDED = REFUNDED
    UPI = UPI
    CASH = CASH

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    provider = Column(String, nullable=False, default="razorpay")
    provider_payment_id = Column(String, nullable=False, unique=True, index=True)
    provider_order_id = Column(String, nullable=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String, nullable=False, default=PENDING, index=True)
    method = Column(String, nullable=False, default=UPI, index=True)  # UPI | CASH
    refund_status = Column(String, nullable=True, index=True)  # None | REFUND_PENDING | REFUNDED
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def transition_to(self, new_status: str) -> None:
        """Enforce the payment state machine; raises ValueError on illegal transitions."""
        allowed = PAYMENT_STATUS_TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise ValueError(f"Illegal payment transition: {self.status} -> {new_status}")
        self.status = new_status
        if new_status == PAID:
            self.paid_at = datetime.now(timezone.utc)
        if new_status == REFUNDED:
            self.refund_status = "REFUNDED"
            self.refunded_at = datetime.now(timezone.utc)
