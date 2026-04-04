"""
backend/app/models/risque.py

Gestion des risques qualité — style AMDEC (RPN).

Formule criticité :
    RPN = Probabilité × Gravité × Détectabilité
    Chaque dimension : échelle 1–5
    RPN min = 1  (1×1×1)
    RPN max = 125 (5×5×5)

Seuils RPN (configurables dans iso_engine.py) :
    1  – 20  → faible
    21 – 50  → modere
    51 – 80  → eleve
    81 – 125 → critique

Traçabilité ISO :
    Risque → DiagnosticClause (optionnel)
    Un risque peut être généré automatiquement depuis un écart majeur
    ou saisi manuellement par le pilote.

Cycle de vie :
    identifie → analyse → traitement → surveillance → clos
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

class NiveauCriticite(str, enum.Enum):
    """
    Niveau de criticité calculé depuis le RPN.
    Seuils définis dans iso_engine.py → rpn_to_criticite()
    """
    faible    = "faible"     # RPN  1 – 20
    modere    = "modere"     # RPN 21 – 50
    eleve     = "eleve"      # RPN 51 – 80
    critique  = "critique"   # RPN 81 – 125


class StatutRisque(str, enum.Enum):
    """
    Cycle de vie du risque.
    """
    identifie   = "identifie"    # Risque détecté, non encore analysé
    analyse     = "analyse"      # RPN calculé, criticité évaluée
    traitement  = "traitement"   # Plan d'atténuation en cours
    surveillance = "surveillance" # Actions menées, risque sous surveillance
    clos        = "clos"         # Risque résolu ou accepté formellement


class TypeRisque(str, enum.Enum):
    """
    Catégories de risques pertinentes pour un SMQ laboratoire/université.
    Extraites du contexte des deux BPMN (finances, doctoral, conformité).
    """
    organisationnel = "organisationnel"  # Structure, gouvernance, responsabilités
    operationnel    = "operationnel"     # Dysfonctionnement d'un processus
    financier       = "financier"        # Budget, achats, dépenses (BPMN Labo)
    documentaire    = "documentaire"     # GED, traçabilité, preuves ISO
    humain          = "humain"           # Compétences, disponibilité, turnover
    reglementaire   = "reglementaire"    # Non-conformité légale ou normative
    qualite         = "qualite"          # Impact direct sur la qualité du service


class StrategieTraitement(str, enum.Enum):
    """
    Stratégies de traitement ISO 31000 / ISO 9001 §6.1.
    """
    evitement    = "evitement"    # Supprimer la source du risque
    reduction    = "reduction"    # Réduire probabilité ou gravité
    transfert    = "transfert"    # Externaliser (assurance, sous-traitance)
    acceptation  = "acceptation"  # Accepter formellement le risque résiduel
    opportunite  = "opportunite"  # Transformer en opportunité (§6.1 ISO 9001)


# =============================================================================
# RISQUE
# =============================================================================

class Risque(Base):
    """
    Risque qualité associé à un processus.

    Dimensions AMDEC (échelle 1–5 chacune) :
      - probabilite   : vraisemblance d'occurrence
      - gravite       : impact sur la qualité / conformité ISO
      - detectabilite : difficulté à détecter avant impact
                        (1 = très détectable, 5 = très difficile à détecter)

    RPN = probabilite × gravite × detectabilite
    criticite = calculée automatiquement par iso_engine.rpn_to_criticite()

    Traçabilité ISO :
      diagnostic_clause_id → lien optionnel vers l'écart source
      Si un écart majeur est détecté en DiagnosticClause,
      le DiagnosticService peut créer un Risque automatiquement.
    """

    __tablename__ = "risques"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id        = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "RSQ-2025-PROC-LABO-001" — généré par le service

    titre       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Description narrative du risque
    # ex: "Dépassement du seuil budgétaire sans appel d'offres obligatoire"

    type = Column(SAEnum(TypeRisque), nullable=True)

    # -------------------------------------------------------------------------
    # Relations principales
    # -------------------------------------------------------------------------
    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    responsable_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Personne chargée du suivi et du traitement du risque

    diagnostic_clause_id = Column(
        Integer,
        ForeignKey("diagnostics_clauses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Traçabilité : écart ISO source du risque (optionnel)
    # NULL = risque saisi manuellement, sans lien avec un diagnostic

    # -------------------------------------------------------------------------
    # Dimensions AMDEC (1–5)
    # -------------------------------------------------------------------------
    probabilite = Column(Integer, nullable=False, default=1)
    # 1 = très improbable  → 5 = quasi certain
    # Ex: Budget dépassé sans contrôle → 4 si pas de suivi mensuel

    gravite = Column(Integer, nullable=False, default=1)
    # 1 = impact négligeable → 5 = impact critique sur la certification
    # Ex: Non-conformité bloquante audit → 5

    detectabilite = Column(Integer, nullable=False, default=1)
    # 1 = détection immédiate → 5 = indétectable avant conséquences
    # Ex: Écart documentaire non détecté avant audit → 4
    # Note : échelle inversée par rapport à probabilité/gravité

    # -------------------------------------------------------------------------
    # RPN et criticité (calculés par iso_engine, stockés pour performance)
    # -------------------------------------------------------------------------
    rpn = Column(Float, nullable=False, default=1.0)
    # RPN = probabilite × gravite × detectabilite
    # Recalculé et stocké à chaque modification des 3 dimensions
    # Stocké (et pas calculé à la volée) pour permettre le tri/filtrage en DB

    criticite = Column(
        SAEnum(NiveauCriticite),
        nullable=False,
        default=NiveauCriticite.faible,
    )
    # Calculé par iso_engine.rpn_to_criticite(rpn)
    # Mis à jour à chaque recalcul du RPN

    # -------------------------------------------------------------------------
    # Cycle de vie
    # -------------------------------------------------------------------------
    statut = Column(
        SAEnum(StatutRisque),
        nullable=False,
        default=StatutRisque.identifie,
    )

    date_identification = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_echeance       = Column(DateTime, nullable=True)
    # Date cible pour résolution ou réévaluation

    date_cloture = Column(DateTime, nullable=True)
    # Renseignée quand statut → clos

    # -------------------------------------------------------------------------
    # Plan de traitement
    # -------------------------------------------------------------------------
    strategie = Column(SAEnum(StrategieTraitement), nullable=True)

    plan_attenuation = Column(Text, nullable=True)
    # Description des actions planifiées pour réduire le RPN
    # ex: "Mettre en place un tableau de suivi mensuel des dépenses
    #      avec alerte automatique à 80% du seuil"

    risque_residuel = Column(Text, nullable=True)
    # Description du risque résiduel accepté après traitement

    # RPN cible après traitement (objectif)
    rpn_cible = Column(Float, nullable=True)
    # Si rpn_cible défini → permet de mesurer l'efficacité des actions

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_actif = Column(Boolean, default=True, nullable=False)

    genere_automatiquement = Column(Boolean, default=False, nullable=False)
    # True = créé par DiagnosticService depuis un écart majeur
    # False = saisi manuellement par le pilote

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="risques",
    )

    responsable = relationship(
        "Utilisateur",
        foreign_keys=[responsable_id],
    )

    diagnostic_clause = relationship(
        "DiagnosticClause",
        foreign_keys=[diagnostic_clause_id],
    )

    actions = relationship(
        "Action",
        back_populates="risque",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Risque [{self.reference}] "
            f"RPN={self.rpn} "
            f"criticite={self.criticite} "
            f"statut={self.statut}>"
        )