"""
backend/app/schemas/diagnostic.py

Schémas Pydantic pour les diagnostics ISO.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.diagnostic import NiveauConformite, StatutDiagnostic


# =============================================================================
# REQUÊTES (Création/Modification)
# =============================================================================

class DiagnosticISCreateUpdate(BaseModel):
    """
    Schéma pour créer ou modifier un diagnostic ISO.
    """
    processus_id: int = Field(..., description="ID du processus")
    clause_iso_id: int = Field(..., description="ID de la clause ISO")
    score: Optional[float] = Field(None, ge=0, le=100, description="Score de conformité (0-100)")
    description_ecart: Optional[str] = Field(None, description="Description des écarts")
    justification: Optional[str] = Field(None, description="Justification du score")
    recommandation: Optional[str] = Field(None, description="Recommandations d'amélioration")
    observation: Optional[str] = Field(None, description="Observations additionnelles")
    est_action_requise: Optional[bool] = Field(False, description="Actions correctives requises ?")
    date_action_prevue: Optional[datetime] = Field(None, description="Échéance des actions")


# =============================================================================
# RÉPONSES
# =============================================================================

class DiagnosticISResponse(BaseModel):
    """
    Schéma complet d'un diagnostic ISO en réponse.
    """
    id: int
    processus_id: int
    clause_iso_id: int
    score: float
    niveau: NiveauConformite
    description_ecart: Optional[str]
    justification: Optional[str]
    recommandation: Optional[str]
    observation: Optional[str]
    est_action_requise: bool
    date_action_prevue: Optional[datetime]
    statut: StatutDiagnostic
    date_creation: datetime
    date_validation: Optional[datetime]
    date_mise_a_jour: datetime
    version: int
    auditeur_id: Optional[int]

    class Config:
        from_attributes = True


class DiagnosticISListResponse(BaseModel):
    """
    Schéma simplifié pour les listes de diagnostics.
    """
    id: int
    processus_id: int
    clause_iso_id: int
    score: float
    niveau: NiveauConformite
    statut: StatutDiagnostic
    date_creation: datetime
    date_validation: Optional[datetime]

    class Config:
        from_attributes = True


# =============================================================================
# SYNTHÈSE DE CONFORMITÉ
# =============================================================================

class PointCritique(BaseModel):
    """Point critique (clause non conforme)."""
    clause_code: str
    clause_titre: str
    score: float
    niveau: str
    description_ecart: Optional[str]


class SyntheseConformite(BaseModel):
    """Synthèse de conformité d'un processus."""
    processus_code: str
    processus_nom: str
    maturite: float
    nb_diagnostics: int
    repartition: dict  # {"non_conforme": int, "partiel": int, "avance": int, "conforme": int}
    points_critiques: list[PointCritique]
