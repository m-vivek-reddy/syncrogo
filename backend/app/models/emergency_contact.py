from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"


    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    name = Column(
        String,
        nullable=False
    )


    phone = Column(
        String,
        nullable=False
    )


    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )


    user = relationship(
        "User",
        back_populates="emergency_contacts"
    )