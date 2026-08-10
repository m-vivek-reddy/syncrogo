from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine, SessionLocal
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

# 1. Import all database models so SQLAlchemy creates the tables
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.message import Message
from app.models.rating import Rating
from app.models.notification import Notification
from app.models.report import Report
from app.models.payment import PaymentMethod
from app.models.document import Document
from app.models.wallet import Wallet, Transaction
from app.models.platform_setting import PlatformSetting
from app.models.coupon import Coupon
from app.models.sos import SOSAlert

# 2. Import all application routes and API endpoints
from app.routes import user
from app.routes import auth
from app.routes import message as message_routes
from app.routes import payments
from app.routes import rating as rating_routes
from app.routes import vehicle as vehicle_routes
from app.routes import payments_method
from app.routes import documents
from app.routes import ride as ride_routes
from app.routes import websockets as websocket_routes
from app.routes import sos
from app.routes import admin
from app.routes import notifications
from app.api import booking
from app.api import pricing
from app.models.emergency_contact import EmergencyContact
from app.routes import emergency_contact


# Initialize FastAPI app
app = FastAPI()# Configure CORS so your React frontend (localhost:5173) can communicate with it

app.add_middleware(
CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://hj4cqztk-5173.inc1.devtunnels.ms"],  # Update this to your frontend URL in production (e.g., ["http://localhost:5173"])
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers (Authorization, Content-Type, etc.)
)
# 3. Register your routers
app.include_router(user.router)
app.include_router(auth.router)
app.include_router(booking.router)
app.include_router(message_routes.router)
app.include_router(payments.router)
app.include_router(rating_routes.router)
app.include_router(vehicle_routes.router)
app.include_router(payments_method.router)
app.include_router(documents.router)
app.include_router(ride_routes.router)
app.include_router(websocket_routes.router)
app.include_router(sos.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(pricing.router)
app.include_router(emergency_contact.router)
@app.get("/")
def read_root():
    return {"message": "Welcome to SyncroGo API!"}
