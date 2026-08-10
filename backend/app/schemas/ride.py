from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# What the driver sends when offering a ride
class RideOfferCreate(BaseModel):
    origin: str
    destination: str
    departure_time: datetime
    price_per_seat: float
    seats_available: int

# What the API returns to the frontend
class RideResponse(BaseModel):
    id: int
    driver_name: str
    vehicle_number: str
    driver_phone: str
    origin: str
    destination: str
    price: float
    seats_available: int
    
    class Config:
        from_attributes = True