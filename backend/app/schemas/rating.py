from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class RatingCreate(BaseModel):
    ride_id: int
    # Field validation ensures the API rejects any score outside 1-5
    score: int = Field(ge=1, le=5, description="Score must be between 1 and 5")
    feedback: Optional[str] = None

class RatingResponse(BaseModel):
    id: int
    ride_id: int
    reviewer_id: int
    reviewee_id: int
    score: int
    feedback: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class RatingSummaryResponse(BaseModel):
    user_id: int
    average_score: float
    review_count: int

    class Config:
        from_attributes = True