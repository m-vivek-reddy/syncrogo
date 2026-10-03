import asyncio
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.datastructures import Headers, UploadFile

from app.db.base import Base
from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.routes import documents as documents_route
from app.routes.admin import list_all_documents
from app.routes.auth import get_current_user
from app.services.driver_verification import normalize_document_type

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def make_user(db, email, role):
    user = User(email=email, full_name=email, role=role, password="hashed", is_verified=True)
    db.add(user)
    db.commit()
    return user


def test_private_document_access_owner_cross_user_passenger_admin_and_anonymous(tmp_path, monkeypatch):
    db = make_session()
    owner = make_user(db, "owner@example.com", "driver")
    other = make_user(db, "other@example.com", "passenger")
    admin = make_user(db, "admin@example.com", "admin")
    private_dir = tmp_path / "private-documents"
    private_dir.mkdir()
    monkeypatch.setattr(documents_route, "UPLOAD_DIR", private_dir)
    private_file = private_dir / "driver-license.pdf"
    private_file.write_bytes(b"private")
    document = Document(
        user_id=owner.id,
        document_type="license",
        file_path=str(private_file),
        status="approved",
    )
    db.add(document)
    db.commit()

    owner_response = documents_route.download_document(document.id, db, owner)
    assert owner_response.media_type == "application/pdf"
    assert "inline" in owner_response.headers["content-disposition"]

    with pytest.raises(HTTPException) as other_error:
        documents_route.download_document(document.id, db, other)
    assert other_error.value.status_code == 403

    with pytest.raises(HTTPException) as passenger_error:
        documents_route.download_document(document.id, db, other)
    assert passenger_error.value.status_code == 403

    assert documents_route.download_document(document.id, db, admin).media_type == "application/pdf"

    app = FastAPI()
    app.include_router(documents_route.router)

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        assert client.get(f"/api/v1/documents/{document.id}/file").status_code == 401
        app.dependency_overrides[get_current_user] = lambda: owner
        assert client.get(f"/api/v1/documents/{document.id}/file").status_code == 200
        app.dependency_overrides[get_current_user] = lambda: other
        assert client.get(f"/api/v1/documents/{document.id}/file").status_code == 403


def test_document_path_traversal_is_rejected(tmp_path, monkeypatch):
    db = make_session()
    owner = make_user(db, "path-owner@example.com", "driver")
    private_dir = tmp_path / "private-documents"
    private_dir.mkdir()
    outside = tmp_path / "outside.pdf"
    outside.write_bytes(b"not private storage")
    monkeypatch.setattr(documents_route, "UPLOAD_DIR", private_dir)
    document = Document(user_id=owner.id, document_type="license", file_path=str(outside), status="pending")
    db.add(document)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        documents_route.download_document(document.id, db, owner)
    assert exc.value.status_code == 400


def test_admin_document_response_excludes_filesystem_path(tmp_path):
    db = make_session()
    owner = make_user(db, "doc-owner@example.com", "driver")
    admin = make_user(db, "doc-admin@example.com", "admin")
    raw_path = str(tmp_path / "secret" / "license.pdf")
    db.add(Document(user_id=owner.id, document_type="driving_licence", file_path=raw_path, status="verified"))
    db.commit()

    response = list_all_documents(
        SimpleNamespace(url_for=lambda *_args, **_kwargs: "https://api.invalid/api/v1/documents/1/file"),
        db,
        admin,
    )

    assert response[0]["document_type"] == "license"
    assert response[0]["status"] == "approved"
    assert response[0]["file_url"].endswith("/api/v1/documents/1/file")
    assert "file_path" not in response[0]
    assert raw_path not in str(response)


def test_upload_rejects_unknown_document_type():
    db = make_session()
    owner = make_user(db, "upload-owner@example.com", "driver")
    upload = UploadFile(
        filename="file.pdf",
        file=BytesIO(b"private"),
        headers=Headers({"content-type": "application/pdf"}),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(documents_route.upload_document(SimpleNamespace(), "arbitrary", upload, db, owner))
    assert exc.value.status_code == 400
    assert normalize_document_type("arbitrary") is None


def test_upload_filesystem_error_does_not_expose_path(tmp_path, monkeypatch):
    db = make_session()
    owner = make_user(db, "upload-error@example.com", "driver")
    monkeypatch.setattr(documents_route, "UPLOAD_DIR", tmp_path)

    def fail_open(*_args, **_kwargs):
        raise OSError("C:\\private\\mount\\secret")

    monkeypatch.setattr("builtins.open", fail_open)
    upload = UploadFile(
        filename="license.pdf",
        file=BytesIO(b"private"),
        headers=Headers({"content-type": "application/pdf"}),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(documents_route.upload_document(SimpleNamespace(), "license", upload, db, owner))
    assert exc.value.status_code == 500
    assert "secret" not in exc.value.detail
    assert "private\\mount" not in exc.value.detail
