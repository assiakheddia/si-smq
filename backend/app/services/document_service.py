"""
services/document_service.py — GED minimaliste + stockage MinIO

Responsabilités :
  - CRUD métadonnées documents
  - Upload fichier vers MinIO (chemin structuré)
  - Génération URL présignée (durée selon confidentialité)
  - Workflow : brouillon → valide → archive
  - Suppression fichier MinIO à la suppression document

Référence générée : "DOC-PROC-LABO-ACHAT-001"
Chemin MinIO       : "documents/2025/PROC-LABO-ACHAT/DOC-PROC-LABO-ACHAT-001.pdf"

Dépendance MinIO :
  pip install minio
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from minio import Minio
from minio.error import S3Error
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document, StatutDocument
from app.models.processus import Processus
from app.models.utilisateur import Utilisateur
from app.schemas.document import DocumentChangerStatut, DocumentCreate, DocumentUpdate

logger = logging.getLogger(__name__)
settings = get_settings()

# Taille maximale de fichier : 50 Mo
_TAILLE_MAX_OCTETS = 50 * 1024 * 1024

# MIME types autorisés
_MIME_AUTORISES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
}


# ---------------------------------------------------------------------------
# Client MinIO (singleton lazy)
# ---------------------------------------------------------------------------

_minio_client: Minio | None = None


def _get_minio() -> Minio:
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        # Créer le bucket si inexistant
        if not _minio_client.bucket_exists(settings.MINIO_BUCKET_DOCUMENTS):
            _minio_client.make_bucket(settings.MINIO_BUCKET_DOCUMENTS)
            logger.info("Bucket MinIO créé : %s", settings.MINIO_BUCKET_DOCUMENTS)
    return _minio_client


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_ou_404(db: Session, document_id: int) -> Document:
    d = db.query(Document).filter(Document.id == document_id).first()
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} introuvable.",
        )
    return d


def _generer_reference(db: Session, processus_code: str) -> str:
    count = (
        db.query(Document)
        .filter(Document.reference.like(f"DOC-{processus_code}-%"))
        .count()
    )
    return f"DOC-{processus_code}-{count + 1:03d}"


def _construire_chemin_minio(
    reference: str,
    processus_code: str | None,
    nom_fichier: str,
) -> str:
    """
    Construit le chemin MinIO structuré.
    Format : documents/2025/PROC-LABO-ACHAT/DOC-PROC-LABO-ACHAT-001.pdf
    """
    annee = datetime.now(tz=timezone.utc).year
    dossier = processus_code or "GENERAL"
    extension = nom_fichier.rsplit(".", 1)[-1] if "." in nom_fichier else "bin"
    return f"documents/{annee}/{dossier}/{reference}.{extension}"


def _generer_url_presignee(minio_path: str, est_confidentiel: bool) -> str | None:
    """Génère une URL présignée MinIO selon la durée de confidentialité."""
    if not minio_path:
        return None
    try:
        from datetime import timedelta
        duree = timedelta(
            seconds=(
                settings.MINIO_PRESIGNED_EXPIRE_CONFIDENTIEL_SECONDS
                if est_confidentiel
                else settings.MINIO_PRESIGNED_EXPIRE_SECONDS
            )
        )
        return _get_minio().presigned_get_object(
            settings.MINIO_BUCKET_DOCUMENTS,
            minio_path,
            expires=duree,
        )
    except S3Error as exc:
        logger.warning("Impossible de générer l'URL présignée pour %s : %s", minio_path, exc)
        return None


# ---------------------------------------------------------------------------
# Cartographie des transitions de statut valides (§7.5.3 ISO 9001)
# ---------------------------------------------------------------------------

_TRANSITIONS_VALIDES = {
    StatutDocument.brouillon: [StatutDocument.en_revue],
    StatutDocument.en_revue:  [StatutDocument.approuve, StatutDocument.brouillon],
    StatutDocument.approuve:  [StatutDocument.obsolete, StatutDocument.archive],
    StatutDocument.archive:   [StatutDocument.approuve],  # Désarchivage restreint
    StatutDocument.obsolete:  [],  # État terminal de rétention historique
}

# ---------------------------------------------------------------------------
# §1 — Création (métadonnées uniquement)
# ---------------------------------------------------------------------------

def creer_document(
    db: Session,
    payload: DocumentCreate,
    uploadeur: Utilisateur,
) -> Document:
    """
    Crée un document en statut brouillon (métadonnées uniquement).
    Le fichier est uploadé séparément via upload_fichier().

    Raises:
        HTTPException 404 — processus introuvable.
    """
    processus_id = None
    if payload.processus_code:
        processus = db.query(Processus).filter(
            Processus.code == payload.processus_code
        ).first()
        if not processus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Processus '{payload.processus_code}' introuvable.",
            )
        processus_id = processus.id

    reference = _generer_reference(db, payload.processus_code or "GENERAL")

    document = Document(
        reference=reference,
        titre=payload.titre,
        type=payload.type_document,
        description=payload.description,
        version=payload.version,
        processus_id=processus_id,
        est_confidentiel=payload.est_confidentiel,
        statut=StatutDocument.brouillon,
        auteur_id=uploadeur.id,
        chemin_minio=None,
        taille_octets=None,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(
        "Document créé : %s ('%s') par %s",
        reference, document.titre, uploadeur.email,
    )
    return document


# ---------------------------------------------------------------------------
# §2 — Upload fichier MinIO
# ---------------------------------------------------------------------------

def upload_fichier(
    db: Session,
    document_id: int,
    fichier: UploadFile,
    uploadeur: Utilisateur,
) -> Document:
    """
    Upload le fichier vers MinIO et met à jour les métadonnées du document.

    - Vérifie le MIME type et la taille
    - Chemin MinIO structuré
    - Un upload remplace l'ancien fichier (même référence, nouveau chemin si extension change)

    Raises:
        HTTPException 404 — document introuvable.
        HTTPException 400 — MIME type non autorisé ou fichier trop volumineux.
        HTTPException 400 — document non modifiable (valide/archivé sans droits).
    """
    document = _get_ou_404(db, document_id)

    # Seul le brouillon accepte un upload libre ; valide/archivé nécessite droits
    if document.statut != StatutDocument.brouillon and not uploadeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Remplacement de fichier sur document validé réservé aux pilotes/admins.",
        )

    # Vérification MIME
    mime_type = fichier.content_type or "application/octet-stream"
    if mime_type not in _MIME_AUTORISES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non autorisé : '{mime_type}'.",
        )

    # Lecture et vérification taille
    contenu = fichier.file.read()
    taille = len(contenu)
    if taille > _TAILLE_MAX_OCTETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fichier trop volumineux ({taille // 1024 // 1024} Mo). Maximum : 50 Mo.",
        )

    # Suppression de l'ancien fichier MinIO si existant
    if document.chemin_minio:
        try:
            _get_minio().remove_object(
                settings.MINIO_BUCKET_DOCUMENTS,
                document.chemin_minio,
            )
        except S3Error as exc:
            logger.warning("Impossible de supprimer l'ancien fichier MinIO : %s", exc)

    # Upload vers MinIO
    processus_code = None
    if document.processus_id:
        processus = db.query(Processus).filter(
            Processus.id == document.processus_id
        ).first()
        processus_code = processus.code if processus else None

    minio_path = _construire_chemin_minio(
        document.reference,
        processus_code,
        fichier.filename or "fichier.bin",
    )

    _get_minio().put_object(
        bucket_name=settings.MINIO_BUCKET_DOCUMENTS,
        object_name=minio_path,
        data=BytesIO(contenu),
        length=taille,
        content_type=mime_type,
    )

    # Mise à jour des métadonnées
    document.chemin_minio = minio_path
    document.taille_octets = taille
    document.mime_type = mime_type
    db.commit()
    db.refresh(document)

    logger.info(
        "Fichier uploadé pour %s : %s (%d octets) par %s",
        document.reference, minio_path, taille, uploadeur.email,
    )
    return document


# ---------------------------------------------------------------------------
# §3 — Lecture
# ---------------------------------------------------------------------------

def lister_documents(
    db: Session,
    processus_code: str | None = None,
    statut: StatutDocument | None = None,
    type_document: str | None = None,
    tag: str | None = None,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(Document)

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(Document.processus_id == processus.id)

    if statut:
        q = q.filter(Document.statut == statut)

    if type_document:
        q = q.filter(Document.type == type_document)

    q = q.order_by(Document.date_modification.desc())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
        "filtre_statut": statut,
        "filtre_type": type_document,
        "filtre_processus_code": processus_code,
        "filtre_tag": tag,
    }


def get_document(
    db: Session,
    document_id: int,
    demandeur: Utilisateur,
) -> dict:
    """
    Retourne le détail d'un document avec URL présignée MinIO.
    Le minio_path n'est exposé qu'aux admins.
    """
    document = _get_ou_404(db, document_id)
    url = _generer_url_presignee(document.chemin_minio, document.est_confidentiel)

    result = {
        "document": document,
        "url_telechargement": url,
        "minio_path": document.chemin_minio if demandeur.peut("administrer") else None,
    }
    return result


# ---------------------------------------------------------------------------
# §4 — Mise à jour métadonnées
# ---------------------------------------------------------------------------

def modifier_document(
    db: Session,
    document_id: int,
    payload: DocumentUpdate,
    modificateur: Utilisateur,
) -> Document:
    """
    Mise à jour partielle des métadonnées.
    Le fichier n'est jamais modifiable via ce service (utiliser upload_fichier).

    Raises:
        HTTPException 404 — document introuvable.
        HTTPException 400 — document archivé non modifiable.
        HTTPException 403 — document validé : droits insuffisants.
    """
    document = _get_ou_404(db, document_id)

    if document.statut == StatutDocument.archive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un document archivé ne peut plus être modifié.",
        )

    if document.statut == StatutDocument.approuve and not modificateur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Modification d'un document validé réservée aux pilotes/admins.",
        )

    if payload.processus_code is not None:
        if payload.processus_code == "":
            document.processus_id = None
        else:
            processus = db.query(Processus).filter(
                Processus.code == payload.processus_code
            ).first()
            if not processus:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Processus '{payload.processus_code}' introuvable.",
                )
            document.processus_id = processus.id

    for champ in ["titre", "type_document", "description", "version", "tags", "est_confidentiel"]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(document, champ, valeur)

    db.commit()
    db.refresh(document)
    logger.info("Document modifié : %s par %s", document.reference, modificateur.email)
    return document


# ---------------------------------------------------------------------------
# §5 — Workflow statut
# ---------------------------------------------------------------------------

def changer_statut(
    db: Session,
    document_id: int,
    payload: DocumentChangerStatut,
    demandeur: Utilisateur,
) -> Document:
    """
    Transitions workflow document.

    brouillon → valide   : pilote/admin, fichier obligatoire
    valide    → archive  : pilote/admin, commentaire obligatoire (validé par schema)
    archive   → valide   : admin uniquement (désarchivage)

    Raises:
        HTTPException 400 — transition invalide ou fichier absent.
        HTTPException 403 — droits insuffisants.
    """
    document = _get_ou_404(db, document_id)
    nouveau_statut = payload.statut
    transitions_possibles = _TRANSITIONS_VALIDES.get(document.statut, [])

    if nouveau_statut not in transitions_possibles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition '{document.statut.value}' → '{nouveau_statut.value}' "
                "non autorisée."
            ),
        )

    if not demandeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Changement de statut réservé aux pilotes et administrateurs.",
        )

    # Désarchivage : admin uniquement
    if document.statut == StatutDocument.archive and not demandeur.peut("administrer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Désarchivage réservé aux administrateurs.",
        )

    # Validation : fichier obligatoire
    if nouveau_statut == StatutDocument.approuve and not document.chemin_minio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de valider un document sans fichier uploadé.",
        )

    document.statut = nouveau_statut
    db.commit()
    db.refresh(document)

    logger.info(
        "Document %s → %s par %s",
        document.reference, nouveau_statut.value, demandeur.email,
    )
    return document


# ---------------------------------------------------------------------------
# §6 — Suppression
# ---------------------------------------------------------------------------

def supprimer_document(
    db: Session,
    document_id: int,
    demandeur: Utilisateur,
) -> dict[str, str]:
    """
    Supprime un document et son fichier MinIO associé.
    Réservé aux administrateurs.

    Raises:
        HTTPException 403 — non admin.
        HTTPException 400 — document validé ne peut pas être supprimé directement
                            (archiver d'abord).
    """
    if not demandeur.peut("administrer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Suppression de document réservée aux administrateurs.",
        )

    document = _get_ou_404(db, document_id)

    if document.statut == StatutDocument.approuve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Un document validé ne peut pas être supprimé directement. "
                "Archivez-le d'abord."
            ),
        )

    # Suppression fichier MinIO
    if document.chemin_minio:
        try:
            _get_minio().remove_object(
                settings.MINIO_BUCKET_DOCUMENTS,
                document.chemin_minio,
            )
            logger.info("Fichier MinIO supprimé : %s", document.chemin_minio)
        except S3Error as exc:
            logger.warning("Impossible de supprimer le fichier MinIO : %s", exc)

    reference = document.reference
    db.delete(document)
    db.commit()

    logger.info("Document supprimé : %s par %s", reference, demandeur.email)
    return {"message": f"Document '{reference}' supprimé définitivement."}