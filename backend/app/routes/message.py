from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List
from app.db.database import get_db
from app.models.message import Message
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

class MessageCreate(BaseModel):
    sender_id: int  # 👈 Accept sender_id dynamically
    receiver_id: int
    ride_id: int
    content: str = Field(min_length=1, max_length=2000)

def verify_conversation_access(ride_id: int, current_user: User, recipient_id: int, db: Session):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    is_driver = ride.driver_id == current_user.id
    is_booked_passenger = db.query(Booking).filter(Booking.ride_id == ride_id, Booking.customer_id == current_user.id, Booking.status != "cancelled").first()
    if not is_driver and not is_booked_passenger:
        raise HTTPException(status_code=403, detail="You are not a participant in this ride")
    if is_driver:
        if not db.query(Booking).filter(Booking.ride_id == ride_id, Booking.customer_id == recipient_id, Booking.status != "cancelled").first():
            raise HTTPException(status_code=403, detail="Recipient is not booked on this ride")
    elif recipient_id != ride.driver_id:
        raise HTTPException(status_code=403, detail="Passengers can only message the ride driver")

@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_message(msg_data: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # 🔍 If you want to test easily, you can explicitly determine the sender 
        # or use the sender_id coming from the frontend payload.
        # To test Telegram-style left/right flipping, ensure your frontend 
        (
            # passes the correct user ID of whoever is currently tapping "Send".
        )
        
        verify_conversation_access(msg_data.ride_id, current_user, msg_data.receiver_id, db)
        new_msg = Message(
            sender_id=current_user.id,
            receiver_id=msg_data.receiver_id,
            ride_id=msg_data.ride_id,
            message_text=msg_data.content  
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)
        
        return {
            "success": True, 
            "data": {
                "id": new_msg.id,
                "text": new_msg.message_text,
                "sender_id": new_msg.sender_id
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/history/{ride_id}")
def get_chat_history(
    ride_id: int, 
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        verify_conversation_access(ride_id, current_user, receiver_id, db)
        messages = db.query(Message).filter(
            Message.ride_id == ride_id,
            ((Message.sender_id == current_user.id) & (Message.receiver_id == receiver_id)) |
            ((Message.sender_id == receiver_id) & (Message.receiver_id == current_user.id))
        ).order_by(Message.created_at.asc()).all()
        
        # ✅ We also added a safety check for 'm.created_at' here just in case!
        return [
            {
                "id": str(m.id),
                "text": m.message_text,
                "sender": "me" if m.sender_id == current_user.id else "them", 
                "timestamp": m.created_at.strftime("%I:%M %p") if m.created_at else "Now"
            }
            for m in messages
        ]
    except Exception as e:
        print(f"GET Error: {e}") # This helps debug in your terminal
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    messages = db.query(Message).filter(
        (Message.sender_id == current_user.id) | (Message.receiver_id == current_user.id)
    ).order_by(Message.created_at.desc()).all()
    conversations, seen = [], set()
    for message in messages:
        partner_id = message.receiver_id if message.sender_id == current_user.id else message.sender_id
        key = (message.ride_id, partner_id)
        if key in seen:
            continue
        try:
            verify_conversation_access(message.ride_id, current_user, partner_id, db)
        except HTTPException:
            continue
        partner = db.query(User).filter(User.id == partner_id).first()
        if partner:
            conversations.append({
                "rideId": message.ride_id,
                "receiverId": partner.id,
                "name": partner.full_name or partner.email,
                "email": partner.email,
                "role": partner.role,
                "phone": partner.phone or "",
                "lastMessage": message.message_text,
                "time": message.created_at.strftime("%I:%M %p") if message.created_at else "Now",
                "unread": False,
            })
            seen.add(key)
    passenger_bookings = db.query(Booking).filter(
        Booking.customer_id == current_user.id, Booking.status != "cancelled"
    ).all()
    for booking in passenger_bookings:
        ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
        if not ride or ride.driver_id == current_user.id:
            continue
        key = (ride.id, ride.driver_id)
        if key in seen:
            continue
        driver = db.query(User).filter(User.id == ride.driver_id).first()
        if driver:
            conversations.append({"rideId": ride.id, "receiverId": driver.id, "name": driver.full_name or driver.email, "email": driver.email, "role": driver.role, "phone": driver.phone or "", "lastMessage": "No messages yet", "time": "", "unread": False})
            seen.add(key)
    driver_bookings = db.query(Booking).join(Ride, Booking.ride_id == Ride.id).filter(
        Ride.driver_id == current_user.id, Booking.status != "cancelled"
    ).all()
    for booking in driver_bookings:
        key = (booking.ride_id, booking.customer_id)
        if key in seen:
            continue
        passenger = db.query(User).filter(User.id == booking.customer_id).first()
        if passenger:
            conversations.append({"rideId": booking.ride_id, "receiverId": passenger.id, "name": passenger.full_name or passenger.email, "email": passenger.email, "role": passenger.role, "phone": passenger.phone or "", "lastMessage": "No messages yet", "time": "", "unread": False})
            seen.add(key)
    return conversations
