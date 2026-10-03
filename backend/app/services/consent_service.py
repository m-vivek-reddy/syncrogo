"""Consent capture and withdrawal.

Every decision appends a ``ConsentRecord`` (immutable audit trail) and then
mirrors the latest value onto the ``User`` flags (fast authorisation checks).

Withdrawal is honoured immediately: the flag flips to False in the same
transaction as the audit row, so a user turning off location sharing stops
being tracked before the request returns.
"""

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.consent import (
    ALL_PURPOSES,
    OPTIONAL_PURPOSES,
    REQUIRED_PURPOSES,
    ConsentRecord,
)
from app.models.user import User

# Bump when the published policy text changes materially. Recorded with every
# consent so a later withdrawal can be tied to the text that was agreed to.
POLICY_VERSION = "2026-09-12"

# Maps a purpose to the User column that mirrors its current value.
_FLAG_BY_PURPOSE = {
    "terms": "consent_terms",
    "privacy": "consent_privacy",
    "cookies": "consent_cookies",
    "marketing_email": "consent_marketing_email",
    "location": "consent_location",
    "documents": "consent_documents",
    "sms": "consent_sms",
}


def _validate_purposes(purposes) -> list:
    if not purposes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one consent purpose is required.",
        )
    unknown = [p for p in purposes if p not in ALL_PURPOSES]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown consent purpose(s): {', '.join(unknown)}.",
        )
    return list(purposes)


def _normalise_bool(value) -> bool:
    """Coerce the many truthy shapes clients send into a strict bool."""
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "on"}
    return bool(value)


def record_consent(
    db: Session,
    user: User,
    purposes,
    granted: bool = True,
    source: str = None,
    note: str = None,
    ip_address: str = None,
    policy_version: str = POLICY_VERSION,
) -> User:
    """Append audit rows and mirror the decision onto the user flags.

    ``granted=False`` is a withdrawal. It is always permitted — including for
    the required policies, which does not delete the account but stops further
    processing and leaves the account flagged so the client can prompt.
    """
    purposes = _validate_purposes(purposes)
    granted = _normalise_bool(granted)

    for purpose in purposes:
        now = datetime.now(timezone.utc)
        consent_payload = {
            "source": source,
            "note": note,
            "ip_address": ip_address,
            "policy_version": policy_version,
        }
        consent_payload = {key: value for key, value in consent_payload.items() if value is not None}
        db.add(
            ConsentRecord(
                user_id=user.id,
                purpose=purpose,
                consent_type=purpose.upper(),
                status="granted" if granted else "withdrawn",
                policy_version=policy_version,
                document_version=policy_version,
                granted=granted,
                source=source,
                note=note,
                ip_address=ip_address,
                withdrawal_timestamp=now if not granted else None,
                consent_metadata=json.dumps(consent_payload) if consent_payload else None,
            )
        )
        setattr(user, _FLAG_BY_PURPOSE[purpose], granted)

    user.consent_recorded_at = datetime.now(timezone.utc)
    user.consent_policy_version = policy_version

    db.commit()
    db.refresh(user)
    return user


def assert_required_consent(user: User, terms: bool, privacy: bool) -> None:
    """Registration gate — terms and privacy must both be explicitly accepted."""
    missing = []
    if not _normalise_bool(terms):
        missing.append("terms and conditions")
    if not _normalise_bool(privacy):
        missing.append("privacy policy")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You must agree to the "
                + " and ".join(missing)
                + " before creating a SyncroGo account."
            ),
        )


def serialize_consent(user: User) -> dict:
    """Current consent state plus a full history for the user's own view."""
    flags = {p: bool(getattr(user, _FLAG_BY_PURPOSE[p], False)) for p in ALL_PURPOSES}
    return {
        "consent": flags,
        "policy_version": user.consent_policy_version,
        "recorded_at": (
            user.consent_recorded_at.isoformat()
            if user.consent_recorded_at
            else None
        ),
        "required": list(REQUIRED_PURPOSES),
        "optional": list(OPTIONAL_PURPOSES),
        "has_all_required": all(flags[p] for p in REQUIRED_PURPOSES),
    }


def serialize_consent_history(records) -> list:
    """Audit trail, newest first, for display in account settings."""
    return [
        {
            "id": r.id,
            "purpose": r.purpose,
            "consent_type": r.consent_type,
            "status": r.status,
            "granted": r.granted,
            "policy_version": r.policy_version,
            "document_version": r.document_version,
            "source": r.source,
            "note": r.note,
            "withdrawal_timestamp": r.withdrawal_timestamp.isoformat() if r.withdrawal_timestamp else None,
            "metadata": json.loads(r.consent_metadata) if r.consent_metadata else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


def requires_active_consent(user: User, purpose: str) -> bool:
    """Whether a processing activity is currently permitted for this user."""
    if purpose not in ALL_PURPOSES:
        return False
    return bool(getattr(user, _FLAG_BY_PURPOSE[purpose], False))