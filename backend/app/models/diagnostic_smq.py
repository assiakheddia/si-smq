"""
backend/app/models/diagnostic_smq.py

Pipeline IA "Moteur Analytique" — distinct du workflow manuel
DiagnosticISO/DiagnosticClause (audit clause par clause par un auditeur).

Ici, le diagnostic est généré automatiquement à partir des données propres
à la fiche Processus (objectif, RACI, KPIs, risques, ressources, documents),
en analysant section par section (§4 à §10 ISO 9001) via le Moteur
Analytique (services/moteur_analytique.py), avec repli local en cas
d'indisponibilité de l'IA.

  ┌───────────────────────────────────────────────────────────┐
  │  DiagnosticSMQ          (1 par lancement du bouton)       │
  │  → score global, statut, source (ia/local/mixte)          │
  │                                                            │
  │      └── Dysfonctionnement  (N par diagnostic)             │
  │          → 1 ligne = 1 écart détecté sur une section ISO   │
  └───────────────────────────────────────────────────────────┘
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Float, Date,
    ForeignKey, Enum as SAEnum, DateTime
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================================================
# ENUMS
# =============================================================================

class StatutDiagnosticSMQ(str, enum.Enum):
    en_cours = "en_cours"
    termine  = "termine"
    echec    = "echec"


class SourceEvaluation(str, enum.Enum):
    """D'où vient l'évaluation : IA (Claude), repli local, ou mélange des deux."""
    ia    = "ia"
    local = "local"
    mixte = "mixte"


class GraviteDysfonctionnement(str, enum.Enum):
    mineur  = "mineur"
    moyen   = "moyen"
    majeur  = "majeur"
    critique = "critique"


class StatutDysfonctionnement(str, enum.Enum):
    ouvert    = "ouvert"
    en_cours  = "en_cours"
    resolu    = "resolu"


# =============================================================================
# DIAGNOSTIC SMQ  (1 par lancement du bouton "Lancer le diagnostic SMQ")
# =============================================================================

class DiagnosticSMQ(Base):
    """Un run du Moteur Analytique pour un Processus donné."""

    __tablename__ = "diagnostics_smq"

    id        = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "DSMQ-2026-PROC-007-001" — généré par le service

    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    declencheur_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Utilisateur ayant cliqué sur "Lancer le diagnostic SMQ"

    statut = Column(
        SAEnum(StatutDiagnosticSMQ),
        default=StatutDiagnosticSMQ.en_cours,
        nullable=False,
    )

    score_global = Column(Float, nullable=True)
    # Moyenne des scores de section — NULL pendant l'exécution

    source_globale = Column(
        SAEnum(SourceEvaluation),
        nullable=True,
    )
    # ia si toutes les sections ont été évaluées par l'IA,
    # local si toutes ont basculé en repli, mixte sinon. NULL pendant l'exécution.

    date_lancement = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_fin       = Column(DateTime, nullable=True)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="diagnostics_smq",
    )

    declencheur = relationship(
        "Utilisateur",
        foreign_keys=[declencheur_id],
    )

    dysfonctionnements = relationship(
        "Dysfonctionnement",
        back_populates="diagnostic",
        cascade="all, delete-orphan",
        order_by="Dysfonctionnement.ordre",
    )

    def __repr__(self) -> str:
        return (
            f"<DiagnosticSMQ [{self.reference}] "
            f"processus={self.processus_id} statut={self.statut}>"
        )


# =============================================================================
# DYSFONCTIONNEMENT  (N par DiagnosticSMQ)
# =============================================================================

class Dysfonctionnement(Base):
    """Un écart détecté (par l'IA ou le repli local) sur une section ISO."""

    __tablename__ = "dysfonctionnements"

    id = Column(Integer, primary_key=True, index=True)

    reference = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "ECT-2026-PROC-010-003" — même schéma que Action.reference /
    # DiagnosticISO.reference pour une identification homogène dans toute
    # l'appli, peu importe l'origine (audit interne ou Moteur Analytique).

    diagnostic_id = Column(
        Integer,
        ForeignKey("diagnostics_smq.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Dénormalisé pour permettre une lecture directe par processus
    # sans remonter par DiagnosticSMQ (liste affichée dans Tab5)

    clause_iso_code = Column(String(20), nullable=True)
    # ex: "7" (Réalisation des activités opérationnelles) — informatif,
    # pas de FK vers ClauseISO : ce pipeline ne touche pas le référentiel
    # de l'audit manuel.

    titre        = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    consequences = Column(Text, nullable=True)
    causes       = Column(Text, nullable=True)
    ameliorations = Column(Text, nullable=True)
    # Une amélioration par ligne — même format que le rendu carousel existant
    # (frontend fait déjà `.split('\n')`)

    gravite = Column(
        SAEnum(GraviteDysfonctionnement),
        nullable=False,
        default=GraviteDysfonctionnement.mineur,
    )

    source = Column(
        SAEnum(SourceEvaluation),
        nullable=False,
        default=SourceEvaluation.local,
    )
    # ia ou local — mixte n'a pas de sens au niveau d'un dysfonctionnement unique

    statut = Column(
        SAEnum(StatutDysfonctionnement),
        default=StatutDysfonctionnement.ouvert,
        nullable=False,
    )

    responsable_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )

    echeance = Column(Date, nullable=True)

    ordre = Column(Integer, default=0, nullable=False)
    # Ordre d'affichage dans le carousel (= ordre des sections ISO §4..§10)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    diagnostic = relationship(
        "DiagnosticSMQ",
        back_populates="dysfonctionnements",
    )

    processus = relationship(
        "Processus",
        back_populates="dysfonctionnements",
    )

    responsable = relationship(
        "Utilisateur",
        foreign_keys=[responsable_id],
    )

    def __repr__(self) -> str:
        return f"<Dysfonctionnement {self.titre!r} gravite={self.gravite}>"
