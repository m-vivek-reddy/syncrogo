"""Tests for Issue 3: Booking / Seat Capacity Concurrency (pytest).

True concurrency tests use real threads with independent DB sessions against a
file-backed SQLite database configured with BEGIN IMMEDIATE transactions (the
SQLAlchemy-recommended recipe for making pysqlite serialize writers). This
forces the second concurrent request to wait on the first transaction's lock,
mirroring row-level locking behaviour on PostgreSQL/MySQL.

Sequential tests complement them by deterministically simulating interleavings.
"""
import os
import sys
import tempfile
import gc
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
# Import every model module so all mapper relationships resolve.
import importlib
import pkgutil

import app.models as _models
for _mod in pkgutil.iter_modules(_models.__path__):
    importlib.import_module(f"app.models.{_mod.name}")

import app.models.user  # noqa

from app.models.user import User
from app.models.ride import Ride
from app.models.booking import Booking
from app.routes.bookings import (
    accept_booking,
    cancel_booking,
    create_booking,
    verify_booking_otp,
)
from app.schemas.booking import BookingCreate, VerifyOTP


def make_threadsafe_engine():
    """File-backed SQLite engine whose transactions start with BEGIN IMMEDIATE.

    Two independent sessions against this engine genuinely contend for the
    database write lock, so a row locked by session A blocks session B until A
    commits — the same serialisation that .with_for_update() provides on
    PostgreSQL/MySQL.
    """
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{db_path}")

    # pysqlite's default isolation handling defeats BEGIN IMMEDIATE, so take
    # manual control of transaction boundaries.
    @event.listens_for(engine, "connect")
    def _disable_pysqlite_begin(dbapi_connection, connection_record):
        dbapi_connection.isolation_level = None
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    # Every transaction takes the database write lock up front, so two
    # concurrent requests contend for it instead of racing.
    @event.listens_for(engine, "begin")
    def _begin_immediate(conn):
        conn.exec_driver_sql("BEGIN IMMEDIATE")

    # Create the schema on a raw connection (bypasses the BEGIN IMMEDIATE hook).
    with engine.connect() as conn:
        Base.metadata.create_all(bind=conn)
        conn.exec_driver_sql("COMMIT")

    return engine, db_path


def cleanup_db_file(engine, db_path):
    """Dispose the engine (closing pooled connections) then delete the temp file."""
    engine.dispose()
    gc.collect()
    for suffix in ("", "-journal", "-wal", "-shm"):
        try:
            os.remove(db_path + suffix)
        except OSError:
            pass


class SimpleUser:
    """Lightweight stand-in for the User model (routes read identity fields only)."""

    def __init__(self, user_id):
        self.id = user_id
        self.full_name = "Passenger"
        self.name = None
        self.email = "pass@x.com"


def seed_data(engine, seats=1, booking_status=None, otp_code=None):
    """Create driver/passenger/ride (and optionally a booking) on a fresh session."""
    Session = sessionmaker(bind=engine)
    db = Session()
    driver = User(email="driver@x.com", full_name="Driver", role="driver", password="x", is_verified=True)
    passenger = User(email="pass@x.com", full_name="Passenger", role="passenger", password="x", is_verified=True)
    db.add_all([driver, passenger])
    db.commit()

    ride = Ride(
        driver_id=driver.id, origin="A", destination="B",
        pickup_lat=1.0, pickup_lon=1.0, dropoff_lat=2.0, dropoff_lon=2.0,
        departure_time=datetime.now(timezone.utc) + timedelta(days=1),
        seats_available=seats, status="published", vehicle_type="car",
        price_per_seat=100.0, final_fare=100.0,
    )
    db.add(ride)
    db.commit()

    booking = None
    if booking_status:
        booking = Booking(
            ride_id=ride.id, passenger_id=passenger.id, driver_id=driver.id,
            pickup_location="A", pickup_lat=1.0, pickup_lon=1.0,
            dropoff_location="B", dropoff_lat=2.0, dropoff_lon=2.0,
            fare=100.0, status=booking_status, otp_code=otp_code or "123456",
            otp_verified=False,
        )
        db.add(booking)
        db.commit()

    result = (driver.id, passenger.id, ride.id, booking.id if booking else None)
    db.expunge_all()
    db.close()
    return result


