from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Numeric, Integer, String, ForeignKey, Index
from app.db.database import Base

from app.models.payment import CASH_RIDE_FEE

# Ledger row lifecycle: ACCRUED (cash ride completed, fee owed) -> PAID (settled).
ACCRUED = "ACCRUED"
PAID = "PAID"


class CashFeeLedger(Base):
    """One row per cash ride, tracking the platform's daily fee from the driver.

    Cash rides mean the passenger pays the driver directly, so SyncroGo's fee
    accumulates here and is settled at end of day. Unpaid fees from a prior day
    pause NEW ride assignments for that driver (never active rides).
    """

    __tablename__ = "cash_fee_ledger"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True, index=True)
    ride_date = Column(DateTime(timezone=True), nullable=False, index=True)  # local ride day (00:00 of that day)
    amount = Column(Numeric(10, 2), nullable=False, default=CASH_RIDE_FEE)
    status = Column(String, nullable=False, default=ACCRUED, index=True)  # ACCRUED | PAID
    settled_at = Column(DateTime(timezone=True), nullable=True)
    settlement_id = Column(String, nullable=True, index=True)  # groups one day's settlement payment
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_cash_fee_driver_date_status", "driver_id", "ride_date", "status"),
    )
