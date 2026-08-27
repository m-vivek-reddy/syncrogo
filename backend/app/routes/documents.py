import os
import shutil
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def serialize_document(document: Document, request: Request) -> dict:
    return {
        "id": document.id,
        "document_type": document.document_type,
        "status": document.status,
        "uploaded_at": document.uploaded_at,
        "file_url": str(request.base_url.replace(path=f"/uploads/{Path(document.file_path).name}")),
    }


@router.get("/")
def list_documents(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return {"documents": [serialize_document(document, request) for document in documents]}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected for upload.",
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: JPG, PNG, WEBP, PDF.",
        )

    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only standard images and PDFs are permitted.",
        )

    # Read content to enforce file size limit
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the maximum limit of 10 MB.",
        )

    # Generate safe random filename
    safe_filename = f"{uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save upload: {str(e)}"
        )

    new_doc = Document(
        user_id=current_user.id,
        document_type=document_type.strip(),
        file_path=file_path,
        status="pending"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {
        "message": "Document uploaded successfully",
        "filename": safe_filename,
        "status": new_doc.status,
        "document_id": new_doc.id,
        "document": serialize_document(new_doc, request),
    }
