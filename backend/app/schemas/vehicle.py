from pydantic import BaseModel
from typing import Optional
from datetime import datetime
class VehicleCreate(BaseModel):
    make: str
    model: str
    license_plate: str
    capacity: int = 4
    # Optional for backwards compatibility with clients that do not yet send
    # it; when omitted the vehicle type stays unset and the driver-level
    # mismatch check falls back to "unenforceable".
    vehicle_type: Optional[str] = None
class VehicleResponse(BaseModel):
    id: int
    driver_id: int
    make: str
    model: str
    license_plate: str
    capacity: int
    vehicle_type: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True