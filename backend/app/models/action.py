"""
backend/app/models/action.py

Actions correctives et préventives du SMQ — §10.2 ISO 9001:2015.

Ferme la boucle PDCA :
  PLAN  → DiagnosticISO identifie les écarts
  DO    → Action planifiée et exécutée
  CHECK → Vérification de l'efficacité (statut en_verification)
  ACT   → Clôture et capitalisation (statut close)

Traçabilité triple (toutes FK optionnelles) :
  ┌─────────────────────────────────────────────────┐
  │  Action                                         │
  │    ├── processus_id      → Processus (requis)   │
  │    ├── risque_id         → Risque (optionnel)   │
  │    └── diagnostic_clause_id → DiagnosticClause  │
  │                             (optionnel)          │
  └─────────────────────────────────────────────────┘

Origine d'une action :
  - Manuelle       : saisie par le pilote ou l'admin
  - Depuis risque  : créée automatiquement si RPN ≥ 21 (iso_engine)
  - Depuis écart   : créée automatiquement depuis un écart majeur
  - Revue direction: issue d'une décision de revue de direction (§9.3)

Workflow :
  planifiee → en_cours → en_verification → close
                    ↘                   ↗
                     → annulee (à tout moment)
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Float,
    ForeignKey, Enum as SAEnum, Boolean, DateTime
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================================================
# ENUMS
# =============================================================================

class StatutAction(str, enum.Enum):
    """
    Workflow de vie d'une action corrective.
    Transitions valides gérées par action_service.py.
    """
    planifiee        = "planifiee"        # Définie, pas encore démarrée
    en_cours         = "en_cours"         # En cours d'exécution
    en_verification  = "en_verification"  # Exécutée, efficacité en attente de contrôle
    close            = "close"            # Vérifiée efficace, clôturée
    annulee          = "annulee"          # Abandonnée (raison documentée)


class PrioriteAction(str, enum.Enum):
    """
    Priorité de traitement.
    Calculée automatiquement depuis la criticité source (risque ou écart),
    ou saisie manuellement.
    """
    faible    = "faible"     # Traitement dans le cycle normal
    normale   = "normale"    # Traitement planifié
    haute     = "haute"      # Traitement prioritaire ce sprint
    critique  = "critique"   # Traitement immédiat — bloquant certification


class TypeAction(str, enum.Enum):
    """
    Nature de l'action — §10.2 ISO 9001.
    """
    corrective   = "corrective"    # Éliminer la cause d'une NC constatée
    preventive   = "preventive"    # Éliminer la cause d'une NC potentielle
    amelioration = "amelioration"  # Amélioration continue sans NC identifiée
    immediat     = "immediat"      # Correction immédiate (traitement du symptôme)


class OrigineAction(str, enum.Enum):
    """
    Source de création de l'action.
    Permet de tracer le circuit de génération.
    """
    manuelle         = "manuelle"          # Saisie par pilote / admin
    diagnostic       = "diagnostic"        # Générée depuis un écart DiagnosticClause
    risque           = "risque"            # Générée depuis un Risque (RPN ≥ seuil)
    revue_direction  = "revue_direction"   # Issue d'une décision §9.3
    audit_interne    = "audit_interne"     # Issue d'un audit interne §9.2


# =============================================================================
# ACTION
# =============================================================================

class Action(Base):
    """
    Action corrective, préventive ou d'amélioration.

    Taux d'avancement :
      avancement  : 0–100 (%) saisi manuellement ou calculé depuis sous-tâches
      Mis à jour à chaque changement de statut :
        planifiee       →   0 %
        en_cours        →   1–99 %  (libre)
        en_verification → 100 %  (automatique)
        close           → 100 %  (verrouillé)

    Efficacité (§10.2.1) :
      Après passage en "close", le responsable doit évaluer si l'action
      a réellement éliminé la cause. Stocké dans efficacite_verifiee + commentaire_verification.
    """

    __tablename__ = "actions"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id        = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "ACT-2025-PROC-LABO-007" — généré par action_service

    titre       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Description détaillée de l'action à mener

    type    = Column(SAEnum(TypeAction),    nullable=False, default=TypeAction.corrective)
    origine = Column(SAEnum(OrigineAction), nullable=False, default=OrigineAction.manuelle)

    # -------------------------------------------------------------------------
    # Traçabilité triple (toutes optionnelles sauf processus_id)
    # -------------------------------------------------------------------------
    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Processus concerné — toujours requis (contexte métier obligatoire)

    risque_id = Column(
        Integer,
        ForeignKey("risques.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Risque source — renseigné si origine = "risque"
    # SET NULL : si le risque est supprimé, l'action subsiste

    diagnostic_clause_id = Column(
        Integer,
        ForeignKey("diagnostics_clauses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Écart source — renseigné si origine = "diagnostic"

    # -------------------------------------------------------------------------
    # Responsabilité
    # -------------------------------------------------------------------------
    responsable_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Personne chargée de l'exécution

    verificateur_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Personne chargée de vérifier l'efficacité (peut différer du responsable)
    # §10.2.1 : "évaluer la nécessité d'agir pour éliminer les causes"

    # -------------------------------------------------------------------------
    # Priorité et planification
    # -------------------------------------------------------------------------
    priorite = Column(
        SAEnum(PrioriteAction),
        nullable=False,
        default=PrioriteAction.normale,
    )

    date_creation  = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_planifiee = Column(DateTime, nullable=True)
    # Date cible de démarrage

    date_echeance  = Column(DateTime, nullable=True, index=True)
    # Échéance de clôture — indexée pour les requêtes "actions en retard"

    date_realisation = Column(DateTime, nullable=True)
    # Date effective de passage en "en_verification"

    date_cloture = Column(DateTime, nullable=True)
    # Date effective de passage en "close" ou "annulee"

    # -------------------------------------------------------------------------
    # Avancement (workflow)
    # -------------------------------------------------------------------------
    statut = Column(
        SAEnum(StatutAction),
        nullable=False,
        default=StatutAction.planifiee,
        index=True,
    )

    avancement = Column(Integer, nullable=False, default=0)
    # 0–100 (%)
    # Règles :
    #   planifiee       → forcé à 0
    #   en_verification → forcé à 100
    #   close           → forcé à 100 (verrouillé)
    # Appliqué par action_service.transition_statut()

    # -------------------------------------------------------------------------
    # Cause racine (§10.2.1)
    # -------------------------------------------------------------------------
    cause_racine = Column(Text, nullable=True)
    # Analyse des causes : 5 pourquoi, Ishikawa, etc.
    # ex: "Absence de procédure documentée → aucune formation → ..."

    # -------------------------------------------------------------------------
    # Vérification de l'efficacité (§10.2.1)
    # -------------------------------------------------------------------------
    efficacite_verifiee = Column(Boolean, nullable=True)
    # None  = pas encore vérifiée
    # True  = action efficace, cause éliminée
    # False = action insuffisante, nouvelle action requise

    commentaire_verification = Column(Text, nullable=True)
    # Justification de l'évaluation d'efficacité
    # ex: "Procédure mise en place et appliquée sur 3 cycles consécutifs sans écart"

    # -------------------------------------------------------------------------
    # Annulation
    # -------------------------------------------------------------------------
    motif_annulation = Column(Text, nullable=True)
    # Renseigné si statut = "annulee"

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_active = Column(Boolean, default=True, nullable=False)

    generee_automatiquement = Column(Boolean, default=False, nullable=False)
    # True = créée par diagnostic_service ou risque_service
    # False = saisie manuellement

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="actions",
    )

    risque = relationship(
        "Risque",
        back_populates="actions",
        foreign_keys=[risque_id],
    )

    diagnostic_clause = relationship(
        "DiagnosticClause",
        foreign_keys=[diagnostic_clause_id],
    )

    responsable = relationship(
        "Utilisateur",
        foreign_keys=[responsable_id],
    )

    verificateur = relationship(
        "Utilisateur",
        foreign_keys=[verificateur_id],
    )

    # -------------------------------------------------------------------------
    # Indicateurs de retard — toujours recalculés depuis date_echeance,
    # jamais stockés en colonne (évite toute désynchronisation).
    # -------------------------------------------------------------------------
    @property
    def jours_restants(self) -> int | None:
        if not self.date_echeance:
            return None
        return (self.date_echeance - datetime.utcnow()).days

    @property
    def est_en_retard(self) -> bool:
        if not self.date_echeance or self.statut in (StatutAction.close, StatutAction.annulee):
            return False
        return self.date_echeance < datetime.utcnow()

    def __repr__(self) -> str:
        return (
            f"<Action [{self.reference}] "
            f"{self.titre[:40]}... "
            f"statut={self.statut} "
            f"avancement={self.avancement}% "
            f"priorite={self.priorite}>"
        )