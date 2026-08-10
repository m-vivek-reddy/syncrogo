from pydantic import BaseModel


class EmergencyContactCreate(BaseModel):
    name: str
    phone: str


class EmergencyContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    user_id: int

    class Config:
        from_attributes = True