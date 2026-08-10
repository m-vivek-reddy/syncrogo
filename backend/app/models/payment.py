from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.db.database import Base

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_brand = Column(String, nullable=False)
    last_4 = Column(String, nullable=False)
    expiry_month = Column(Integer, nullable=False)
    expiry_year = Column(Integer, nullable=False)
    is_default = Column(Boolean, default=False)
