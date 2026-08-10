from pydantic import BaseModel
from datetime import datetime

class VehicleCreate(BaseModel):
    make: str
    model: str
    license_plate: str
    capacity: int = 4

class VehicleResponse(BaseModel):
    id: int
    driver_id: int
    make: str
    model: str
    license_plate: str
    capacity: int
    created_at: datetime

    class Config:
        from_attributes = True