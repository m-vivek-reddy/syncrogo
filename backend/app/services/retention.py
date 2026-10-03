"""Retention classifications. Durations remain unset pending legal review."""

RETENTION_POLICY = {
    "ACCOUNT": {"action": "ANONYMIZE", "retention_days": None, "legal_review_required": True},
    "ACTIVE_OPERATIONAL": {"action": "BLOCK_UNTIL_RESOLVED", "retention_days": None, "legal_review_required": True},
    "HISTORICAL_RIDE_BOOKING": {"action": "RETAIN_LINKED_TO_ANONYMIZED_ACCOUNT", "retention_days": None, "legal_review_required": True},
    "FINANCIAL": {"action": "RETAIN_FOR_LEDGER_INTEGRITY", "retention_days": None, "legal_review_required": True},
    "SECURITY_FRAUD": {"action": "RETAIN_LINKED_TO_ANONYMIZED_ACCOUNT", "retention_days": None, "legal_review_required": True},
    "DRIVER_VERIFICATION": {"action": "RETAIN_METADATA_DELETE_PRIVATE_FILE", "retention_days": None, "legal_review_required": True},
    "SOS_SAFETY": {"action": "RETAIN_LINKED_TO_ANONYMIZED_ACCOUNT", "retention_days": None, "legal_review_required": True},
    "CONSENT_AUDIT": {"action": "RETAIN_IMMUTABLE_HISTORY", "retention_days": None, "legal_review_required": True},
    "PROFILE_PHOTO": {"action": "DELETE_PRIVATE_FILE", "retention_days": None, "legal_review_required": True},
    "EMERGENCY_CONTACT": {"action": "DELETE_USER_OWNED_RECORD", "retention_days": None, "legal_review_required": True},
    "VEHICLE": {"action": "DELETE_USER_OWNED_RECORD", "retention_days": None, "legal_review_required": True},
}

DEFAULT_LEGAL_HOLD_REASONS = (
    "dispute",
    "fraud_investigation",
    "security_incident",
    "legal_obligation",
)
