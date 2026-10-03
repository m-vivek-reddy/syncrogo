from datetime import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel


class DocumentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentResponse(BaseModel):
    id: int
    user_id: int
    document_type: str
    status: DocumentStatus
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusUpdate(BaseModel):
    status: DocumentStatus


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]