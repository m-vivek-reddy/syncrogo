from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleResponse
from app.routes.auth import get_current_user
from app.services.ride_validation import normalize_vehicle_type

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)

@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def register_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Optional: Restrict this to drivers only
    # if current_user.role != "driver":
    #     raise HTTPException(status_code=403, detail="Only drivers can register vehicles")

    # Check if a vehicle with this license plate already exists
    existing_vehicle = db.query(Vehicle).filter(Vehicle.license_plate == vehicle_data.license_plate).first()
    if existing_vehicle:
        raise HTTPException(status_code=400, detail="License plate already registered")

    # Validate the vehicle type server-side so a driver cannot register an
    # unsupported tier and later offer rides under it.
    vehicle_type = None
    if vehicle_data.vehicle_type is not None and str(vehicle_data.vehicle_type).strip():
        vehicle_type = normalize_vehicle_type(vehicle_data.vehicle_type)

    new_vehicle = Vehicle(
        driver_id=current_user.id,
        make=vehicle_data.make,
        model=vehicle_data.model,
        license_plate=vehicle_data.license_plate,
        capacity=vehicle_data.capacity,
        vehicle_type=vehicle_type,
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return new_vehicle


@router.get("/me", response_model=VehicleResponse)
def get_my_vehicle(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vehicle found for this driver")
    return vehicle


@router.put("/me", response_model=VehicleResponse)
def update_my_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.driver_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vehicle found for this driver")

    # prevent changing to a license plate that already exists for another vehicle
    existing = db.query(Vehicle).filter(Vehicle.license_plate == vehicle_data.license_plate, Vehicle.id != vehicle.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License plate already registered by another vehicle")

    vehicle.make = vehicle_data.make
    vehicle.model = vehicle_data.model
    vehicle.license_plate = vehicle_data.license_plate
    vehicle.capacity = vehicle_data.capacity
    # Only overwrite the stored type when the client explicitly supplies one,
    # so PATCH-style callers that omit it do not silently clear the value.
    if vehicle_data.vehicle_type is not None and str(vehicle_data.vehicle_type).strip():
        vehicle.vehicle_type = normalize_vehicle_type(vehicle_data.vehicle_type)

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle