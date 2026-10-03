"""Driver live position + locked fare on rides

Adds the columns that let a published ride shrink its remaining distance (and
fare) as the driver travels towards the pickup point, and that freeze both once
a passenger has booked.

Revision ID: 014_ride_progress
Revises: 013_vehicle_type
Create Date: 2026-08-01 00:00:00.000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "014_ride_progress"
down_revision = "013_vehicle_type"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("rides", sa.Column("driver_lat", sa.Float(), nullable=True))
    op.add_column("rides", sa.Column("driver_lon", sa.Float(), nullable=True))
    op.add_column("rides", sa.Column("location_updated_at", sa.DateTime(), nullable=True))
    op.add_column("rides", sa.Column("locked_distance_km", sa.Float(), nullable=True))
    op.add_column("rides", sa.Column("locked_fare", sa.Numeric(10, 2), nullable=True))


def downgrade():
    op.drop_column("rides", "locked_fare")
    op.drop_column("rides", "locked_distance_km")
    op.drop_column("rides", "location_updated_at")
    op.drop_column("rides", "driver_lon")
    op.drop_column("rides", "driver_lat")