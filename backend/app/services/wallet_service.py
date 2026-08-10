from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.wallet import Wallet, Transaction, TransactionType, TransactionStatus


def get_or_create_wallet(db: Session, user_id: int) -> Wallet:
    """Retrieve a user's wallet, or create one if it doesn't exist."""
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0, pending_balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def credit_driver_earnings(db: Session, driver_id: int, amount: float, ride_id: str) -> Wallet:
    """Credit a driver's wallet after a successful ride payment and record the transaction."""
    wallet = get_or_create_wallet(db, driver_id)
    wallet.balance += amount

    transaction = Transaction(
        wallet_id=wallet.id,
        amount=amount,
        type=TransactionType.CREDIT,
        status=TransactionStatus.COMPLETED,
        reference_id=f"ride_{ride_id}"
    )

    db.add(transaction)
    db.commit()
    db.refresh(wallet)
    return wallet


def request_withdrawal(db: Session, user_id: int, amount: float) -> Transaction:
    """Handle a driver withdrawal request."""
    wallet = get_or_create_wallet(db, user_id)
    if wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient wallet balance for withdrawal."
        )

    wallet.balance -= amount
    wallet.pending_balance += amount

    transaction = Transaction(
        wallet_id=wallet.id,
        amount=amount,
        type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        reference_id=f"withdrawal_{user_id}_{amount}"
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction
