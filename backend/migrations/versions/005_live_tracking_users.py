"""Add live tracking fields to users

Revision ID: 005_live_tracking_users
Revises: 004_add_pricing_fields_to_rides
Create Date: 2026-07-29 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_live_tracking_users'
down_revision = '004_add_pricing_fields_to_rides'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_online', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('vehicle_type', sa.String(), nullable=True))
    op.add_column('users', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('longitude', sa.Float(), nullable=True))
    op.alter_column('users', 'is_online', server_default=None)


def downgrade():
    op.drop_column('users', 'longitude')
    op.drop_column('users', 'latitude')
    op.drop_column('users', 'vehicle_type')
    op.drop_column('users', 'is_online')
