import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.routes.auth import get_current_user
from app.services.driver_verification import (
    normalize_document_status,
    normalize_document_type,
)

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR = UPLOAD_ROOT / "documents"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
ALLOWED_DOCUMENT_TYPES = {
    "aadhaar",
    "pan",
    "license",
    "rc_book",
    "vehicle_insurance",
    "pollution_certificate",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def _resolve_private_document_path(file_path: str) -> Path:
    candidate = Path(file_path)
    if not candidate.is_absolute():
        candidate = (UPLOAD_ROOT / candidate).resolve()
    return candidate.resolve()


def serialize_document(document: Document, request: Request) -> dict:
    return {
        "id": document.id,
        "document_type": normalize_document_type(document.document_type) or document.document_type,
        "status": normalize_document_status(document.status),
        "uploaded_at": document.uploaded_at,
        "file_url": str(request.url_for("download_document", document_id=document.id)),
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


@router.get("/{document_id}/file")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if document.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this document.")

    file_path = _resolve_private_document_path(document.file_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found.")
    if UPLOAD_DIR.resolve() not in file_path.parents and file_path.resolve() != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document path.")

    media_type, _ = mimetypes.guess_type(file_path.name)
    if media_type not in {"image/jpeg", "image/png", "image/webp", "application/pdf"}:
        media_type = "application/octet-stream"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_path.name,
        content_disposition_type="inline",
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected for upload.",
        )

    normalized_document_type = normalize_document_type(document_type)
    if normalized_document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document type.",
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

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the maximum limit of 10 MB.",
        )

    safe_filename = f"{uuid4().hex}{file_ext}"
    file_path = (UPLOAD_DIR / safe_filename).resolve()

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save document upload.",
        ) from exc

    new_doc = Document(
        user_id=current_user.id,
        document_type=normalized_document_type,
        file_path=str(file_path),
        status="pending",
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
