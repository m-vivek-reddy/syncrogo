"""Cash ride fee ledger: daily accumulation, settlement, and assignment gating.

Workflow (docs/WORKFLOW.md §6 cash rule):
- Each completed cash ride accrues a CASH_RIDE_FEE row for the driver.
- End of day the driver sees "Today's outstanding" and can settle once.
- Unpaid fees from a PRIOR day pause new ride assignments; today's fees and
  already-active rides are never blocked.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.cash_fee_ledger import CashFeeLedger, ACCRUED, PAID
from app.models.payment import CASH_RIDE_FEE

PAUSED_MESSAGE = "Please clear your outstanding cash-ride fees."


def accrue_cash_fee(db: Session, driver_id: int, booking_id: int, ride_day: datetime, commit: bool = True) -> CashFeeLedger:
    """Record the platform fee for one completed cash ride. Idempotent per booking."""
    existing = db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking_id).with_for_update().first()
    if existing:
        return existing
    # Normalize to midnight UTC of the ride's local day so "day" grouping is stable.
    day = ride_day.replace(hour=0, minute=0, second=0, microsecond=0)
    row = CashFeeLedger(
        driver_id=driver_id,
        booking_id=booking_id,
        ride_date=day,
        amount=Decimal(str(CASH_RIDE_FEE)),
        status=ACCRUED,
    )
    db.add(row)
    try:
        db.flush()
        if commit:
            db.commit()
            db.refresh(row)
    except Exception:
        db.rollback()
        existing = db.query(CashFeeLedger).filter(CashFeeLedger.booking_id == booking_id).first()
        if existing:
            return existing
        raise
    return row


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_outstanding(db: Session, driver_id: int, before_day: datetime | None = None) -> list[CashFeeLedger]:
    """Unpaid ledger rows. Pass before_day to exclude today's accruals."""
    q = db.query(CashFeeLedger).filter(
        CashFeeLedger.driver_id == driver_id,
        CashFeeLedger.status == ACCRUED,
    )
    if before_day is not None:
        q = q.filter(CashFeeLedger.ride_date < before_day)
    return q.order_by(CashFeeLedger.ride_date).all()


def get_daily_summary(db: Session, driver_id: int, day: datetime) -> dict:
    """'Cash Ride Fees' card: today's outstanding, cash ride count, pay action."""
    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    rows = db.query(CashFeeLedger).filter(
        CashFeeLedger.driver_id == driver_id,
        CashFeeLedger.ride_date >= day_start,
        CashFeeLedger.ride_date < day_end,
    ).all()
    outstanding = [r for r in rows if r.status == ACCRUED]
    total = sum((r.amount for r in outstanding), Decimal("0.00"))
    return {
        "date": day_start.date().isoformat(),
        "cash_rides": len(rows),
        "outstanding": total,
        "outstanding_rows": [r.id for r in outstanding],
        "can_pay": total > 0,
    }


def check_driver_assignment_eligibility(db: Session, driver_id: int) -> None:
    """Gate for NEW ride assignments only — raises 402/403-style 402 if a prior
    day's cash fees are unpaid. Today's accruals and active rides are unaffected."""
    today_start = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    overdue = get_outstanding(db, driver_id, before_day=today_start)
    if overdue:
        total = sum((r.amount for r in overdue), Decimal("0.00"))
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": PAUSED_MESSAGE,
                "outstanding": float(total),
                "overdue_days": sorted({r.ride_date.date().isoformat() for r in overdue}),
                "ledger_ids": [r.id for r in overdue],
            },
        )


def settle_cash_fees(db: Session, driver_id: int, commit: bool = True) -> dict:
    """Pay ALL outstanding fees (including today's). Driver remains eligible."""
    # The ACCRUED -> PAID transition is a single conditional UPDATE so it is atomic
    # under concurrency: a second simultaneous settle() call flips zero rows (they
    # are no longer ACCRUED) and returns nothing_to_pay, instead of both calls
    # reading the same rows and double-settling the same debt.
    now = _now()
    settlement_id = f"cashfee_{driver_id}_{now.strftime('%Y%m%d%H%M%S%f')}"

    updated = (
        db.query(CashFeeLedger)
        .filter(
            CashFeeLedger.driver_id == driver_id,
            CashFeeLedger.status == ACCRUED,
        )
        .update(
            {
                CashFeeLedger.status: PAID,
                CashFeeLedger.settled_at: now,
                CashFeeLedger.settlement_id: settlement_id,
            },
            synchronize_session=False,
        )
    )

    if not updated:
        if commit:
            db.rollback()
        return {"status": "nothing_to_pay", "paid_amount": 0.0, "settled": 0}

    # Sum only the rows this settlement actually flipped (server-calculated).
    total = (
        db.query(func.sum(CashFeeLedger.amount))
        .filter(CashFeeLedger.settlement_id == settlement_id)
        .scalar()
    ) or Decimal("0.00")

    if commit:
        db.commit()
    return {
        "status": "PAID",
        "paid_amount": float(total),
        "settled": int(updated),
        "settlement_id": settlement_id,
    }
