"""
backend/app/api/v1/endpoints/diagnostics.py

Endpoints REST pour la gestion des DiagnosticISO.

Routes :
  GET    /api/v1/diagnostics              → Lister les diagnostics (avec filtres)
  GET    /api/v1/diagnostics/{id}         → Détail d'un diagnostic
  POST   /api/v1/diagnostics              → Créer un diagnostic
  PUT    /api/v1/diagnostics/{id}         → Modifier un diagnostic
  POST   /api/v1/diagnostics/{id}/valider → Valider un diagnostic

Filtres disponibles :
  - processus_id, clause_iso_id, statut, niveau
  - date_debut, date_fin
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
import app.core.iso_engine as iso_engine
from app.models.diagnostic import DiagnosticISO, NiveauMaturite, StatutDiagnostic
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.clause_iso import ClauseISO
from app.models.processus import Processus
from app.schemas import diagnostic as schemas_diag
from app.schemas.diagnostic import RapportMaturiteResponse

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


# =============================================================================
# LISTERS LES DIAGNOSTICS (avec filtres)
# =============================================================================

@router.get("/", response_model=List[schemas_diag.DiagnosticResponse])
def lister_diagnostics(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
    processus_id: Optional[int] = Query(None),
    clause_iso_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    niveau: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Lister les diagnostics avec filtres optionnels.

    Filtres :
      - processus_id : ID du processus
      - clause_iso_id : ID de la clause ISO
      - statut : État du diagnostic (brouillon, en_audit, valide, etc.)
      - niveau : Niveau de conformité (non_conforme, partiel, avance, conforme)
    """
    query = db.query(DiagnosticISO)

    if processus_id:
        query = query.filter(DiagnosticISO.processus_id == processus_id)
    if clause_iso_id:
        query = query.filter(DiagnosticISO.clause_iso_id == clause_iso_id)
    if statut:
        try:
            query = query.filter(DiagnosticISO.statut == StatutDiagnostic(statut))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Statut invalide : {statut}",
            )
    if niveau:
        try:
            query = query.filter(DiagnosticISO.niveau == NiveauMaturite(niveau))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Niveau invalide : {niveau}",
            )

    diagnostics = query.order_by(DiagnosticISO.date_creation.desc()).offset(skip).limit(limit).all()
    return diagnostics


# =============================================================================
# DÉTAIL D'UN DIAGNOSTIC
# =============================================================================

@router.get("/{diagnostic_id}", response_model=schemas_diag.DiagnosticResponse)
def get_diagnostic(
    diagnostic_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """Récupérer les détails d'un diagnostic."""
    diagnostic = db.query(DiagnosticISO).filter(DiagnosticISO.id == diagnostic_id).first()
    if not diagnostic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnostic {diagnostic_id} non trouvé",
        )
    return diagnostic


# =============================================================================
# CRÉER UN DIAGNOSTIC
# =============================================================================

@router.post("/", response_model=schemas_diag.DiagnosticResponse, status_code=status.HTTP_201_CREATED)
def creer_diagnostic(
    diagnostic_in: schemas_diag.DiagnosticClauseCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """
    Créer un nouveau diagnostic ISO.

    Le diagnostic est créé en statut "brouillon" et peut être modifié avant validation.
    """
    # Vérifier l'existence du processus
    processus = db.query(Processus).filter(Processus.id == diagnostic_in.processus_id).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus {diagnostic_in.processus_id} non trouvé",
        )

    # Vérifier l'existence de la clause
    clause = db.query(ClauseISO).filter(ClauseISO.id == diagnostic_in.clause_iso_id).first()
    if not clause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clause ISO {diagnostic_in.clause_iso_id} non trouvée",
        )

    # Vérifier que la clause est une feuille
    if not clause.est_feuille:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La clause {clause.code} n'est pas une feuille — impossible d'attacher un diagnostic",
        )

    # Créer le diagnostic
    diagnostic = DiagnosticISO(
        processus_id=diagnostic_in.processus_id,
        clause_iso_id=diagnostic_in.clause_iso_id,
        score=diagnostic_in.score or 0.0,
        description_ecart=diagnostic_in.description_ecart,
        justification=diagnostic_in.justification,
        recommandation=diagnostic_in.recommandation,
        observation=diagnostic_in.observation,
        est_action_requise=diagnostic_in.est_action_requise or False,
        date_action_prevue=diagnostic_in.date_action_prevue,
        statut=StatutDiagnostic.brouillon,
    )

    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)

    return diagnostic


# =============================================================================
# MODIFIER UN DIAGNOSTIC
# =============================================================================

@router.put("/{diagnostic_id}", response_model=schemas_diag.DiagnosticResponse)
def modifier_diagnostic(
    diagnostic_id: int,
    diagnostic_in: schemas_diag.DiagnosticClauseUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """
    Modifier un diagnostic en statut "brouillon".

    Restriction : seul un diagnostic en brouillon peut être modifié.
    """
    diagnostic = db.query(DiagnosticISO).filter(DiagnosticISO.id == diagnostic_id).first()
    if not diagnostic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnostic {diagnostic_id} non trouvé",
        )

    # Vérifier le statut
    if diagnostic.statut != StatutDiagnostic.brouillon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de modifier un diagnostic en statut {diagnostic.statut.value}",
        )

    # Mettre à jour les champs
    diagnostic.score = diagnostic_in.score if diagnostic_in.score is not None else diagnostic.score
    diagnostic.description_ecart = diagnostic_in.description_ecart or diagnostic.description_ecart
    diagnostic.justification = diagnostic_in.justification or diagnostic.justification
    diagnostic.recommandation = diagnostic_in.recommandation or diagnostic.recommandation
    diagnostic.observation = diagnostic_in.observation or diagnostic.observation
    diagnostic.est_action_requise = diagnostic_in.est_action_requise if diagnostic_in.est_action_requise is not None else diagnostic.est_action_requise
    diagnostic.date_action_prevue = diagnostic_in.date_action_prevue or diagnostic.date_action_prevue
    diagnostic.date_mise_a_jour = datetime.utcnow()

    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)

    return diagnostic