def run_concurrently(fn, count=2):
    """Run fn(i) in `count` real threads started simultaneously via a barrier."""
    barrier = threading.Barrier(count)
    results = [None] * count

    def runner(i):
        barrier.wait()
        results[i] = fn(i)

    threads = [threading.Thread(target=runner, args=(i,)) for i in range(count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def fresh_session(engine):
    return sessionmaker(bind=engine)()


def outcome(fn):
    """Return (ok, result_or_exception) for a route call."""
    try:
        return True, fn()
    except HTTPException as exc:
        return False, exc


# ===========================================================================
# A. Capacity concurrency — two simultaneous bookings, 1 seat
# ===========================================================================

def test_concurrent_bookings_cannot_overbook_single_seat():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, _ = seed_data(engine, seats=1)

    def attempt(i):
        db = fresh_session(engine)
        try:
            return outcome(lambda: create_booking(BookingCreate(ride_id=ride_id), db, SimpleUser(passenger_id)))
        finally:
            db.close()

    results = run_concurrently(attempt, 2)

    succeeded = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]

    assert len(succeeded) == 1, f"expected exactly 1 success, got {len(succeeded)}: {results}"
    assert len(failed) == 1, f"expected exactly 1 failure, got {len(failed)}"
    assert failed[0][1].status_code == 400

    db = fresh_session(engine)
    db.expire_all()
    final_ride = db.query(Ride).filter(Ride.id == ride_id).first()
    active = db.query(Booking).filter(
        Booking.ride_id == ride_id, Booking.status != "CANCELLED"
    ).count()
    assert final_ride.seats_available == 0
    assert final_ride.seats_available >= 0
    assert active == 1
    db.close()
    cleanup_db_file(engine, db_path)


# ===========================================================================
# B. Duplicate passenger concurrency
# ===========================================================================

def test_concurrent_duplicate_bookings_create_only_one():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, _ = seed_data(engine, seats=3)

    def attempt(i):
        db = fresh_session(engine)
        try:
            return outcome(lambda: create_booking(BookingCreate(ride_id=ride_id), db, SimpleUser(passenger_id)))
        finally:
            db.close()

    results = run_concurrently(attempt, 2)

    succeeded = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]

    assert len(succeeded) == 1
    assert len(failed) == 1
    assert "already have a booking" in failed[0][1].detail

    db = fresh_session(engine)
    db.expire_all()
    final_ride = db.query(Ride).filter(Ride.id == ride_id).first()
    active = db.query(Booking).filter(
        Booking.ride_id == ride_id,
        Booking.passenger_id == passenger_id,
        Booking.status != "CANCELLED",
    ).count()
    assert active == 1
    assert final_ride.seats_available == 2  # only one seat consumed
    db.close()
    cleanup_db_file(engine, db_path)


def test_passenger_can_rebook_after_cancelling():
    """Cancelled bookings are historical; the business rule only limits ACTIVE ones."""
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, _ = seed_data(engine, seats=2)

    db = fresh_session(engine)
    ok, res = outcome(lambda: create_booking(BookingCreate(ride_id=ride_id), db, SimpleUser(passenger_id)))
    assert ok
    booking_id = res["data"].id
    cancel_booking(booking_id, db, SimpleUser(passenger_id))
    ok2, res2 = outcome(lambda: create_booking(BookingCreate(ride_id=ride_id), db, SimpleUser(passenger_id)))
    assert ok2, "re-booking after cancellation must be allowed"
    db.close()

    db = fresh_session(engine)
    cancelled = db.query(Booking).filter(Booking.id == booking_id).first()
    assert cancelled.status == "CANCELLED"
    active = db.query(Booking).filter(
        Booking.ride_id == ride_id, Booking.status != "CANCELLED"
    ).count()
    assert active == 1
    db.close()
    cleanup_db_file(engine, db_path)

# ===========================================================================
# C. Cancellation idempotency / concurrency
# ===========================================================================

def test_concurrent_cancellations_restore_only_one_seat():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, booking_id = seed_data(engine, seats=0, booking_status="PENDING")
    # The ride starts full (capacity consumed by the PENDING booking), so the
    # post-cancellation seat count must be exactly 1 and can never exceed it.
    original_capacity = 1

    def attempt(i):
        db = fresh_session(engine)
        try:
            return outcome(lambda: cancel_booking(booking_id, db, SimpleUser(passenger_id)))
        finally:
            db.close()

    results = run_concurrently(attempt, 2)

    succeeded = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]

    assert len(succeeded) == 1, f"only one cancellation may take effect, got {len(succeeded)}"
    assert len(failed) == 1
    assert failed[0][1].status_code == 400

    db = fresh_session(engine)
    db.expire_all()
    final_ride = db.query(Ride).filter(Ride.id == ride_id).first()
    final_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    assert final_booking.status == "CANCELLED"
    assert final_ride.seats_available == 1, "seat restored exactly once"
    assert final_ride.seats_available <= original_capacity
    db.close()
    cleanup_db_file(engine, db_path)


