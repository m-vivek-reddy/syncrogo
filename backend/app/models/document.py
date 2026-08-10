from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    document_type = Column(String, nullable=False)

    file_path = Column(String, nullable=False)

    status = Column(String, default="pending")

    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )