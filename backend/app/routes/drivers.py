import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.ride_validation import haversine_km, validate_coordinate_pair

router = APIRouter(prefix="/api/v1/drivers", tags=["Drivers"])


@router.get("/nearby")
def nearby_drivers(
    latitude: float | None = None,
    longitude: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = Query(default=5.0, gt=0, le=25),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinate_pairs = []
    if latitude is not None or longitude is not None:
        if latitude is None or longitude is None:
            raise HTTPException(status_code=400, detail="Both latitude and longitude are required.")
        coordinate_pairs.append(validate_coordinate_pair(latitude, longitude, "Search"))
    if lat is not None or lng is not None:
        if lat is None or lng is None:
            raise HTTPException(status_code=400, detail="Both lat and lng are required.")
        coordinate_pairs.append(validate_coordinate_pair(lat, lng, "Search"))
    if not coordinate_pairs:
        raise HTTPException(status_code=400, detail="Latitude and longitude are required.")
    if any(
        not math.isclose(coordinate_pairs[0][0], pair[0], abs_tol=1e-6)
        or not math.isclose(coordinate_pairs[0][1], pair[1], abs_tol=1e-6)
        for pair in coordinate_pairs[1:]
    ):
        raise HTTPException(status_code=400, detail="Coordinate aliases must match.")

    search_latitude, search_longitude = coordinate_pairs[0]
    drivers = (
        db.query(User)
        .filter(
            User.role == "driver",
            User.is_online.is_(True),
            User.is_verified.is_(True),
            User.id != current_user.id,
            User.latitude.isnot(None),
            User.longitude.isnot(None),
        )
        .all()
    )

    vehicles = []
    for driver in drivers:
        distance = haversine_km(
            search_latitude,
            search_longitude,
            driver.latitude,
            driver.longitude,
        )
        if distance > radius_km:
            continue
        vehicles.append(
            {
                "id": driver.id,
                "driver_id": driver.id,
                "full_name": driver.full_name or "Verified Driver",
                "latitude": round(driver.latitude, 3),
                "longitude": round(driver.longitude, 3),
                "vehicle_type": driver.vehicle_type,
                "distance_km": round(distance, 1),
            }
        )

    vehicles.sort(key=lambda item: item["distance_km"])
    return {"success": True, "vehicles": vehicles, "radius_km": radius_km}
