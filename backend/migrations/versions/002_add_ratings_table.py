"""Add ratings table

Revision ID: 002_add_ratings_table
Revises: 001_add_ride_id_to_bookings
Create Date: 2026-07-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_ratings_table'
down_revision = '001_add_ride_id_to_bookings'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('ride_id', sa.Integer(), sa.ForeignKey('rides.id'), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reviewee_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('feedback', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('ratings')
