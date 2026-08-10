from fastapi import HTTPException, status
from app.models.ride import Ride

# Configuration mapping or fetched from platform_settings table
VEHICLE_PRICING_CONFIG = {
    "bike": {
        "base_fare": 25.0,
        "per_km_rate": 5.0,
        "platform_fee": 5.0,
        "minimum_fare": 30.0
    },
    "car": {
        "base_fare": 40.0,
        "per_km_rate": 8.0,
        "platform_fee": 8.0,
        "minimum_fare": 50.0
    }
}


def calculate_ride_fare(distance_km: float, vehicle_type: str, discount: float = 0.0) -> dict:
    """Calculates the centralized platform MRP and fee breakdown."""
    config = VEHICLE_PRICING_CONFIG.get(vehicle_type.lower())
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vehicle type: {vehicle_type}"
        )

    base_fare = config["base_fare"]
    per_km_rate = config["per_km_rate"]
    platform_fee = config["platform_fee"]
    minimum_fare = config["minimum_fare"]

    ride_fare = base_fare + (distance_km * per_km_rate)
    mrp_fare = ride_fare + platform_fee

    if mrp_fare < minimum_fare:
        mrp_fare = minimum_fare

    final_fare = max(mrp_fare - discount, minimum_fare)

    return {
        "distance_km": distance_km,
        "vehicle_type": vehicle_type,
        "base_fare": base_fare,
        "per_km_rate": per_km_rate,
        "platform_fee": platform_fee,
        "mrp_fare": mrp_fare,
        "minimum_fare": minimum_fare,
        "discount": discount,
        "final_fare": final_fare,
        "driver_earnings": mrp_fare - platform_fee
    }


def validate_and_update_ride_price(ride: Ride, new_price: float):
    """Ensures modified prices stay strictly between the minimum fare and platform MRP."""
    if new_price > ride.mrp_fare:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price cannot exceed platform fare (MRP)."
        )

    if new_price < ride.minimum_fare:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price cannot be below minimum fare."
        )

    ride.final_fare = new_price
    ride.price_per_seat = new_price
    return ride
