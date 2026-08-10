import httpx
from fastapi import HTTPException

OSRM_URL = "http://router.project-osrm.org/route/v1/driving/"

def calculate_tiered_fare(distance_km: float, ride_type: str) -> float:
    """
    Calculates the fare based on the specific vehicle tier and distance brackets.
    """
    if ride_type == "bike":
        # 🏍️ Bike Pricing
        if distance_km <= 2.0:
            return 20.0
        elif distance_km <= 5.0:
            return 35.0
        elif distance_km <= 10.0:
            return 50.0
        elif distance_km <= 15.0:
            return 70.0
        elif distance_km <= 20.0:
            return 90.0
        else:
            # Base 20km rate + ₹5 for every extra km
            return 90.0 + ((distance_km - 20.0) * 5.0)

    elif ride_type == "carpool":
        # 🚗 Carpool Pricing
        if distance_km <= 2.0:
            return 25.0
        elif distance_km <= 5.0:
            return 40.0
        elif distance_km <= 10.0:
            return 60.0
        elif distance_km <= 15.0:
            return 85.0
        elif distance_km <= 20.0:
            return 110.0
        else:
            # Base 20km rate + ₹6 for every extra km
            return 110.0 + ((distance_km - 20.0) * 6.0)

    else:
        raise ValueError(f"Unknown ride type: {ride_type}")


async def calculate_distance_and_fare(
    pickup_lat: float, 
    pickup_lon: float, 
    dropoff_lat: float, 
    dropoff_lon: float,
    ride_type: str = "carpool" # <-- Pass the ride type
):
    """
    Fetches real driving distance from OSRM and runs the tiered fare calculator.
    """
    coordinates = f"{pickup_lon},{pickup_lat};{dropoff_lon},{dropoff_lat}"
    url = f"{OSRM_URL}{coordinates}?overview=false"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            if "routes" not in data or len(data["routes"]) == 0:
                raise HTTPException(status_code=400, detail="No driving route found between coordinates.")

            # OSRM returns distance in meters; convert to kilometers
            distance_meters = data["routes"][0]["distance"]
            distance_km = round(distance_meters / 1000.0, 2)
            
            # Calculate fare based on your business model rules
            fare = round(calculate_tiered_fare(distance_km, ride_type), 2)

            return {
                "distance_km": distance_km,
                "fare": fare
            }

        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Mapping routing service is currently unavailable.")