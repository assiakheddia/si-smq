"""
Router Processus — SI-SMQ
CRUD complet + assignation pilote + parties intéressées + score maturité.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_current_user,
    get_current_active_admin,
    get_current_pilote_ou_admin,
)
from app.models.utilisateur import Utilisateur
from app.schemas.processus import (
    ProcessusCreate,
    ProcessusUpdate,
    ProcessusResponse,
    ProcessusListResponse,
    AssignerPiloteRequest,
    AssocierPartiesInteresseesRequest,
    ScoreMaturiteResponse,
)
from app.services import processus_service

router = APIRouter(prefix="/api/processus", tags=["Processus"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]
AdminUser     = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=ProcessusListResponse,
    summary="Lister les processus (paginé, filtrable)",
)
def lister_processus(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    type_processus: str | None = None,
    statut: str | None = None,
    parent_id: int | None = None,
):
    """
    Retourne la liste paginée des processus.
    Filtres optionnels : type, statut, parent (pour naviguer la hiérarchie).
    La hiérarchie est limitée à 3 niveaux (validé dans le service).
    """
    return processus_service.lister_processus(
        db,
        page=page,
        par_page=par_page,
        type_processus=type_processus,
        statut=statut,
        parent_id=parent_id,
    )


@router.post(
    "/",
    response_model=ProcessusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un nouveau processus",
)
def creer_processus(
    payload: ProcessusCreate,
    db: DbDep,
    user: CurrentUser,
):
    """
    Crée un processus via l'API (seul point d'entrée — pas de seed statique).
    Validation : code unique, max 3 niveaux hiérarchiques, pas d'auto-parenté.
    """
    return processus_service.creer_processus(db, payload=payload, createur=user)


@router.get(
    "/{processus_id}",
    response_model=ProcessusResponse,
    summary="Détail d'un processus",
)
def get_processus(processus_id: int, db: DbDep, user: CurrentUser):
    return processus_service.get_processus_ou_404(db, processus_id=processus_id)


@router.patch(
    "/{processus_id}",
    response_model=ProcessusResponse,
    summary="Modifier un processus (patch partiel)",
)
def modifier_processus(
    processus_id: int,
    payload: ProcessusUpdate,
    db: DbDep,
    user: CurrentUser,
):
    """
    Mise à jour partielle. Les champs non fournis restent inchangés.
    La modification du code vérifie l'unicité.
    """
    return processus_service.modifier_processus(
        db, processus_id=processus_id, payload=payload, demandeur=user
    )


@router.delete(
    "/{processus_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer un processus (admin uniquement)",
)
def supprimer_processus(
    processus_id: int,
    db: DbDep,
    admin: AdminUser,
):
    """
    Suppression logique avec détachement manuel des enfants (SET NULL).
    La cascade SQLAlchemy n'est pas utilisée pour les entités métier.
    """
    processus_service.supprimer_processus(db, processus_id=processus_id, demandeur=admin)


@router.put(
    "/{processus_id}/pilote",
    response_model=ProcessusResponse,
    summary="Assigner un pilote au processus",
)
def assigner_pilote(
    processus_id: int,
    payload: AssignerPiloteRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Assigne ou remplace le pilote d'un processus.
    Seuls les pilotes et les admins peuvent effectuer cette opération.
    """
    return processus_service.assigner_pilote(
        db,
        processus_id=processus_id,
        pilote_id=payload.pilote_id,
        demandeur=user,
    )


@router.put(
    "/{processus_id}/parties-interessees",
    response_model=ProcessusResponse,
    summary="Associer les parties intéressées (opération SET — remplace l'existant)",
)
def associer_parties_interessees(
    processus_id: int,
    payload: AssocierPartiesInteresseesRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Opération "set" : la liste fournie remplace entièrement les parties intéressées actuelles.
    Passer une liste vide pour tout dissocier.
    """
    return processus_service.associer_parties_interessees(
        db,
        processus_id=processus_id,
        parties_ids=payload.parties_interessees_ids,
        demandeur=user,
    )


@router.get(
    "/{processus_id}/score-maturite",
    response_model=ScoreMaturiteResponse,
    summary="Score de maturité ISO 9001 du processus",
)
def get_score_maturite(
    processus_id: int,
    db: DbDep,
    user: CurrentUser,
):
    """
    Retourne le score de maturité depuis le dernier diagnostic validé.
    Inclut la validation des prérequis ISO (pilote, KPI, risques analysés…).
    """
    return processus_service.get_score_maturite(db, processus_id=processus_id)