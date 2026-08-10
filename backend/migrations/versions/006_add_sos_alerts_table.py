"""Add SOS alerts table

Revision ID: 006_add_sos_alerts_table
Revises: 005_live_tracking_users
Create Date: 2026-07-29 03:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_add_sos_alerts_table'
down_revision = '005_live_tracking_users'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sos_alerts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('ride_id', sa.Integer(), sa.ForeignKey('rides.id'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('sos_alerts')
