"""
Router Indicateurs (KPI) — SI-SMQ
CRUD + mesures + calcul automatique + tableau de bord.
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
from app.schemas.indicateur import (
    IndicateurCreate,
    IndicateurUpdate,
    IndicateurResponse,
    IndicateurListResponse,
    MesureCreate,
    MesureResponse,
    MesureListResponse,
    TableauDeBordResponse,
)
from app.services import kpi_service

router = APIRouter(prefix="/api/indicateurs", tags=["Indicateurs KPI"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]
AdminUser     = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/tableau-de-bord",
    response_model=TableauDeBordResponse,
    summary="Tableau de bord — dernière mesure de chaque KPI actif + alertes",
)
def get_tableau_de_bord(db: DbDep, user: CurrentUser):
    """
    Retourne la dernière valeur mesurée de chaque KPI actif, accompagnée
    de l'état d'alerte (normal / warning / critique).
    ⚠️ Déclaré avant /{indicateur_id} pour éviter la collision de route.
    """
    return kpi_service.get_tableau_de_bord(db)


@router.post(
    "/calculer-tout",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Déclencher le calcul automatique de tous les KPI (batch scheduler)",
)
def declencher_calculs_auto(db: DbDep, admin: AdminUser):
    """
    Point d'entrée pour le scheduler (APScheduler / Celery Beat).
    Les erreurs individuelles sont capturées sans bloquer les autres KPI.
    ⚠️ Déclaré avant /{indicateur_id} pour éviter la collision de route.
    """
    kpi_service.declencher_calculs_auto(db)
    return {"detail": "Calculs automatiques déclenchés."}


@router.get(
    "/",
    response_model=IndicateurListResponse,
    summary="Lister les indicateurs (paginé, filtrable)",
)
def lister_indicateurs(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    processus_id: int | None = None,
    actif: bool | None = None,
):
    return kpi_service.lister_indicateurs(
        db,
        page=page,
        par_page=par_page,
        processus_id=processus_id,
        actif=actif,
    )


@router.post(
    "/",
    response_model=IndicateurResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un indicateur KPI",
)
def creer_indicateur(
    payload: IndicateurCreate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    return kpi_service.creer_indicateur(db, payload=payload, createur=user)


@router.get(
    "/{indicateur_id}",
    response_model=IndicateurResponse,
    summary="Détail d'un indicateur",
)
def get_indicateur(indicateur_id: int, db: DbDep, user: CurrentUser):
    return kpi_service.get_indicateur_ou_404(db, indicateur_id=indicateur_id)


@router.patch(
    "/{indicateur_id}",
    response_model=IndicateurResponse,
    summary="Modifier un indicateur (patch partiel)",
)
def modifier_indicateur(
    indicateur_id: int,
    payload: IndicateurUpdate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    return kpi_service.modifier_indicateur(
        db, indicateur_id=indicateur_id, payload=payload, demandeur=user
    )


@router.get(
    "/{indicateur_id}/mesures",
    response_model=MesureListResponse,
    summary="Historique des mesures d'un indicateur",
)
def lister_mesures(
    indicateur_id: int,
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(50, ge=1, le=200),
):
    return kpi_service.lister_mesures(
        db, indicateur_id=indicateur_id, page=page, par_page=par_page
    )


@router.post(
    "/{indicateur_id}/mesures",
    response_model=MesureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enregistrer une nouvelle mesure",
)
def enregistrer_mesure(
    indicateur_id: int,
    payload: MesureCreate,
    db: DbDep,
    user: CurrentUser,
):
    """
    Calcule automatiquement l'évolution par rapport à la mesure précédente
    et déclenche les alertes si les seuils sont franchis (via iso_engine).
    """
    return kpi_service.enregistrer_mesure(
        db, indicateur_id=indicateur_id, payload=payload, saisisseur=user
    )


@router.post(
    "/{indicateur_id}/calculer",
    response_model=MesureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Calculer automatiquement la valeur du KPI",
)
def calculer_valeur_auto(
    indicateur_id: int,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Dispatche vers l'une des 7 formules de calcul automatique.
    Note : change temporairement source=manuel → mixte (comportement voulu, ne pas corriger).
    """
    return kpi_service.calculer_valeur_auto(
        db, indicateur_id=indicateur_id, declencheur=user
    )