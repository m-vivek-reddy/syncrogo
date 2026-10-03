import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.routes.drivers import nearby_drivers, router


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_user(db, email, role, latitude, longitude, *, online=False, verified=True):
    user = User(
        email=email,
        full_name=email.split("@")[0],
        role=role,
        password="hashed",
        latitude=latitude,
        longitude=longitude,
        is_online=online,
        is_verified=verified,
        vehicle_type="car",
    )
    db.add(user)
    db.commit()
    return user


def test_nearby_endpoint_returns_only_online_verified_other_drivers():
    db = make_session()
    passenger = make_user(db, "passenger@example.com", "passenger", 17.0, 78.0)
    near = make_user(db, "near@example.com", "driver", 17.0057, 78.0049, online=True)
    make_user(db, "offline@example.com", "driver", 17.001, 78.001, online=False)
    make_user(db, "unverified@example.com", "driver", 17.001, 78.001, online=True, verified=False)
    make_user(db, "far@example.com", "driver", 18.0, 79.0, online=True)

    result = nearby_drivers(
        latitude=17.0,
        longitude=78.0,
        lat=17.0,
        lng=78.0,
        radius_km=5.0,
        db=db,
        current_user=passenger,
    )

    assert result["success"] is True
    assert [item["driver_id"] for item in result["vehicles"]] == [near.id]
    assert result["vehicles"][0]["latitude"] == round(near.latitude, 3)
    assert "email" not in result["vehicles"][0]


def test_nearby_endpoint_rejects_conflicting_coordinate_aliases():
    db = make_session()
    passenger = make_user(db, "alias@example.com", "passenger", 17.0, 78.0)

    with pytest.raises(Exception) as exc:
        nearby_drivers(
            latitude=17.0,
            longitude=78.0,
            lat=17.1,
            lng=78.0,
            radius_km=5.0,
            db=db,
            current_user=passenger,
        )

    assert getattr(exc.value, "status_code", None) == 400


def test_nearby_endpoint_rejects_invalid_coordinates():
    db = make_session()
    passenger = make_user(db, "invalid@example.com", "passenger", 17.0, 78.0)

    with pytest.raises(Exception) as exc:
        nearby_drivers(
            latitude=91.0,
            longitude=78.0,
            radius_km=5.0,
            db=db,
            current_user=passenger,
        )

    assert getattr(exc.value, "status_code", None) == 400


def test_nearby_endpoint_requires_authentication():
    db = make_session()
    app = FastAPI()
    app.include_router(router)

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/drivers/nearby",
            params={"latitude": 17.0, "longitude": 78.0},
        )

    assert response.status_code == 401
