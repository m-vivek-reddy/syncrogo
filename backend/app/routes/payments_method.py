from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.models.payment import PaymentMethod
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])

class PaymentCreate(BaseModel):
    card_brand: str
    last_4: str
    expiry_month: int
    expiry_year: int

class PaymentResponse(PaymentCreate):
    id: int
    is_default: bool

    class Config:
        from_attributes = True

@router.get("/methods", response_model=List[PaymentResponse])
def get_payment_methods(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(PaymentMethod).filter(PaymentMethod.user_id == current_user.id).all()

@router.post("/methods", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def add_payment_method(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_card = PaymentMethod(
        user_id=current_user.id,
        card_brand=payment.card_brand,
        last_4=payment.last_4,
        expiry_month=payment.expiry_month,
        expiry_year=payment.expiry_year,
        is_default=False
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card
