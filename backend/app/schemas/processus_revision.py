"""
backend/app/schemas/processus_revision.py

Schema Pydantic v2 pour l'historique réel des versions d'un Processus.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.processus_revision import StatutRevision


class _Base(BaseModel):
    model_config = {"from_attributes": True}


class AuteurRevisionResume(_Base):
    id:     int
    nom:    str
    prenom: str


class ProcessusRevisionResponse(_Base):
    id: int
    version: str
    description: str | None
    statut: StatutRevision
    date_revision: datetime
    auteur: AuteurRevisionResume | None = None
