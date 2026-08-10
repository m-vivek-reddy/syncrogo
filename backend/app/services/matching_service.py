from sqlalchemy.orm import Session
import math
from app.models.user import User


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers using the Haversine formula."""
    R = 6371.0  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


def find_nearby_drivers(db: Session, pickup_lat: float, pickup_lng: float, vehicle_type: str, radius_km: float = 5.0):
    """Finds available drivers within a radius matching the vehicle type, sorted by distance."""
    available_drivers = db.query(User).filter(
        User.role == "driver",
        User.is_online == True,
        User.vehicle_type == vehicle_type.lower(),
        User.latitude.isnot(None),
        User.longitude.isnot(None)
    ).all()

    matched_drivers = []

    for driver in available_drivers:
        distance = calculate_distance(pickup_lat, pickup_lng, driver.latitude, driver.longitude)
        if distance <= radius_km:
            matched_drivers.append({
                "driver_id": driver.id,
                "email": driver.email,
                "latitude": driver.latitude,
                "longitude": driver.longitude,
                "distance_km": round(distance, 2)
            })

    matched_drivers.sort(key=lambda x: x["distance_km"])
    return matched_drivers
