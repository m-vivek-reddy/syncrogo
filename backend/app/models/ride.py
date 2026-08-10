from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"))

    origin = Column(String)
    destination = Column(String)
    departure_time = Column(DateTime, nullable=True)  # 👈 Make sure this line exists
    pickup_lat = Column(Float, nullable=True)
    pickup_lon = Column(Float, nullable=True)
    dropoff_lat = Column(Float, nullable=True)
    dropoff_lon = Column(Float, nullable=True)
    gender_preference = Column(String, default="any")
    
    distance_km = Column(Float, nullable=False, default=0.0)
    vehicle_type = Column(String, nullable=False, default="car")
    price_per_seat = Column(Float, nullable=False, default=0.0)
    base_fare = Column(Float, nullable=False, default=0.0)
    per_km_rate = Column(Float, nullable=False, default=0.0)
    platform_fee = Column(Float, nullable=False, default=0.0)
    mrp_fare = Column(Float, nullable=False, default=0.0)
    minimum_fare = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    final_fare = Column(Float, nullable=False, default=0.0)
    seats_available = Column(Integer)
    status = Column(String, default="available")
    
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    driver = relationship("User", foreign_keys=[driver_id])