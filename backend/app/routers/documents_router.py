"""
Router Documents — SI-SMQ
Métadonnées (JSON) et upload fichier (multipart) séparés intentionnellement.
Workflow statut : brouillon → valide → archive.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_current_user,
    get_current_active_admin,
    get_current_pilote_ou_admin,
)
from app.models.utilisateur import Utilisateur
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentChangerStatut,
    DocumentResponse,
    DocumentResponseDetail,
    DocumentListResponse,
)
from app.services import document_service

router = APIRouter(prefix="/api/documents", tags=["Documents (GED)"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]
AdminUser     = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=DocumentListResponse,
    summary="Lister les documents (paginé, filtres actifs retournés)",
)
def lister_documents(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    processus_id: int | None = None,
    statut: str | None = None,
    confidentiel: bool | None = None,
):
    """
    La liste retourne DocumentResponse (sans URL présignée — génération coûteuse).
    Les filtres actifs sont inclus dans la réponse pour faciliter l'UI.
    """
    return document_service.lister_documents(
        db,
        page=page,
        par_page=par_page,
        processus_id=processus_id,
        statut=statut,
        confidentiel=confidentiel,
        demandeur=user,
    )


@router.post(
    "/",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un document — métadonnées uniquement (JSON)",
)
def creer_document(
    payload: DocumentCreate,
    db: DbDep,
    user: CurrentUser,
):
    """
    Étape 1 : créer les métadonnées du document (titre, processus, confidentialité…).
    Étape 2 : uploader le fichier via POST /documents/{id}/upload.

    Ne jamais fusionner les deux dans un seul endpoint.
    """
    return document_service.creer_document(db, payload=payload, createur=user)


@router.post(
    "/{document_id}/upload",
    response_model=DocumentResponseDetail,
    summary="Uploader le fichier du document (multipart/form-data)",
)
def upload_fichier(
    document_id: int,
    db: DbDep,
    user: CurrentUser,
    fichier: UploadFile = File(...),
):
    """
    Upload multipart séparé des métadonnées.
    - MIME whitelist vérifiée (PDF, DOCX, XLSX, PNG, JPEG…)
    - Taille max : 50 Mo
    - L'ancien fichier MinIO est supprimé avant remplacement
    - Chemin structuré : documents/2025/PROC-CODE/DOC-REF.pdf
    """
    return document_service.upload_fichier(
        db,
        document_id=document_id,
        fichier=fichier,
        uploadeur=user,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponseDetail,
    summary="Détail d'un document avec URL présignée",
)
def get_document(document_id: int, db: DbDep, user: CurrentUser):
    """
    Retourne l'URL présignée MinIO :
    - 1h si document confidentiel
    - 24h sinon
    Le champ minio_path n'est exposé qu'aux administrateurs.
    """
    return document_service.get_document(
        db, document_id=document_id, demandeur=user
    )


@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Modifier les métadonnées d'un document (patch partiel)",
)
def modifier_document(
    document_id: int,
    payload: DocumentUpdate,
    db: DbDep,
    user: CurrentUser,
):
    """
    Le champ minio_path n'est jamais modifiable via cet endpoint.
    """
    return document_service.modifier_document(
        db, document_id=document_id, payload=payload, demandeur=user
    )


@router.post(
    "/{document_id}/statut",
    response_model=DocumentResponse,
    summary="Changer le statut du document",
)
def changer_statut(
    document_id: int,
    payload: DocumentChangerStatut,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Workflow : brouillon → valide → archive.
    Un commentaire est obligatoire pour l'archivage.
    L'historique des statuts est conservé.
    """
    return document_service.changer_statut(
        db,
        document_id=document_id,
        payload=payload,
        demandeur=user,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer un document (admin uniquement)",
)
def supprimer_document(
    document_id: int,
    db: DbDep,
    admin: AdminUser,
):
    """
    Refuse la suppression si statut=valide (archiver d'abord).
    Supprime le fichier MinIO de manière synchrone.
    """
    document_service.supprimer_document(
        db, document_id=document_id, demandeur=admin
    )