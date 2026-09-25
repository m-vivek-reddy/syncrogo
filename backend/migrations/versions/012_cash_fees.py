"""payment method/refund fields + cash fee ledger table

Revision ID: 012_cash_fees
Revises: 011_money_numeric
Create Date: 2026-02-06
"""
from alembic import op
import sqlalchemy as sa

revision = "012_cash_fees"
down_revision = "011_money_numeric"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("payments", sa.Column("method", sa.String(), nullable=False, server_default="UPI"))
    op.add_column("payments", sa.Column("refund_status", sa.String(), nullable=True))
    op.add_column("payments", sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_payments_method", "payments", ["method"])
    op.create_index("ix_payments_refund_status", "payments", ["refund_status"])

    op.create_table(
        "cash_fee_ledger",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False, unique=True, index=True),
        sa.Column("ride_date", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False, server_default="10.00"),
        sa.Column("status", sa.String(), nullable=False, server_default="ACCRUED", index=True),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("settlement_id", sa.String(), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cash_fee_driver_date_status", "cash_fee_ledger", ["driver_id", "ride_date", "status"])


def downgrade():
    op.drop_index("ix_cash_fee_driver_date_status", table_name="cash_fee_ledger")
    op.drop_table("cash_fee_ledger")
    op.drop_index("ix_payments_refund_status", table_name="payments")
    op.drop_index("ix_payments_method", table_name="payments")
    op.drop_column("payments", "refunded_at")
    op.drop_column("payments", "refund_status")
    op.drop_column("payments", "method")
