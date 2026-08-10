"""Add mrp_fare to rides

Revision ID: 003_add_mrp_fare_to_rides
Revises: 25f2b4147843
Create Date: 2026-07-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_mrp_fare_to_rides'
down_revision = '25f2b4147843'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('rides', sa.Column('mrp_fare', sa.Float(), nullable=False, server_default=sa.text('0.0')))
    op.alter_column('rides', 'mrp_fare', server_default=None)


def downgrade():
    op.drop_column('rides', 'mrp_fare')
