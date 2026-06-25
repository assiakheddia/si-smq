"""
backend/app/schemas/diagnostic_smq.py

Schemas Pydantic v2 pour le Moteur Analytique (DiagnosticSMQ + Dysfonctionnement).
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel

from app.models.diagnostic_smq import (
    GraviteDysfonctionnement,
    SourceEvaluation,
    StatutDiagnosticSMQ,
    StatutDysfonctionnement,
)


class _Base(BaseModel):
    model_config = {"from_attributes": True}


class ResponsableResume(_Base):
    id:     int
    nom:    str
    prenom: str
    email:  str


class DysfonctionnementResponse(_Base):
    id: int
    clause_iso_code: str | None
    titre: str
    description: str | None
    consequences: str | None
    causes: str | None
    ameliorations: str | None
    gravite: GraviteDysfonctionnement
    source: SourceEvaluation
    statut: StatutDysfonctionnement
    responsable_id: int | None
    responsable: ResponsableResume | None = None
    echeance: date | None
    ordre: int


class DiagnosticSMQResponse(_Base):
    id: int
    reference: str | None
    processus_id: int
    statut: StatutDiagnosticSMQ
    score_global: float | None
    source_globale: SourceEvaluation | None
    date_lancement: datetime
    date_fin: datetime | None
    dysfonctionnements: list[DysfonctionnementResponse] = []
