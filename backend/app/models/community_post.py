from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text

from app.db.database import Base


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_name = Column(String(120), nullable=False, default="Community")
    post_type = Column(String(32), nullable=False, default="general")
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    route_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
