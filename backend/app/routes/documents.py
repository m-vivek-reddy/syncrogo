import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.document import Document
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", status_code=status.HTTP_201_CREATED)
def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    new_doc = Document(
        user_id=current_user.id,
        document_type=document_type,
        file_path=file_path,
        status="pending"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {
        "message": "Document uploaded successfully",
        "filename": file.filename,
        "status": new_doc.status,
        "document_id": new_doc.id,
    }