def test_cancelling_an_already_cancelled_booking_does_not_restore_seat():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, booking_id = seed_data(engine, seats=0, booking_status="PENDING")

    db = fresh_session(engine)
    cancel_booking(booking_id, db, SimpleUser(passenger_id))
    db.expire_all()
    seats_after_first = db.query(Ride).filter(Ride.id == ride_id).first().seats_available

    ok, exc = outcome(lambda: cancel_booking(booking_id, db, SimpleUser(passenger_id)))
    db.expire_all()
    seats_after_second = db.query(Ride).filter(Ride.id == ride_id).first().seats_available

    assert not ok
    assert exc.status_code == 400
    assert seats_after_second == seats_after_first  # no double restore
    db.close()
    cleanup_db_file(engine, db_path)


# ===========================================================================
# D. Acceptance concurrency
# ===========================================================================

def test_concurrent_accepts_only_one_transition_and_one_otp():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, booking_id = seed_data(engine, seats=1, booking_status="PENDING")

    def attempt(i):
        db = fresh_session(engine)
        try:
            return outcome(lambda: accept_booking(booking_id, db, SimpleUser(driver_id)))
        finally:
            db.close()

    results = run_concurrently(attempt, 2)

    succeeded = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]

    assert len(succeeded) == 1
    assert len(failed) == 1
    assert failed[0][1].status_code == 400

    db = fresh_session(engine)
    db.expire_all()
    final_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    assert final_booking.status == "ACCEPTED"
    assert final_booking.otp_code is not None
    assert len(str(final_booking.otp_code)) == 6  # single, valid OTP
    db.close()
    cleanup_db_file(engine, db_path)


def test_accept_twice_sequentially_is_rejected():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, booking_id = seed_data(engine, seats=1, booking_status="PENDING")

    db = fresh_session(engine)
    ok1, res1 = outcome(lambda: accept_booking(booking_id, db, SimpleUser(driver_id)))
    otp1 = db.query(Booking).filter(Booking.id == booking_id).first().otp_code
    ok2, exc2 = outcome(lambda: accept_booking(booking_id, db, SimpleUser(driver_id)))
    db.expire_all()
    otp2 = db.query(Booking).filter(Booking.id == booking_id).first().otp_code

    assert ok1 and not ok2
    assert exc2.status_code == 400
    assert otp1 == otp2  # no duplicate side effects / OTP regenerated
    db.close()
    cleanup_db_file(engine, db_path)


# ===========================================================================
# E. OTP verification concurrency
# ===========================================================================

def test_concurrent_otp_verification_ends_started_once():
    engine, db_path = make_threadsafe_engine()
    driver_id, passenger_id, ride_id, booking_id = seed_data(
        engine, seats=1, booking_status="ACCEPTED", otp_code="123456"
    )

    def attempt(i):
        db = fresh_session(engine)
        try:
            return outcome(lambda: verify_booking_otp(booking_id, VerifyOTP(otp="123456"), db, SimpleUser(driver_id)))
        finally:
            db.close()

    results = run_concurrently(attempt, 2)

    succeeded = [r for r in results if r[0]]
    failed = [r for r in results if not r[0]]

    assert len(succeeded) == 1
    assert len(failed) == 1
    assert failed[0][1].status_code == 400

    db = fresh_session(engine)
    db.expire_all()
    final_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    assert final_booking.status == "STARTED"
    assert final_booking.otp_verified is True
    db.close()
    cleanup_db_file(engine, db_path)


# ===========================================================================
# F. Sequential guard checks (regression on locking structure & lifecycle)
# ===========================================================================

def test_booking_lifecycle_has_no_confirmed_or_picked_up_states():
    """ISSUE-1 lifecycle must remain: PENDING→ACCEPTED→STARTED→COMPLETED/PAID."""
    code = (ROOT / "app" / "routes" / "bookings.py").read_text(encoding="utf-8")
    assert 'status = "CONFIRMED"' not in code
    assert 'status = "PICKED_UP"' not in code


def test_capacity_paths_are_row_locked():
    """create/cancel/accept/verify must use SELECT ... FOR UPDATE."""
    code = (ROOT / "app" / "routes" / "bookings.py").read_text(encoding="utf-8")
    assert code.count(".with_for_update()") >= 5
    assert ".filter(Ride.id == data.ride_id)\n        .with_for_update()" in code
