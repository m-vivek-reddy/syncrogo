from fastapi import APIRouter

from app.schemas.pricing import PriceBreakdownResponse, PriceCalculationRequest

router = APIRouter()

# SyncroGo launch fare policy: predictable fuel-sharing prices, not taxi fares.
RATES = {
    "carpool": {"per_km": 10.0, "minimum_fare": 15.0},
    "bike": {"per_km": 5.0, "minimum_fare": 8.0},
}


def get_platform_fee(distance_km: float, ride_type: str) -> float:
    if ride_type == "bike":
        return 3.0 if distance_km <= 10 else 5.0 if distance_km <= 30 else 10.0
    return 5.0 if distance_km <= 10 else 10.0 if distance_km <= 30 else 15.0


@router.post("/pricing/calculate", response_model=PriceBreakdownResponse)
def calculate_fare(request: PriceCalculationRequest):
    """Calculate the published maximum fare from road distance."""
    ride_type = request.ride_type.lower()
    rate_card = RATES.get(ride_type, RATES["carpool"])
    distance_fare = round(max(request.distance_km, 0) * rate_card["per_km"], 2)
    platform_fee = get_platform_fee(request.distance_km, ride_type)
    total_fare = round(
        max(distance_fare + platform_fee, rate_card["minimum_fare"]),
        2,
    )

    return {
        "distance_km": request.distance_km,
        "duration_minutes": request.duration_minutes,
        "base_fare": 0.0,
        "distance_fare": distance_fare,
        "time_fare": 0.0,
        "subtotal": distance_fare,
        "platform_fee": platform_fee,
        "gst": 0.0,
        "total_fare": total_fare,
    }
