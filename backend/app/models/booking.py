from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pickup_location = Column(String, nullable=False)
    dropoff_location = Column(String, nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(String, default="scheduled") # scheduled, converted_to_ride, cancelled
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
