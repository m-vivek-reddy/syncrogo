"""Convert monetary columns from Float to Numeric(10,2).

Revision ID: 011_money_numeric
Revises: 010_add_booking_payments
"""

from alembic import op
import sqlalchemy as sa


revision = "011_money_numeric"
down_revision = ("010_add_booking_payments", "011_add_user_profile_photo_url")
branch_labels = None
depends_on = None


def _alter(table: str, columns: list) -> None:
    for name in columns:
        op.alter_column(
            table,
            name,
            type_=sa.Numeric(10, 2),
            existing_type=sa.Float(),
            existing_nullable=False,
            postgresql_using=f"{name}::numeric(10,2)",
        )


def _alter_revert(table: str, columns: list, nullable: bool = False) -> None:
    for name in columns:
        op.alter_column(
            table,
            name,
            type_=sa.Float(),
            existing_type=sa.Numeric(10, 2),
            existing_nullable=nullable,
            postgresql_using=f"{name}::double precision",
        )


def upgrade():
    _alter("rides", [
        "price_per_seat", "base_fare", "per_km_rate", "platform_fee",
        "mrp_fare", "minimum_fare", "discount", "final_fare",
    ])
    _alter("bookings", ["fare"])
    _alter("payments", ["amount"])
    op.alter_column(
        "wallets", "balance",
        type_=sa.Numeric(10, 2),
        existing_type=sa.Float(),
        existing_nullable=True,
        postgresql_using="balance::numeric(10,2)",
    )
    op.alter_column(
        "wallets", "pending_balance",
        type_=sa.Numeric(10, 2),
        existing_type=sa.Float(),
        existing_nullable=True,
        postgresql_using="pending_balance::numeric(10,2)",
    )
    op.alter_column(
        "transactions", "amount",
        type_=sa.Numeric(10, 2),
        existing_type=sa.Float(),
        existing_nullable=False,
        postgresql_using="amount::numeric(10,2)",
    )


def downgrade():
    _alter_revert("rides", [
        "price_per_seat", "base_fare", "per_km_rate", "platform_fee",
        "mrp_fare", "minimum_fare", "discount", "final_fare",
    ])
    _alter_revert("bookings", ["fare"])
    _alter_revert("payments", ["amount"])
    op.alter_column(
        "wallets", "balance",
        type_=sa.Float(),
        existing_type=sa.Numeric(10, 2),
        existing_nullable=True,
    )
    op.alter_column(
        "wallets", "pending_balance",
        type_=sa.Float(),
        existing_type=sa.Numeric(10, 2),
        existing_nullable=True,
    )
    op.alter_column(
        "transactions", "amount",
        type_=sa.Float(),
        existing_type=sa.Numeric(10, 2),
        existing_nullable=False,
    )
