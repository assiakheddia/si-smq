"""
Router Diagnostics — SI-SMQ
Création, évaluation clause par clause, workflow statut, rapport de maturité.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_pilote_ou_admin
from app.models.utilisateur import Utilisateur
from app.schemas.diagnostic import (
    DiagnosticCreate,
    DiagnosticResponse,
    DiagnosticListResponse,
    DiagnosticClauseCreate,
    DiagnosticClauseUpdate,
    DiagnosticClauseResponse,
    ChangerStatutDiagnosticRequest,
    RapportMaturiteResponse,
)
from app.services import diagnostic_service

router = APIRouter(prefix="/api/diagnostics", tags=["Diagnostics ISO"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep         = Annotated[Session, Depends(get_db)]
CurrentUser   = Annotated[Utilisateur, Depends(get_current_user)]
PiloteOuAdmin = Annotated[Utilisateur, Depends(get_current_pilote_ou_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=DiagnosticListResponse,
    summary="Lister les diagnostics (paginé, filtrable par processus / statut)",
)
def lister_diagnostics(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    processus_id: int | None = None,
    statut: str | None = None,
):
    return diagnostic_service.lister_diagnostics(
        db,
        page=page,
        par_page=par_page,
        processus_id=processus_id,
        statut=statut,
    )


@router.post(
    "/",
    response_model=DiagnosticResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un diagnostic pour un processus",
)
def creer_diagnostic(
    payload: DiagnosticCreate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Génère automatiquement :
    - La référence structurée (ex. DIAG-2025-PROC-LABO-001)
    - Toutes les DiagnosticClause vides pour les clauses ISO applicables
    """
    return diagnostic_service.creer_diagnostic(db, payload=payload, createur=user)


@router.get(
    "/{diagnostic_id}",
    response_model=DiagnosticResponse,
    summary="Détail d'un diagnostic avec ses clauses",
)
def get_diagnostic(diagnostic_id: int, db: DbDep, user: CurrentUser):
    return diagnostic_service.get_diagnostic_ou_404(db, diagnostic_id=diagnostic_id)


@router.post(
    "/{diagnostic_id}/clauses/{clause_id}",
    response_model=DiagnosticClauseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialiser l'évaluation d'une clause (si non créée automatiquement)",
)
def creer_evaluation_clause(
    diagnostic_id: int,
    clause_id: int,
    payload: DiagnosticClauseCreate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Utilisé pour les clauses ajoutées manuellement après la création du diagnostic.
    En général, les clauses sont créées automatiquement à la création du diagnostic.
    """
    return diagnostic_service.creer_evaluation_clause(
        db,
        diagnostic_id=diagnostic_id,
        clause_id=clause_id,
        payload=payload,
        evaluateur=user,
    )


@router.patch(
    "/{diagnostic_id}/clauses/{clause_id}",
    response_model=DiagnosticClauseResponse,
    summary="Évaluer / mettre à jour une clause ISO",
)
def evaluer_clause(
    diagnostic_id: int,
    clause_id: int,
    payload: DiagnosticClauseUpdate,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Calcule automatiquement :
    - type_ecart (mineur / majeur / critique)
    - recommandation (via iso_engine)
    - recalcule le score global du diagnostic
    """
    return diagnostic_service.evaluer_clause(
        db,
        diagnostic_id=diagnostic_id,
        clause_id=clause_id,
        payload=payload,
        evaluateur=user,
    )


@router.post(
    "/{diagnostic_id}/statut",
    response_model=DiagnosticResponse,
    summary="Changer le statut du diagnostic (soumettre, valider, rejeter…)",
)
def changer_statut(
    diagnostic_id: int,
    payload: ChangerStatutDiagnosticRequest,
    db: DbDep,
    user: PiloteOuAdmin,
):
    """
    Transitions de statut :
    - brouillon → soumis : vérifie que 0 clause est non évaluée
    - soumis → validé : génère risques et actions depuis les écarts détectés
    - validé → archivé : archivage du diagnostic
    """
    return diagnostic_service.changer_statut(
        db,
        diagnostic_id=diagnostic_id,
        payload=payload,
        demandeur=user,
    )


@router.get(
    "/{diagnostic_id}/rapport",
    response_model=RapportMaturiteResponse,
    summary="Rapport de maturité ISO 9001 (§4 → §10)",
)
def get_rapport_maturite(diagnostic_id: int, db: DbDep, user: CurrentUser):
    """
    Synthèse par section ISO 9001 (§4 Contexte, §5 Leadership, …, §10 Amélioration).
    Disponible uniquement pour les diagnostics soumis ou validés.
    """
    return diagnostic_service.get_rapport_maturite(db, diagnostic_id=diagnostic_id)