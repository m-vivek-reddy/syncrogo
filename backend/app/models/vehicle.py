from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    license_plate = Column(String, unique=True, index=True, nullable=False)
    capacity = Column(Integer, default=4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())