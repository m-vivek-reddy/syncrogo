"""Server-side integrity checks for ride offers.

Phase 1 data-integrity controls:
  * coordinate range validation
  * vehicle-type whitelisting
  * driver registered-vehicle consistency
  * server-authoritative route distance

These helpers intentionally raise ``HTTPException`` so they can be used
directly from FastAPI route handlers.
"""

import math

from fastapi import HTTPException, status

from app.services.routing import calculate_route_distance_km


# ---------------------------------------------------------------------------
# Supported vehicle types
# ---------------------------------------------------------------------------
#
# The current repository defines vehicle tiers in
# ``app.services.pricing_service.VEHICLE_PRICING_CONFIG`` ("bike", "car") and
# duplicates the concept as ``ride_type`` in ``app.api.pricing.RATES``
# ("bike", "carpool"). This module derives the canonical set from the pricing
# configuration so the two cannot drift apart.

CANONICAL_VEHICLE_TYPES = ("car", "bike")

# Client-facing aliases that map onto a canonical vehicle type. The web client
# sends ``vehicle_type`` while the mobile client sends the same field but the
# pricing endpoint is called with ``ride_type``; "carpool" is the documented
# pricing label for a car.
VEHICLE_TYPE_ALIASES = {
    "car": "car",
    "bike": "bike",
    "carpool": "car",
    "motorcycle": "bike",
    "two_wheeler": "bike",
    "two-wheeler": "bike",
}

# A two-wheeler physically carries the rider plus at most one pillion; the
# mobile offer screen already enforces "1 seat max" for bikes.
MAX_SEATS_BY_VEHICLE_TYPE = {
    "car": 6,
    "bike": 1,
}


def supported_vehicle_types() -> tuple:
    """Canonical vehicle types, sourced from the pricing configuration."""
    try:
        from app.services.pricing_service import VEHICLE_PRICING_CONFIG

        configured = tuple(
            sorted(str(k).lower() for k in VEHICLE_PRICING_CONFIG.keys())
        )
        if configured:
            return configured
    except Exception:  # pragma: no cover - defensive, config always present
        pass
    return CANONICAL_VEHICLE_TYPES


def normalize_vehicle_type(raw_value) -> str:
    """Validate and canonicalise a client-supplied vehicle type.

    Raises HTTP 400 when the value is missing or is not a supported type.
    """
    supported = supported_vehicle_types()

    if raw_value is None or not str(raw_value).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Vehicle type is required. Supported values: "
                f"{', '.join(supported)}."
            ),
        )

    candidate = str(raw_value).strip().lower()
    canonical = VEHICLE_TYPE_ALIASES.get(candidate, candidate)

    if canonical not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid vehicle type: '{raw_value}'. "
                f"Supported values: {', '.join(supported)}."
            ),
        )

    return canonical


# ---------------------------------------------------------------------------
# Coordinate validation
# ---------------------------------------------------------------------------

COORDINATE_BOUNDS = {
    "latitude": (-90.0, 90.0),
    "longitude": (-180.0, 180.0),
}


def validate_coordinate(value, kind: str, field_name: str = None) -> float:
    """Validate a single latitude/longitude value.

    ``kind`` is either ``"latitude"`` or ``"longitude"``. Returns the value as
    a float, or raises HTTP 400 for out-of-range / non-finite / non-numeric
    input.
    """
    label = field_name or kind
    low, high = COORDINATE_BOUNDS[kind]

    if isinstance(value, bool) or value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be a number between {low} and {high}.",
        )

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be a number between {low} and {high}.",
        )

    # NaN / inf are not valid coordinates and would poison every distance
    # calculation downstream.
    if not math.isfinite(numeric):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be a finite number.",
        )

    if numeric < low or numeric > high:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{label} out of range: {numeric}. "
                f"Expected a value between {low} and {high}."
            ),
        )

    return numeric


def validate_coordinate_pair(
    lat, lon, prefix: str
) -> tuple:
    """Validate a (latitude, longitude) pair, returning both as floats."""
    return (
        validate_coordinate(lat, "latitude", f"{prefix} latitude"),
        validate_coordinate(lon, "longitude", f"{prefix} longitude"),
    )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    radius = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = lat2_rad - lat1_rad
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    return radius * 2 * math.asin(math.sqrt(min(1.0, a)))


# ---------------------------------------------------------------------------
# Server-authoritative distance
# ---------------------------------------------------------------------------

# Client distance below this fraction of the authoritative road distance is
# treated as a manipulation attempt and rejected outright rather than silently
# corrected, so the caller learns their value was wrong.
CLIENT_DISTANCE_LOWER_TOLERANCE = 0.75

