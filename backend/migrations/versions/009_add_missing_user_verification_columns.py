"""Add missing verification columns to users

Revision ID: 009_add_missing_user_verification_columns
Revises: 006_add_sos_alerts_table
Create Date: 2026-08-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009_add_missing_user_verification_columns'
down_revision = '006_add_sos_alerts_table'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS document_url VARCHAR")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS document_status VARCHAR DEFAULT 'unsubmitted'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS driving_license VARCHAR")


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS driving_license")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS aadhaar_number")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS document_status")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS document_url")
