from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.database import Base


class CommunityGroup(Base):
    __tablename__ = "community_groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    slug = Column(String(140), nullable=False, unique=True)
    description = Column(Text, nullable=False, default="")
    category = Column(String(32), nullable=False, default="city")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class CommunityGroupMembership(Base):
    __tablename__ = "community_group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_community_group_user"),)

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("community_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
