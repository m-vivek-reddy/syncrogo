"""Add admin-managed community groups and real memberships."""
from alembic import op
import sqlalchemy as sa


revision = "018_community_groups"
down_revision = "017_community_posts"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "community_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("slug", sa.String(length=140), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="city"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "community_group_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("community_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("group_id", "user_id", name="uq_community_group_user"),
    )
    op.create_index("ix_community_group_memberships_group_id", "community_group_memberships", ["group_id"])
    op.create_index("ix_community_group_memberships_user_id", "community_group_memberships", ["user_id"])


def downgrade():
    op.drop_index("ix_community_group_memberships_user_id", table_name="community_group_memberships")
    op.drop_index("ix_community_group_memberships_group_id", table_name="community_group_memberships")
    op.drop_table("community_group_memberships")
    op.drop_table("community_groups")
