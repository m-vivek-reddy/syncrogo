from pydantic import BaseModel

class PriceCalculationRequest(BaseModel):
    distance_km: float
    ride_type: str = "carpool" # Allows you to add "premium" or "suv" later

class PriceBreakdownResponse(BaseModel):
    distance_km: float
    base_fare: float
    distance_fare: float
    subtotal: float
    platform_fee: float
    gst: float
    total_fare: float