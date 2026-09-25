"""Add vehicle_type to vehicles

Records the vehicle tier a driver registered, so ride offers can be checked
against it server-side. Values mirror the pricing tiers ("car", "bike").

Nullable on purpose: vehicles registered before this migration are left with
a NULL type, and the ride-offer validation treats NULL as "not enforceable"
rather than rejecting the driver.

Revision ID: 013_vehicle_type
Revises: 012_cash_fees
Create Date: 2026-07-30 00:00:00.000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "013_vehicle_type"
down_revision = "012_cash_fees"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column("vehicle_type", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_column("vehicles", "vehicle_type")
