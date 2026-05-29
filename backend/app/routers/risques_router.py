"""
Router Risques — SI-SMQ
CRUD + workflow statut + heatmap Probabilité × Gravité.
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
from app.schemas.risque import (
    RisqueCreate,
    RisqueUpdate,
    RisqueResponse,
    RisqueListResponse,
    ChangerStatutRisqueRequest,
    HeatmapResponse,
)
from app.services import risque_service

router = APIRouter(prefix="/api/risques", tags=["Risques"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]
AdminUser     = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/heatmap",
    response_model=HeatmapResponse,
    summary="Données heatmap Probabilité × Gravité",
)
def get_heatmap(
    db: DbDep,
    user: CurrentUser,
    processus_id: int | None = None,
):
    """
    Retourne les données agrégées pour la visualisation heatmap.
    Filtrable par processus.
    ⚠️ Cet endpoint doit être déclaré AVANT /{risque_id} pour éviter la collision de route.
    """
    return risque_service.get_heatmap(db, processus_id=processus_id)


@router.get(
    "/",
    response_model=RisqueListResponse,
    summary="Lister les risques (paginé, filtrable)",
)
def lister_risques(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    processus_id: int | None = None,
    statut: str | None = None,
    criticite: str | None = None,
):
    return risque_service.lister_risques(
        db,
        page=page,
        par_page=par_page,
        processus_id=processus_id,
        statut=statut,
        criticite=criticite,
    )


@router.post(
    "/",
    response_model=RisqueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un risque",
)
def creer_risque(
    payload: RisqueCreate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Calcule automatiquement le RPN (Probabilité × Gravité × Détectabilité)
    et la criticité associée.
    Si rpn_necessite_action(rpn) est True, une action corrective est créée automatiquement.
    """
    return risque_service.creer_risque(db, payload=payload, createur=user)


@router.get(
    "/{risque_id}",
    response_model=RisqueResponse,
    summary="Détail d'un risque",
)
def get_risque(risque_id: int, db: DbDep, user: CurrentUser):
    return risque_service.get_risque_ou_404(db, risque_id=risque_id)


@router.patch(
    "/{risque_id}",
    response_model=RisqueResponse,
    summary="Modifier un risque (patch partiel)",
)
def modifier_risque(
    risque_id: int,
    payload: RisqueUpdate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Le RPN et la criticité sont recalculés automatiquement si P, G ou D sont modifiés.
    """
    return risque_service.modifier_risque(
        db, risque_id=risque_id, payload=payload, demandeur=user
    )


@router.post(
    "/{risque_id}/statut",
    response_model=RisqueResponse,
    summary="Changer le statut du risque",
)
def changer_statut(
    risque_id: int,
    payload: ChangerStatutRisqueRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Workflow : identifie → analyse → traitement → surveillance → clos.
    Les transitions invalides sont rejetées.
    """
    return risque_service.changer_statut(
        db,
        risque_id=risque_id,
        payload=payload,
        demandeur=user,
    )