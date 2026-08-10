"""Add pricing fields to rides

Revision ID: 004_add_pricing_fields_to_rides
Revises: 003_add_mrp_fare_to_rides
Create Date: 2026-07-29 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_pricing_fields_to_rides'
down_revision = '003_add_mrp_fare_to_rides'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('rides', sa.Column('distance_km', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('vehicle_type', sa.String(), nullable=False, server_default='car'))
    op.add_column('rides', sa.Column('base_fare', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('per_km_rate', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('platform_fee', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('minimum_fare', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('discount', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.add_column('rides', sa.Column('final_fare', sa.Float(), nullable=False, server_default=sa.text('0.0')))

    op.alter_column('rides', 'distance_km', server_default=None)
    op.alter_column('rides', 'vehicle_type', server_default=None)
    op.alter_column('rides', 'base_fare', server_default=None)
    op.alter_column('rides', 'per_km_rate', server_default=None)
    op.alter_column('rides', 'platform_fee', server_default=None)
    op.alter_column('rides', 'minimum_fare', server_default=None)
    op.alter_column('rides', 'discount', server_default=None)
    op.alter_column('rides', 'final_fare', server_default=None)


def downgrade():
    op.drop_column('rides', 'final_fare')
    op.drop_column('rides', 'discount')
    op.drop_column('rides', 'minimum_fare')
    op.drop_column('rides', 'platform_fee')
    op.drop_column('rides', 'per_km_rate')
    op.drop_column('rides', 'base_fare')
    op.drop_column('rides', 'vehicle_type')
    op.drop_column('rides', 'distance_km')
