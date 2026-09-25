from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.cash_fee_ledger import CashFeeLedger
from app.routes.user import get_current_user
from app.services.cash_fee_service import (
    check_driver_assignment_eligibility,
    get_daily_summary,
    get_outstanding,
    settle_cash_fees,
)

router = APIRouter(prefix="/payments/cash-fees", tags=["Payments"])


def _driver_only(current_user) -> int:
    if getattr(current_user, "role", None) not in (None, "driver"):
        raise HTTPException(status_code=403, detail="Only drivers have cash-ride fees.")
    return current_user.id


@router.get("/summary")
def daily_summary(day: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """'Cash Ride Fees' card: today's outstanding, cash ride count, [Pay ₹X]."""
    driver_id = _driver_only(current_user)
    day_dt = datetime.fromisoformat(day) if day else datetime.now(timezone.utc)
    return get_daily_summary(db, driver_id, day_dt)


@router.get("/outstanding")
def outstanding_fees(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """All unpaid ledger rows, grouped view for the settlement screen."""
    driver_id = _driver_only(current_user)
    rows = get_outstanding(db, driver_id)
    total = sum((r.amount for r in rows), 0)
    return {
        "outstanding": float(total),
        "rows": [
            {"id": r.id, "booking_id": r.booking_id, "ride_date": r.ride_date.date().isoformat(), "amount": float(r.amount)}
            for r in rows
        ],
    }


@router.get("/eligibility")
def assignment_eligibility(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Whether NEW ride assignments are paused for this driver (prior-day unpaid fees)."""
    driver_id = _driver_only(current_user)
    try:
        check_driver_assignment_eligibility(db, driver_id)
        return {"eligible": True, "paused": False}
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
        return {"eligible": False, "paused": True, **detail}


@router.post("/settle")
def settle(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Driver pays the accumulated cash-ride fees. Unlocks new ride assignments."""
    driver_id = _driver_only(current_user)
    return settle_cash_fees(db, driver_id)


@router.get("/history")
def ledger_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    driver_id = _driver_only(current_user)
    rows = db.query(CashFeeLedger).filter(CashFeeLedger.driver_id == driver_id).order_by(CashFeeLedger.ride_date.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "booking_id": r.booking_id,
            "ride_date": r.ride_date.date().isoformat(),
            "amount": float(r.amount),
            "status": r.status,
            "settled_at": r.settled_at.isoformat() if r.settled_at else None,
            "settlement_id": r.settlement_id,
        }
        for r in rows
    ]