# Above this fraction the client value is accepted as-is. Clients may request a
# route through points that differ slightly from what the server computes
# (snapping, traffic-independent path choice), and those differences are
# legitimate.
CLIENT_DISTANCE_UPPER_TOLERANCE = 1.25


def resolve_authoritative_distance(
    pickup_lat: float,
    pickup_lon: float,
    dropoff_lat: float,
    dropoff_lon: float,
    client_distance_km=None,
) -> dict:
    """Determine the distance that is authoritative for pricing.

    The server never trusts ``client_distance_km`` for fare calculation. It
    first asks the routing service for a road distance; if that is unavailable
    it falls back to a great-circle estimate scaled for road curvature.

    ``client_distance_km`` is used only as a sanity signal: a value that
    materially *understates* the real route is rejected with HTTP 400.

    Returns a dict with ``distance_km``, ``source`` and ``client_distance_km``.
    """
    road_distance = calculate_route_distance_km(
        pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
    )

    if road_distance is not None and road_distance > 0:
        authoritative = round(float(road_distance), 2)
        source = "road"
    else:
        # Routing provider unavailable: fall back to a curvature-adjusted
        # straight-line estimate so the platform still has a defensible number.
        straight = haversine_km(
            pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
        )
        authoritative = max(0.1, round(straight * 1.25, 2))
        source = "haversine_fallback"

    result = {
        "distance_km": authoritative,
        "source": source,
        "client_distance_km": None,
    }

    if client_distance_km is None:
        return result

    try:
        client_value = float(client_distance_km)
    except (TypeError, ValueError):
        return result

    result["client_distance_km"] = client_value

    if not math.isfinite(client_value) or client_value <= 0:
        return result

    # Only a material UNDERSTATEMENT is a fare-integrity problem: understating
    # distance lowers the platform fare and therefore the price ceiling.
    if client_value < authoritative * CLIENT_DISTANCE_LOWER_TOLERANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The submitted distance does not match the route between the "
                f"given coordinates (submitted {client_value} km, "
                f"calculated {authoritative} km). Distance is derived "
                "server-side from pickup and dropoff coordinates."
            ),
        )

    # Overstatement does not reduce platform fare, so it is tolerated.
    return result


# ---------------------------------------------------------------------------
# Driver registered-vehicle validation
# ---------------------------------------------------------------------------

def resolve_driver_vehicle_type(db, driver_id: int):
    """Look up the vehicle type the driver actually registered.

    Returns ``None`` when the driver has no registered vehicle with a known
    type (for example on a deployment where the ``vehicles.vehicle_type``
    column has not been populated yet).
    """
    from app.models.vehicle import Vehicle

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.driver_id == driver_id)
        .order_by(Vehicle.id.asc())
        .first()
    )

    if not vehicle:
        return None, None

    raw_type = getattr(vehicle, "vehicle_type", None)
    if raw_type is None or not str(raw_type).strip():
        return vehicle, None

    try:
        return vehicle, normalize_vehicle_type(raw_type)
    except HTTPException:
        # A legacy/garbage value on the vehicle row must not hard-fail ride
        # creation; treat it as "unknown" and fall through to the
        # unenforceable path.
        return vehicle, None


def enforce_driver_vehicle_type(db, driver_id: int, declared_vehicle_type: str) -> str:
    """Ensure ``declared_vehicle_type`` matches the driver's registered vehicle.

    Raises HTTP 403 on a genuine mismatch. When the driver has no registered
    vehicle type on record the declared type is accepted, because the current
    data model cannot distinguish "not registered" from "registered before the
    column existed".
    """
    _vehicle, registered_type = resolve_driver_vehicle_type(db, driver_id)

    if registered_type is None:
        return declared_vehicle_type

    if registered_type != declared_vehicle_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Vehicle type mismatch: you are registered with a "
                f"'{registered_type}' but this ride is offered as a "
                f"'{declared_vehicle_type}'. Update your registered vehicle "
                "or offer the matching vehicle type."
            ),
        )

    return declared_vehicle_type


def validate_seat_count(vehicle_type: str, available_seats) -> int:
    """Validate available seats against the vehicle type's capacity."""
    try:
        seats = int(available_seats)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available seats must be a whole number greater than zero.",
        )

    if seats <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Available seats must be greater than zero.",
        )

    maximum = MAX_SEATS_BY_VEHICLE_TYPE.get(vehicle_type)
    if maximum is not None and seats > maximum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"A {vehicle_type} ride can offer at most {maximum} seat(s); "
                f"received {seats}."
            ),
        )

    return seats
