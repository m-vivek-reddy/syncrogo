"""Consent flags on users + consent_records audit trail

Adds the per-user consent switches (terms, privacy, cookies, marketing email,
live location, document processing, SMS) and the append-only table that records
when each decision was made and against which policy version.

Existing users get server_default 'false' for every flag: with no consent
record on file, the correct posture is that no optional processing is
authorised. Marketing mail and live location therefore stay off until someone
opts in.

Revision ID: 015_consent
Revises: 014_ride_progress
Create Date: 2026-09-12 00:00:00.000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "015_consent"
down_revision = "014_ride_progress"
branch_labels = None
depends_on = None


FLAGS = [
    "consent_terms",
    "consent_privacy",
    "consent_cookies",
    "consent_marketing_email",
    "consent_location",
    "consent_documents",
    "consent_sms",
]


def upgrade():
    for flag in FLAGS:
        op.add_column(
            "users",
            sa.Column(
                flag,
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    op.add_column(
        "users",
        sa.Column("consent_recorded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("consent_policy_version", sa.String(), nullable=True),
    )

    op.create_table(
        "consent_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(), nullable=False),
        sa.Column("policy_version", sa.String(), nullable=True),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_consent_records_user_id", "consent_records", ["user_id"]
    )
    op.create_index(
        "ix_consent_records_purpose", "consent_records", ["purpose"]
    )


def downgrade():
    op.drop_index("ix_consent_records_purpose", table_name="consent_records")
    op.drop_index("ix_consent_records_user_id", table_name="consent_records")
    op.drop_table("consent_records")

    op.drop_column("users", "consent_policy_version")
    op.drop_column("users", "consent_recorded_at")
    for flag in FLAGS:
        op.drop_column("users", flag)