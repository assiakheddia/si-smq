from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.document import StatutDocument
from app.services import document_service
from app.schemas.document import (
    DocumentUpdate, DocumentResponse, DocumentResponseDetail,
    DocumentChangerStatut, DocumentCreate, TypeDocument,
)

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.get("/", response_model=List[DocumentResponse])
def lister_documents(
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
    processus_code: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    taille_page: int = Query(20, ge=1, le=100),
):
    statut_enum = StatutDocument(statut) if statut else None
    result = document_service.lister_documents(
        db, processus_code=processus_code, statut=statut_enum,
        tag=tag, page=page, taille_page=taille_page
    )
    return result["items"]


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def creer_document(
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Crée les métadonnées. Uploader ensuite le fichier via POST /{id}/upload."""
    return document_service.creer_document(db, data, current_user)


@router.post("/{id}/upload", response_model=DocumentResponse)
def upload_fichier(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Upload le fichier vers MinIO et lie au document existant."""
    return document_service.upload_fichier(db, id, file, current_user)


@router.get("/{id}", response_model=DocumentResponseDetail)
def get_document(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    result = document_service.get_document(db, id, current_user)
    doc = result["document"]
    doc.url_telechargement = result["url_telechargement"]
    doc.minio_path = result["minio_path"]
    return doc


@router.put("/{id}", response_model=DocumentResponse)
def update_document(
    id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return document_service.modifier_document(db, id, data, current_user)


@router.post("/{id}/statut", response_model=DocumentResponse)
def changer_statut(
    id: int,
    data: DocumentChangerStatut,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return document_service.changer_statut(db, id, data, current_user)


@router.delete("/{id}")
def delete_document(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return document_service.supprimer_document(db, id, current_user)


@router.get("/{id}/download")
def download_document(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    result = document_service.get_document(db, id, current_user)
    url = result["url_telechargement"]
    if not url:
        raise HTTPException(status_code=404, detail="Aucun fichier uploadé pour ce document.")
    return {"url": url}