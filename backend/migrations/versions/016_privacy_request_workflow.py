"""Add privacy request workflow and transition audit events.

Retention periods intentionally remain unset pending business/legal approval.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "016_privacy_request_workflow"
down_revision = "015_consent"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("privacy_requests"):
        op.create_table(
            "privacy_requests",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("request_type", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="open"),
            sa.Column("reason", sa.String(), nullable=True),
            sa.Column("source", sa.String(), nullable=True),
            sa.Column("request_metadata", sa.JSON(), nullable=True),
            sa.Column("admin_notes", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_privacy_requests_user_id", "privacy_requests", ["user_id"])
        op.create_index("ix_privacy_requests_request_type", "privacy_requests", ["request_type"])
    elif "admin_notes" not in {column["name"] for column in inspector.get_columns("privacy_requests")}:
        op.add_column("privacy_requests", sa.Column("admin_notes", sa.String(), nullable=True))

    if not inspector.has_table("privacy_request_events"):
        op.create_table(
            "privacy_request_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("request_id", sa.Integer(), sa.ForeignKey("privacy_requests.id"), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("from_status", sa.String(), nullable=True),
            sa.Column("to_status", sa.String(), nullable=False),
            sa.Column("admin_note", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_privacy_request_events_request_id", "privacy_request_events", ["request_id"])
        op.create_index("ix_privacy_request_events_actor_user_id", "privacy_request_events", ["actor_user_id"])


def downgrade():
    op.drop_index("ix_privacy_request_events_actor_user_id", table_name="privacy_request_events")
    op.drop_index("ix_privacy_request_events_request_id", table_name="privacy_request_events")
    op.drop_table("privacy_request_events")
    # Keep privacy_requests because earlier code versions may have created it.
