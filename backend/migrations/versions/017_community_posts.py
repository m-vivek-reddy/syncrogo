"""Add persistent community posts."""
from alembic import op
import sqlalchemy as sa


revision = "017_community_posts"
down_revision = "016_privacy_request_workflow"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "community_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("group_name", sa.String(length=120), nullable=False, server_default="Community"),
        sa.Column("post_type", sa.String(length=32), nullable=False, server_default="general"),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("route_info", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_community_posts_user_id", "community_posts", ["user_id"])
    op.create_index("ix_community_posts_created_at", "community_posts", ["created_at"])


def downgrade():
    op.drop_index("ix_community_posts_created_at", table_name="community_posts")
    op.drop_index("ix_community_posts_user_id", table_name="community_posts")
    op.drop_table("community_posts")
