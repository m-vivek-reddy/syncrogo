import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded regardless of current working directory
for _env_file in [
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / "backend" / ".env",
    Path.cwd() / ".env",
]:
    if _env_file.is_file():
        load_dotenv(dotenv_path=_env_file)
        break

from fastapi import FastAPI, Response
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.middleware.security import (
    SecurityHeadersMiddleware,
    RateLimitAndBotProtectionMiddleware,
)

# ---------------------------------------------------------
# Database
# ---------------------------------------------------------

from app.db.base import Base
from app.db.database import engine

# ---------------------------------------------------------
# Import all models
# ---------------------------------------------------------
# Importing the models before create_all() ensures SQLAlchemy
# knows about all tables.

from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.ride import Ride
from app.models.booking import Booking
from app.models.message import Message
from app.models.rating import Rating
from app.models.notification import Notification
from app.models.report import Report
from app.models.payment import PaymentMethod, Payment
from app.models.cash_fee_ledger import CashFeeLedger
from app.models.document import Document
from app.models.wallet import Wallet, Transaction
from app.models.platform_setting import PlatformSetting
from app.models.coupon import Coupon
from app.models.sos import SOSAlert
from app.models.emergency_contact import EmergencyContact

# ---------------------------------------------------------
# Import application routes
# ---------------------------------------------------------

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
from app.routes import emergency_contact
from app.routes import bookings
from app.routes import cash_fees

# API routers
from app.api import pricing


# ---------------------------------------------------------
# Create FastAPI application
# ---------------------------------------------------------

from contextlib import asynccontextmanager


def _init_db(retries: int = 5, delay: float = 3.0) -> bool:
    """Connect with retries and create tables.

    Runs at startup (not at import time) so a cold / restarting database or a
    momentarily unavailable Supabase pooler cannot crash the process and take
    the whole service down. Returns True when the schema is reachable.
    """
    import time

    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            print(f"[db] schema ready (attempt {attempt}/{retries})")
            return True
        except Exception as exc:  # noqa: BLE001 - never kill the process
            print(f"[db] init attempt {attempt}/{retries} failed: {type(exc).__name__}")
            if attempt < retries:
                time.sleep(delay)
    print("[db] database unreachable - API will serve, DB routes will 503 until it recovers")
    return False


DB_READY = False


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global DB_READY
    DB_READY = _init_db()
    yield


app = FastAPI(
    title="SyncroGo API",
    description="Backend API for SyncroGo carpool and ride-sharing platform",
    version="1.0.0",
    lifespan=lifespan,
)

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------
# Security & Rate Limiting Middleware
# ---------------------------------------------------------

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitAndBotProtectionMiddleware)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://hj4cqztk-5173.inc1.devtunnels.ms",
        "https://hj4cqztk-5174.inc1.devtunnels.ms",
        "https://hj4cqztk-8000.inc1.devtunnels.ms",
        "https://syncrogo-backend.onrender.com",
    ],
    # SECURITY: no wildcard origin regex — the allowlist above is authoritative.
    # A regex like r"^https?://.*$" would silently allow ANY origin with credentials.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Create database tables
# ---------------------------------------------------------
# NOTE: table creation happens in the `lifespan` startup handler (_init_db),
# NOT here at import time. Connecting during import crashed uvicorn before it
# could serve a single request whenever the database was briefly unavailable.


# ---------------------------------------------------------
# Register routers
# ---------------------------------------------------------

app.include_router(user.router)
app.include_router(auth.router)


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
app.include_router(bookings.router)
app.include_router(cash_fees.router)


# ---------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {
        "message": "Welcome to SyncroGo API!",
        "status": "running",
    }


# ---------------------------------------------------------
# Favicon endpoint (prevents 404 noise in logs)
# ---------------------------------------------------------

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    """Liveness only - must never touch the database."""
    return {
        "status": "healthy",
        "service": "SyncroGo API",
    }


@app.get("/health/ready")
def readiness_check():
    """Readiness probe - reports real database connectivity."""
    import app.db.database as db_module

    try:
        with db_module.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "up"}
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "degraded",
            "database": "down",
            "error": type(exc).__name__,
        }, 503
