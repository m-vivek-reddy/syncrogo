"""Add rating and notification tables

Revision ID: 008_add_rating_and_notification_tables
Revises: 007_add_notification_table
Create Date: 2026-07-29 05:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008_add_rating_and_notification_tables'
down_revision = '007_add_notification_table'
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
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )


def downgrade():
    op.drop_table('ratings')
