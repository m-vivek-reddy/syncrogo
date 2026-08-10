"""Add ride_id to bookings

Revision ID: 001_add_ride_id_to_bookings
Revises: 
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_add_ride_id_to_bookings'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ride_id INTEGER REFERENCES rides(id);
        CREATE INDEX IF NOT EXISTS ix_bookings_ride_id ON bookings (ride_id);
        """
    )


def downgrade():
    op.execute(
        """
        DROP INDEX IF EXISTS ix_bookings_ride_id;
        ALTER TABLE bookings DROP COLUMN IF EXISTS ride_id;
        """
    )
