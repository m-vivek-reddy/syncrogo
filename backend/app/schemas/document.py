from datetime import datetime
from typing import List

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    user_id: int
    document_type: str
    file_path: str
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusUpdate(BaseModel):
    status: str


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]