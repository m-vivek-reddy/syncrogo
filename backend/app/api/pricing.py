from fastapi import APIRouter
from pydantic import BaseModel
# Adjust this import based on your exact folder structure
from app.schemas.pricing import PriceCalculationRequest, PriceBreakdownResponse

router = APIRouter()

# 📊 Pricing Constants (Can be moved to DB or .env later)
RATES = {
    "carpool": {"base": 30.0, "per_km": 12.0},
    "premium": {"base": 50.0, "per_km": 18.0}
}

PLATFORM_FEE_PERCENT = 0.10  # SyncroGo takes a 10% commission
GST_PERCENT = 0.05           # 5% GST (Standard for transport services)

@router.post("/pricing/calculate", response_model=PriceBreakdownResponse)
def calculate_fare(request: PriceCalculationRequest):
    # 1. Fetch the correct rate card
    rate_card = RATES.get(request.ride_type.lower(), RATES["carpool"])
    base_fare = rate_card["base"]
    per_km_rate = rate_card["per_km"]
    
    # 2. Calculate the core trip cost
    distance_fare = round(request.distance_km * per_km_rate, 2)
    subtotal = round(base_fare + distance_fare, 2)
    
    # 3. Apply platform fees and taxes
    platform_fee = round(subtotal * PLATFORM_FEE_PERCENT, 2)
    gst = round(subtotal * GST_PERCENT, 2)
    
    # 4. Calculate final customer price
    total_fare = round(subtotal + platform_fee + gst, 2)
    
    # 5. Return the full breakdown
    return {
        "distance_km": request.distance_km,
        "base_fare": base_fare,
        "distance_fare": distance_fare,
        "subtotal": subtotal,
        "platform_fee": platform_fee,
        "gst": gst,
        "total_fare": total_fare
    }