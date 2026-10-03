"""Consent capture, withdrawal and the registration gate.

Verifies that:
- registration is blocked without explicit Terms + Privacy agreement,
- every decision lands in the immutable consent_records trail,
- optional consents default to OFF and are never inferred,
- withdrawal flips the live flag in the same call that writes the audit row.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
import importlib
import pkgutil
import app.models as _models

for _mod in pkgutil.iter_modules(_models.__path__):
    importlib.import_module(f"app.models.{_mod.name}")

from app.models.consent import ALL_PURPOSES, ConsentRecord
from app.models.privacy_request import PrivacyRequest, PrivacyRequestEvent
from app.routes.privacy import (
    PrivacyRequestCreate,
    PrivacyRequestReview,
    create_privacy_request,
    export_user_data,
    list_privacy_requests,
    review_privacy_request,
    withdraw_consent,
)
from app.routes.admin import verify_admin_role
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.consent_service import (
    POLICY_VERSION,
    assert_required_consent,
    record_consent,
    requires_active_consent,
    serialize_consent,
)


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def make_user(db, email="consent@example.com"):
    user = User(email=email, password="hashed", full_name="Consent Tester")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Registration gate
# ---------------------------------------------------------------------------

def test_registration_requires_terms():
    """Missing terms acceptance must be refused."""
    with pytest.raises(Exception) as exc:
        assert_required_consent(_StubUser(), terms=False, privacy=True)
    assert "terms" in str(exc.value).lower()


def test_registration_requires_privacy():
    with pytest.raises(Exception) as exc:
        assert_required_consent(_StubUser(), terms=True, privacy=False)
    assert "privacy" in str(exc.value).lower()


def test_registration_passes_with_both():
    assert_required_consent(_StubUser(), terms=True, privacy=True) is None


def test_user_create_defaults_every_optional_consent_to_false():
    """A client that omits consent fields must not be treated as consenting."""
    payload = UserCreate(
        email="a@b.com",
        password="x",
        accept_terms=True,
        accept_privacy=True,
    )
    assert payload.consent_cookies is False
    assert payload.consent_marketing_email is False
    assert payload.consent_location is False
    assert payload.consent_documents is False
    assert payload.consent_sms is False


class _StubUser:
    """Minimal stand-in for the flag reads in assert_required_consent."""


# ---------------------------------------------------------------------------
# Recording consent
# ---------------------------------------------------------------------------

def test_recording_terms_writes_audit_row_and_flag(db):
    user = make_user(db)
    record_consent(db, user, ["terms"], granted=True, source="registration")

    assert user.consent_terms is True

    rows = db.query(ConsentRecord).filter(ConsentRecord.user_id == user.id).all()
    assert len(rows) == 1
    assert rows[0].purpose == "terms"
    assert rows[0].granted is True
    assert rows[0].policy_version == POLICY_VERSION
    assert rows[0].source == "registration"


def test_optional_consents_default_to_false(db):
    """With no record on file, nothing is authorised."""
    user = make_user(db)
    for purpose in ("marketing_email", "location", "documents", "sms", "cookies"):
        assert getattr(user, f"consent_{purpose}") is False
        assert requires_active_consent(user, purpose) is False


def test_granting_optional_consent_enables_it(db):
    user = make_user(db)
    record_consent(db, user, ["marketing_email"], granted=True)

    assert user.consent_marketing_email is True
    assert requires_active_consent(user, "marketing_email") is True
    # ...and nothing else switched on as a side effect.
    assert user.consent_location is False


def test_withdrawal_is_immediate_and_audited(db):
    """Turning location off must take effect at once, not 'eventually'."""
    user = make_user(db)
    record_consent(db, user, ["location"], granted=True)
    assert requires_active_consent(user, "location") is True

    record_consent(db, user, ["location"], granted=False, note="settings_toggle")

    assert user.consent_location is False
    assert requires_active_consent(user, "location") is False

    rows = (
        db.query(ConsentRecord)
        .filter(ConsentRecord.user_id == user.id, ConsentRecord.purpose == "location")
        .order_by(ConsentRecord.id)
        .all()
    )
    assert [r.granted for r in rows] == [True, False]


def test_history_is_append_only(db):
    """Each decision appends; earlier rows are never rewritten."""
    user = make_user(db)
    record_consent(db, user, ["cookies"], granted=True)
    record_consent(db, user, ["cookies"], granted=False)
    record_consent(db, user, ["cookies"], granted=True)

    rows = (
        db.query(ConsentRecord)
        .filter(ConsentRecord.user_id == user.id)
        .order_by(ConsentRecord.id)
        .all()
    )
    assert len(rows) == 3
    assert [r.granted for r in rows] == [True, False, True]
    assert user.consent_cookies is True


def test_unknown_purpose_is_rejected(db):
    from fastapi import HTTPException

    user = make_user(db)
    with pytest.raises(HTTPException) as exc:
        record_consent(db, user, ["not_a_real_purpose"], granted=True)
    assert exc.value.status_code == 400


def test_string_truthy_values_are_normalised(db):
    """Mobile clients may send "true"/"false" strings."""
    user = make_user(db)
    record_consent(db, user, ["sms"], granted=True)
    assert user.consent_sms is True

    record_consent(db, user, ["sms"], granted="false")
    assert user.consent_sms is False


def test_serialize_consent_reports_required_state(db):
    user = make_user(db)
    payload = serialize_consent(user)

    assert payload["has_all_required"] is False
    assert set(payload["consent"].keys()) == set(ALL_PURPOSES)
    assert payload["policy_version"] is None

    record_consent(db, user, ["terms", "privacy"], granted=True)
    assert serialize_consent(user)["has_all_required"] is True


def test_consent_record_tracks_version_and_withdrawal_state(db):
    user = make_user(db)
    record_consent(db, user, ["location"], granted=True, source="mobile")
    record_consent(db, user, ["location"], granted=False, source="settings")

    rows = db.query(ConsentRecord).filter(ConsentRecord.user_id == user.id).all()
    assert rows[0].consent_type == "LOCATION"
    assert rows[0].status == "granted"
    assert rows[0].document_version == POLICY_VERSION
    assert rows[1].status == "withdrawn"
    assert rows[1].withdrawal_timestamp is not None


def test_privacy_requests_create_for_current_user(db):
    user = make_user(db)
    request = create_privacy_request(
        PrivacyRequestCreate(request_type="access", reason="Need my data"),
        db,
        user,
    )
    stored = db.query(PrivacyRequest).filter_by(id=request["request"]["id"]).one()
    event = db.query(PrivacyRequestEvent).filter_by(request_id=stored.id).one()

    assert stored.user_id == user.id
    assert stored.request_type == "access"
    assert stored.status == "open"
    assert event.to_status == "open"


def test_privacy_request_transitions_are_admin_only_and_audited(db):
    user = make_user(db)
    admin = make_user(db, email="staff@example.com")
    admin.role = "admin"
    db.commit()
    created = create_privacy_request(
        PrivacyRequestCreate(request_type="correction", reason="Correct profile"), db, user
    )
    request_id = created["request"]["id"]

    assert verify_admin_role(admin) is admin
    review_privacy_request(
        request_id,
        PrivacyRequestReview(status="reviewing", admin_note="Internal review note"),
        db,
        admin,
    )
    review_privacy_request(
        request_id,
        PrivacyRequestReview(status="processing", admin_note="Processing request"),
        db,
        admin,
    )
    review_privacy_request(
        request_id,
        PrivacyRequestReview(status="completed", admin_note="Completed"),
        db,
        admin,
    )

    stored = db.query(PrivacyRequest).filter_by(id=request_id).one()
    events = db.query(PrivacyRequestEvent).filter_by(request_id=request_id).all()
    user_view = list_privacy_requests(db, user)
    assert stored.status == "completed"
    assert [event.to_status for event in events] == ["open", "reviewing", "processing", "completed"]
    assert "admin_notes" not in user_view["requests"][0]
    assert "Internal review note" not in str(user_view)


def test_ordinary_user_cannot_become_privacy_request_reviewer(db):
    user = make_user(db)
    with pytest.raises(HTTPException) as exc:
        verify_admin_role(user)
    assert exc.value.status_code == 403


def test_export_request_is_completed_only_after_export_is_prepared(db):
    user = make_user(db)

    result = export_user_data(db, user)

    request = db.query(PrivacyRequest).filter_by(user_id=user.id, request_type="export").one()
    events = db.query(PrivacyRequestEvent).filter_by(request_id=request.id).all()
    assert result["success"] is True
    assert request.status == "completed"
    assert [event.to_status for event in events] == ["open", "completed"]
    assert "password" not in result["export"]["user"]


def test_withdraw_consent_without_body_is_completed(db):
    user = make_user(db)

    result = withdraw_consent(None, db, user)

    request = db.query(PrivacyRequest).filter_by(user_id=user.id, request_type="withdrawal").one()
    assert result["success"] is True
    assert request.status == "completed"