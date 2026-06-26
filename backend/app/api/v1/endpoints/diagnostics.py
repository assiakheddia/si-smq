from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.diagnostic import StatutDiagnostic
from app.services import diagnostic_service
from app.schemas.diagnostic import (
    DiagnosticCreate, DiagnosticUpdate, DiagnosticResponse,
    DiagnosticResponseDetail, DiagnosticClauseCreate, DiagnosticClauseUpdate, DiagnosticClauseResponse,
    RapportMaturiteResponse, EvaluerToutesClausesRequest,
)

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.get("/", response_model=List[DiagnosticResponse])
def lister_diagnostics(
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
    processus_code: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    taille_page: int = Query(20, ge=1, le=100),
):
    statut_enum = StatutDiagnostic(statut) if statut else None
    result = diagnostic_service.lister_diagnostics(
        db, processus_code=processus_code, statut=statut_enum,
        page=page, taille_page=taille_page
    )
    return result["items"]


@router.post("/", response_model=DiagnosticResponse, status_code=status.HTTP_201_CREATED)
def creer_diagnostic(
    data: DiagnosticCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return diagnostic_service.creer_diagnostic(db, data, current_user)


@router.get("/{id}", response_model=DiagnosticResponseDetail)
def get_diagnostic(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return diagnostic_service.get_diagnostic(db, id)


@router.put("/{id}", response_model=DiagnosticResponse)
def update_diagnostic(
    id: int,
    data: DiagnosticUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    d = diagnostic_service.get_diagnostic(db, id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(d, key, value)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{id}")
def delete_diagnostic(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    d = diagnostic_service.get_diagnostic(db, id)
    db.delete(d)
    db.commit()
    return {"message": "Diagnostic supprimé"}


@router.post("/{id}/soumettre")
def soumettre(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return diagnostic_service.changer_statut(db, id, StatutDiagnostic.soumis, current_user)


@router.post("/{id}/valider")
def valider(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return diagnostic_service.changer_statut(db, id, StatutDiagnostic.valide, current_user)


@router.post("/{id}/archiver")
def archiver(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return diagnostic_service.changer_statut(db, id, StatutDiagnostic.archive, current_user)


@router.post("/lancer-audit-externe", response_model=List[DiagnosticResponse])
def lancer_audit_externe(db: Session = Depends(get_db), current_user: CurrentUser = None):
    """
    Réservé à la Direction — lance l'audit externe pour l'organisme entier en
    une seule campagne : bascule TOUS les diagnostics 'valide' vers 'audit_externe'.
    L'audit externe ISO 9001 porte sur le périmètre complet du SMQ, pas processus par processus.
    """
    return diagnostic_service.lancer_audit_externe_global(db, current_user)


@router.post("/{id}/evaluer-toutes-clauses", response_model=DiagnosticResponseDetail)
def evaluer_toutes_clauses(
    id: int,
    data: EvaluerToutesClausesRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Évalue en une fois toutes les clauses du diagnostic autour d'un score cible."""
    return diagnostic_service.evaluer_toutes_clauses(db, id, data.score_cible, current_user)


@router.patch("/{id}/clauses/{clause_id}", response_model=DiagnosticClauseResponse)
def evaluer_clause(
    id: int,
    clause_id: int,
    data: DiagnosticClauseCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return diagnostic_service.evaluer_clause(db, id, clause_id, data, current_user)


@router.get("/{id}/rapport", response_model=RapportMaturiteResponse)
def get_rapport(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return diagnostic_service.get_rapport_maturite(db, id)