"""Consent audit trail.

``ConsentRecord`` is an immutable, timestamped log of every consent decision a
user makes: which policy, which version, granted or withdrawn, from where.

The *current* consent state lives as boolean flags on ``User`` (see
``app/models/user.py``) so authorisation checks on hot paths never scan
history. This table exists to prove **when** someone agreed to **what**, which
is what makes a withdrawal defensible under DPDP 2023 and GDPR Article 7.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


# Consents a user must give to hold an account at all.
REQUIRED_PURPOSES = ("terms", "privacy")

# Optional consents, each individually switchable. All default to False.
OPTIONAL_PURPOSES = ("cookies", "marketing_email", "location", "documents", "sms")

ALL_PURPOSES = REQUIRED_PURPOSES + OPTIONAL_PURPOSES


class ConsentRecord(Base):
    """One timestamped consent decision. Rows are append-only."""

    __tablename__ = "consent_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # One of ALL_PURPOSES.
    purpose = Column(
        String,
        nullable=False,
        index=True,
    )

    # Normalised consent purpose, e.g. "MARKETING_EMAIL".
    consent_type = Column(
        String,
        nullable=True,
        index=True,
    )

    # "granted" or "withdrawn" to represent the final status of this event.
    status = Column(
        String,
        nullable=False,
        default="granted",
    )

    # Version of the policy text actually presented, e.g. "2026-09-12".
    policy_version = Column(
        String,
        nullable=True,
    )

    # Effective policy document version that governed the decision.
    document_version = Column(
        String,
        nullable=True,
    )

    granted = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # "web" | "ios" | "android"
    source = Column(
        String,
        nullable=True,
    )

    # Free-form marker, e.g. "banner_accept_all" or "settings_toggle".
    note = Column(
        String,
        nullable=True,
    )

    ip_address = Column(
        String,
        nullable=True,
    )

    withdrawal_timestamp = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    consent_metadata = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", backref="consent_records")