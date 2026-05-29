"""
Router Actions — SI-SMQ
CRUD + workflow statut + vérification efficacité + vue kanban.
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
from app.schemas.action import (
    ActionCreate,
    ActionUpdate,
    ActionResponse,
    ActionListResponse,
    ChangerStatutActionRequest,
    VerifierEfficaciteRequest,
    KanbanResponse,
)
from app.services import action_service

router = APIRouter(prefix="/api/actions", tags=["Actions"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]
AdminUser     = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/kanban",
    response_model=KanbanResponse,
    summary="Vue kanban — actions groupées par statut",
)
def get_kanban(
    db: DbDep,
    user: CurrentUser,
    processus_id: int | None = None,
    responsable_id: int | None = None,
):
    """
    Retourne les actions groupées par statut pour l'affichage kanban.
    Filtrable par processus ou responsable.
    ⚠️ Déclaré avant /{action_id} pour éviter la collision de route.
    """
    return action_service.get_kanban(
        db, processus_id=processus_id, responsable_id=responsable_id
    )


@router.get(
    "/",
    response_model=ActionListResponse,
    summary="Lister les actions (paginé, filtrable)",
)
def lister_actions(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    processus_id: int | None = None,
    statut: str | None = None,
    responsable_id: int | None = None,
    en_retard: bool = False,
):
    """
    Le filtre en_retard=True retourne uniquement les actions dont la date d'échéance
    est dépassée et le statut n'est pas "clos".
    """
    return action_service.lister_actions(
        db,
        page=page,
        par_page=par_page,
        processus_id=processus_id,
        statut=statut,
        responsable_id=responsable_id,
        en_retard=en_retard,
    )


@router.post(
    "/",
    response_model=ActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une action",
)
def creer_action(
    payload: ActionCreate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    return action_service.creer_action(db, payload=payload, createur=user)


@router.get(
    "/{action_id}",
    response_model=ActionResponse,
    summary="Détail d'une action",
)
def get_action(action_id: int, db: DbDep, user: CurrentUser):
    return action_service.get_action_ou_404(db, action_id=action_id)


@router.patch(
    "/{action_id}",
    response_model=ActionResponse,
    summary="Modifier une action (patch partiel)",
)
def modifier_action(
    action_id: int,
    payload: ActionUpdate,
    db: DbDep,
    user: CurrentUser,
):
    return action_service.modifier_action(
        db, action_id=action_id, payload=payload, demandeur=user
    )


@router.post(
    "/{action_id}/statut",
    response_model=ActionResponse,
    summary="Changer le statut d'une action",
)
def changer_statut(
    action_id: int,
    payload: ChangerStatutActionRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Les transitions sont validées par transition_action_valide() de iso_engine.
    Un résultat est obligatoire pour passer au statut "clos".
    """
    return action_service.transitionner_statut(
        db,
        action_id=action_id,
        payload=payload,
        demandeur=user,
    )


@router.post(
    "/{action_id}/efficacite",
    response_model=ActionResponse,
    summary="Vérifier l'efficacité d'une action clôturée (pilote/admin uniquement)",
)
def verifier_efficacite(
    action_id: int,
    payload: VerifierEfficaciteRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Post-clôture uniquement. Documente si l'action a atteint son objectif.
    Accessible aux pilotes et admins uniquement.
    """
    return action_service.verifier_efficacite(
        db,
        action_id=action_id,
        payload=payload,
        verificateur=user,
    )