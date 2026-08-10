from pydantic import BaseModel

class MessageCreate(BaseModel):
    ride_id: int
    sender_id: int
    receiver_id: int
    message_text: str

    class Config:
        orm_mode = True