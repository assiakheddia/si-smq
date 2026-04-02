"""
backend/app/models/diagnostic.py

DiagnosticISO : Évaluation de la conformité ISO 9001:2015 à l'intersection d'un Processus et d'une Clause.

Logique :
  - Chaque DiagnosticISO évalue la conformité d'un Processus vis-à-vis d'une Clause ISO (feuille).
  - Score : 0-100 (0=non conforme, 100=conforme).
  - Niveau : catégorie de conformité calculée depuis le score.
  - Peut être lié à un Audit et ses Findings.
  - Supporte les recommandations et le suivi.

Hiérarchie :
  - Du DiagnosticISO d'une clause feuille, on remonte le score aux parents.
  - L'ISOEngine calcule les scores agrégés au niveau section/clause.
"""

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Enum as SAEnum, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import enum


# =============================================================================
# ENUMS
# =============================================================================

class NiveauConformite(str, enum.Enum):
    """
    Niveaux de conformité à la norme ISO 9001:2015.
    Calculé depuis le score : 0-25% (non_conforme) → conforme (75-100%)
    """
    non_conforme = "non_conforme"      # 0-25% : aucune mise en œuvre
    partiel      = "partiel"           # 25-50% : mise en œuvre incomplete
    avance       = "avance"            # 50-75% : mise en œuvre substantielle
    conforme     = "conforme"          # 75-100% : mise en œuvre complète et vérifiée


class StatutDiagnostic(str, enum.Enum):
    """
    Cycle de vie d'un diagnostic.
    """
    brouillon      = "brouillon"       # En cours de rédaction
    en_audit       = "en_audit"        # Sous audit/vérification
    valide         = "valide"          # Approuvé et enregistré
    en_amelioration = "en_amelioration" # Actions correctives en cours
    clos           = "clos"            # Diagnostic ancien, remplacé par un nouvel audit


# =============================================================================
# DIAGNOSTIC ISO
# =============================================================================

class DiagnosticISO(Base):
    """
    Évaluation de conformité ISO au croisement Processus × Clause ISO (feuille).
    
    Exemples :
      - Processus "Gestion des achats" vs. Clause "6.1" (Généralités ressources)
      - Processus "Encadrement doctoral" vs. Clause "7.5.1" (Généralités maîtrise opérationnelle)
    """

    __tablename__ = "diagnostics_iso"

    # =========================================================================
    # Identité
    # =========================================================================
    id = Column(Integer, primary_key=True, index=True)

    # =========================================================================
    # Relations primaires
    # =========================================================================
    processus_id = Column(Integer, ForeignKey("processus.id", ondelete="CASCADE"), nullable=False, index=True)
    # Processus évalué (peut être une racine ou un sous-processus)

    clause_iso_id = Column(Integer, ForeignKey("clauses_iso.id", ondelete="RESTRICT"), nullable=False, index=True)
    # Clause ISO (doit être est_feuille=True)

    auditeur_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)
    # Personne ayant conduit l'audit/diagnostic

    # =========================================================================
    # Données d'évaluation
    # =========================================================================
    score = Column(Float, default=0.0, nullable=False)
    # Score de conformité : 0.0 → 100.0
    # Calculé/saisi lors de l'audit

    niveau = Column(SAEnum(NiveauConformite), default=NiveauConformite.non_conforme, nullable=False)
    # Niveau de conformité déduit du score (recalculé par iso_engine)

    # =========================================================================
    # Justification et contexte
    # =========================================================================
    description_ecart = Column(Text, nullable=True)
    # Description des écarts identifiés vs. la norme
    # Ex : "Pas de document formalisé définissant les risques du processus"

    justification = Column(Text, nullable=True)
    # Justification/preuve du score — éléments observés, documents consultés
    # Ex : "Consultation dossier RH, entretien responsable processus"

    recommandation = Column(Text, nullable=True)
    # Actions recommandées pour progresser vers la conformité

    observation = Column(Text, nullable=True)
    # Notes additionnelles, contexte particulier de l'organisme

    # =========================================================================
    # Suivi des actions
    # =========================================================================
    est_action_requise = Column(Boolean, default=False, nullable=False)
    # Flag : des actions correctives sont-elles nécessaires ?

    date_action_prevue = Column(DateTime, nullable=True)
    # Échéance pour les actions correctives

    # =========================================================================
    # Audit & Contrôle de qualité
    # =========================================================================
    statut = Column(SAEnum(StatutDiagnostic), default=StatutDiagnostic.brouillon, nullable=False)
    # État du diagnostic (brouillon → valide → clos)

    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Quand le diagnostic a-t-il été créé/saisi ?

    date_validation = Column(DateTime, nullable=True)
    # Quand a-t-il été validé par une autorité (auditeur, pilote) ?

    date_mise_a_jour = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # Dernière modification

    version = Column(Integer, default=1, nullable=False)
    # Numéro de version (pour tracer les révisions)

    # =========================================================================
    # Relations
    # =========================================================================
    processus = relationship(
        "Processus",
        back_populates="diagnostics",
        foreign_keys=[processus_id],
    )

    clause = relationship(
        "ClauseISO",
        back_populates="diagnostics",
        foreign_keys=[clause_iso_id],
    )

    auditeur = relationship(
        "Utilisateur",
        foreign_keys=[auditeur_id],
        back_populates="diagnostics_audit",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticISO {self.clause.code if self.clause else '?'} × {self.processus.code if self.processus else '?'} — {self.niveau.value}>"