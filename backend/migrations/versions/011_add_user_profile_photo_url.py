"""Add user profile photo URL.

Revision ID: 011_add_user_profile_photo_url
Revises: 010_add_booking_payments
Create Date: 2026-08-11 00:00:00.000000
"""

from alembic import op


revision = "011_add_user_profile_photo_url"
down_revision = "010_add_booking_payments"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR")


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS profile_photo_url")
