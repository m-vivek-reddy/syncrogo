from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=True) 
    
    reason = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, reviewed, resolved
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())