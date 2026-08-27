from typing import Optional

from pydantic import BaseModel, ConfigDict


# ============================================================
# CREATE BOOKING
# ============================================================

class BookingCreate(BaseModel):
    ride_id: int


# ============================================================
# ACCEPT BOOKING
# ============================================================

class BookingAccept(BaseModel):
    booking_id: int


# ============================================================
# VERIFY OTP
# ============================================================

class VerifyOTP(BaseModel):
    otp: str


# ============================================================
# LOCATION UPDATE
# ============================================================

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


# ============================================================
# BOOKING RESPONSE
# ============================================================

class BookingResponse(BaseModel):
    id: int

    ride_id: int

    passenger_id: int

    driver_id: int

    # --------------------------------------------------------
    # Pickup
    # --------------------------------------------------------

    pickup_location: str
    pickup_lat: float
    pickup_lon: float

    # --------------------------------------------------------
    # Dropoff
    # --------------------------------------------------------

    dropoff_location: str
    dropoff_lat: float
    dropoff_lon: float

    # --------------------------------------------------------
    # Fare
    # --------------------------------------------------------

    fare: float

    # --------------------------------------------------------
    # Booking status
    # PENDING
    # ACCEPTED
    # STARTED
    # COMPLETED
    # CANCELLED
    # --------------------------------------------------------

    status: str

    # --------------------------------------------------------
    # Passenger live location
    # --------------------------------------------------------

    passenger_lat: Optional[float] = None
    passenger_lon: Optional[float] = None

    # --------------------------------------------------------
    # Driver live location
    # --------------------------------------------------------

    driver_lat: Optional[float] = None
    driver_lon: Optional[float] = None

    # --------------------------------------------------------
    # OTP
    # --------------------------------------------------------

    otp_verified: bool

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None

    # --------------------------------------------------------
    # Pydantic v2
    # --------------------------------------------------------

    model_config = ConfigDict(
        from_attributes=True
    )
