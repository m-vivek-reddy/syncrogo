"""Anonymous, consent-gated analytics ingestion.

The web app batches events client-side and POSTs them here. Events are
stored WITHOUT any user identifier — no account, no IP, no fingerprint —
because analytics is an optional cookie category the user can decline.

Storage is intentionally minimal: a single flat table the admin dashboard
or a script can aggregate. If traffic grows, swap the write for a queue
(Redis stream / Kafka) without changing the client contract.
"""

from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

_EVENT_TYPE = Literal[
    "page_view",
    "cta_click",
    "ride_search",
    "ride_offer",
]


class AnalyticsEventIn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    path: Optional[str] = Field(default=None, max_length=512)
    referrer: Optional[str] = Field(default=None, max_length=512)
    properties: Optional[dict[str, Any]] = None
    ts: int


class AnalyticsBatchIn(BaseModel):
    events: List[AnalyticsEventIn] = Field(min_length=1, max_length=50)


# In-memory ring buffer: keeps the newest 5000 events per process.
# Cheap, zero-migration, and fine while traffic is small. Persist to the
# database only once you actually need historical queries.
_BUFFER: list[dict[str, Any]] = []
_BUFFER_MAX = 5000


@router.post("/event")
async def ingest_events(
    batch: AnalyticsBatchIn,
    request: Request,
) -> dict:
    """Accept a batch of anonymous events.

    NOTE: deliberately does NOT read X-Forwarded-For or request.client —
    storing IPs here would turn an anonymous analytics feed into personal
    data under DPDP/GDPR and require a legal basis we don't have.
    """
    for event in batch.events:
        _BUFFER.append(
            {
                "name": event.name,
                "path": event.path,
                "referrer": event.referrer,
                "properties": event.properties,
                "ts": event.ts,
            }
        )

    # Trim oldest when over capacity.
    if len(_BUFFER) > _BUFFER_MAX:
        del _BUFFER[: len(_BUFFER) - _BUFFER_MAX]

    return {"accepted": len(batch.events), "buffered": len(_BUFFER)}


@router.get("/summary")
async def analytics_summary() -> dict:
    """Rough aggregate for the admin dashboard (counts per event type)."""
    counts: dict[str, int] = {}
    for e in _BUFFER:
        counts[e["name"]] = counts.get(e["name"], 0) + 1
    return {"total": len(_BUFFER), "counts": counts}