# =============================================================================
# VALIDER UN DIAGNOSTIC
# =============================================================================

@router.post("/{diagnostic_id}/valider", response_model=schemas_diag.DiagnosticResponse)
def valider_diagnostic(
    diagnostic_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """
    Valider un diagnostic (passer du statut "brouillon" à "valide").

    Actions déclenchées :
      1. Recalcul du niveau depuis le score
      2. Génération de la recommandation si absente
      3. Mise à jour du statut
      4. Recalcul de la maturité du processus
      5. Propagation du recalcul aux clauses parents

    Restriction : seuls les auditeurs et admins peuvent valider.
    """
    # Vérifier les permissions
    if current_user.role not in [RoleEnum.auditeur, RoleEnum.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les auditeurs et admins peuvent valider les diagnostics",
        )

    diagnostic = db.query(DiagnosticISO).filter(DiagnosticISO.id == diagnostic_id).first()
    if not diagnostic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnostic {diagnostic_id} non trouvé",
        )

    try:
        ISOEngine.valider_diagnostic(db, diagnostic, auditeur_id=current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    db.refresh(diagnostic)
    return diagnostic


# =============================================================================
# SYNTHÈSE DE CONFORMITÉ D'UN PROCESSUS
# =============================================================================

@router.get("/processus/{processus_id}/synthese", response_model=dict)
def syntese_conformite_processus(
    processus_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """
    Générer une synthèse de conformité pour un processus.

    Retourne :
      - Maturité globale (%)
      - Répartition par niveau
      - Points critiques
    """
    processus = db.query(Processus).filter(Processus.id == processus_id).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus {processus_id} non trouvé",
        )

    synthese = ISOEngine.synthese_conformite_processus(db, processus)
    return synthese
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.diagnostic import DiagnosticISO, DiagnosticClause
from app.schemas.diagnostic import (
    DiagnosticCreate, DiagnosticUpdate, DiagnosticResponse,
    DiagnosticResponseDetail, DiagnosticClauseCreate, DiagnosticClauseUpdate, DiagnosticClauseBase, DiagnosticClauseResponse, 
)

router = APIRouter()

@router.get("/", response_model=List[DiagnosticResponse])
def list_diagnostics(db: Session = Depends(get_db)):
    return db.query(DiagnosticISO).all()

@router.post("/", response_model=DiagnosticResponse)
def create_diagnostic(data: DiagnosticCreate, db: Session = Depends(get_db)):
    diagnostic = DiagnosticISO(**data.model_dump())
    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)
    return diagnostic

@router.get("/{id}", response_model=DiagnosticResponseDetail)
def get_diagnostic(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    return d

@router.put("/{id}", response_model=DiagnosticResponse)
def update_diagnostic(id: int, data: DiagnosticUpdate, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(d, key, value)
    db.commit()
    db.refresh(d)
    return d

@router.delete("/{id}")
def delete_diagnostic(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    db.delete(d)
    db.commit()
    return {"message": "Diagnostic supprimé"}

@router.post("/{id}/soumettre")
def soumettre_diagnostic(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    if d.statut != "brouillon":
        raise HTTPException(status_code=400, detail="Seul un brouillon peut être soumis")
    d.statut = "soumis"
    db.commit()
    return {"message": "Diagnostic soumis"}

@router.post("/{id}/valider")
def valider_diagnostic(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d or d.statut != "soumis":
        raise HTTPException(status_code=400, detail="Le diagnostic doit être soumis pour être validé")
    d.statut = "valide"
    db.commit()
    return {"message": "Diagnostic validé"}

@router.post("/{id}/archiver")
def archiver_diagnostic(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d or d.statut != "valide":
        raise HTTPException(status_code=400, detail="Le diagnostic doit être validé pour être archivé")
    d.statut = "archive"
    db.commit()
    return {"message": "Diagnostic archivé"}

@router.patch("/{id}/clauses/{clause_id}", response_model=DiagnosticClauseResponse)
def evaluer_clause(id: int, clause_id: int, data: DiagnosticClauseUpdate, db: Session = Depends(get_db)):
    dc = db.query(DiagnosticClause).filter(
        DiagnosticClause.diagnostic_id == id,
        DiagnosticClause.clause_id == clause_id
    ).first()
    if not dc:
        raise HTTPException(status_code=404, detail="Clause non trouvée dans ce diagnostic")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(dc, key, value)
    db.commit()
    db.refresh(dc)
    return dc

@router.get("/{id}/rapport", response_model=RapportMaturiteResponse)
def get_rapport(id: int, db: Session = Depends(get_db)):
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Diagnostic non trouvé")
    # Le calcul réel sera délégué au diagnostic_service
    return d