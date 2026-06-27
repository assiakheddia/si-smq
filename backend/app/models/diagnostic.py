"""
backend/app/models/diagnostic.py

Deux tables complémentaires :

  ┌─────────────────────────────────────────────────────────────┐
  │  DiagnosticISO          (1 par processus)                   │
  │  → score global agrégé, statut, date, auditeur              │
  │                                                             │
  │      └── DiagnosticClause  (N par diagnostic)               │
  │          → 1 ligne = 1 clause feuille évaluée               │
  │          → score + niveau + écart + recommandation hybride  │
  └─────────────────────────────────────────────────────────────┘

Logique de calcul (portée par iso_engine.py, pas ici) :
  - DiagnosticClause.score          → saisi par l'auditeur (0–100)
  - DiagnosticClause.niveau         → calculé automatiquement depuis score
  - DiagnosticISO.score_global      → moyenne pondérée des clauses
  - DiagnosticISO.niveau_global     → calculé depuis score_global
  - Processus.score_maturite        → mis à jour depuis DiagnosticISO
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

class NiveauMaturite(str, enum.Enum):
    """
    Barème ISO 9001 — calculé automatiquement depuis le score :
      0  – 25  → non_conforme
      25 – 50  → partiel
      50 – 75  → avance
      75 – 100 → conforme

    Logique de mapping dans iso_engine.py → score_to_niveau()
    """
    non_conforme = "non_conforme"   # 0 – 25 %
    partiel      = "partiel"        # 25 – 50 %
    avance       = "avance"         # 50 – 75 %
    conforme     = "conforme"       # 75 – 100 %


class StatutDiagnostic(str, enum.Enum):
    brouillon     = "brouillon"      # En cours de saisie
    soumis        = "soumis"         # Soumis pour validation (auditeur interne)
    valide        = "valide"         # Validé en interne — prêt pour l'audit externe
    audit_externe = "audit_externe"  # Audit externe lancé par la Direction
    archive       = "archive"        # Historique — remplacé par un diagnostic plus récent


class TypeEcart(str, enum.Enum):
    """
    Classification des écarts (visible dans le diagramme conceptuel :
    'Diagnostic des dysfonctionnements → Classification majeur/mineur/observation')
    """
    majeur      = "majeur"       # Blocant pour la certification
    mineur      = "mineur"       # À corriger mais non bloquant
    observation = "observation"  # Point de vigilance, pas d'écart formel
    conforme    = "conforme"     # Aucun écart identifié


# =============================================================================
# DIAGNOSTIC GLOBAL  (1 par processus × campagne)
# =============================================================================

class DiagnosticISO(Base):
    """
    Diagnostic de maturité d'un processus vis-à-vis de l'ISO 9001:2015.

    Un processus peut avoir plusieurs diagnostics dans le temps
    (historique des campagnes d'évaluation).
    Le diagnostic le plus récent avec statut='valide' est celui
    utilisé par l'ISOEngine pour calculer le score_maturite du processus.
    """

    __tablename__ = "diagnostics_iso"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id          = Column(Integer, primary_key=True, index=True)
    reference   = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "DIAG-2025-PROC-LABO-001" — généré par le service, pas saisi

    # -------------------------------------------------------------------------
    # Relations principales
    # -------------------------------------------------------------------------
    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    auditeur_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Personne ayant réalisé le diagnostic (rôle auditeur ou admin)

    # -------------------------------------------------------------------------
    # Score global (agrégé depuis les DiagnosticClause)
    # -------------------------------------------------------------------------
    score_global  = Column(Float, default=0.0, nullable=False)
    # Calculé par iso_engine.py — moyenne pondérée des scores de clauses
    # Mis à jour à chaque modification d'un DiagnosticClause

    niveau_global = Column(
        SAEnum(NiveauMaturite),
        default=NiveauMaturite.non_conforme,
        nullable=False,
    )
    # Calculé automatiquement depuis score_global par iso_engine.score_to_niveau()

    # -------------------------------------------------------------------------
    # Contexte et statut
    # -------------------------------------------------------------------------
    statut = Column(
        SAEnum(StatutDiagnostic),
        default=StatutDiagnostic.brouillon,
        nullable=False,
    )

    date_diagnostic  = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Date de création de l'enregistrement (horodatage technique).

    date_planifiee   = Column(DateTime, nullable=True)
    # Date à laquelle l'audit/diagnostic est programmé (choisie par
    # l'utilisateur dans le calendrier) — distincte de date_diagnostic.

    date_validation  = Column(DateTime, nullable=True)
    # Renseignée quand statut passe à "valide"

    periode_couverte = Column(String(50), nullable=True)
    # ex: "2025-S1", "2024-Annuel" — permet de grouper les diagnostics par campagne

    commentaire_global = Column(Text, nullable=True)
    # Synthèse libre du diagnostic global

    est_actif = Column(Boolean, default=True, nullable=False)
    # False = archivé, remplacé par une version plus récente

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="diagnostics",
    )

    auditeur = relationship(
        "Utilisateur",
        foreign_keys=[auditeur_id],
    )

    clauses_evaluees = relationship(
        "DiagnosticClause",
        back_populates="diagnostic",
        cascade="all, delete-orphan",
        order_by="DiagnosticClause.id",
    )

    # -------------------------------------------------------------------------
    # Compteurs agrégés — toujours recalculés depuis clauses_evaluees, jamais
    # stockés en colonne (évite toute désynchronisation avec le détail).
    # -------------------------------------------------------------------------
    @property
    def nb_clauses_total(self) -> int:
        """Nombre de clauses applicables rattachées à ce diagnostic (évaluées ou non)."""
        return len(self.clauses_evaluees)

    @property
    def nb_clauses_evaluees(self) -> int:
        """Nombre de clauses réellement évaluées (est_evalue=True) — cf. DiagnosticClause.est_evalue."""
        return sum(1 for c in self.clauses_evaluees if c.est_evalue)

    @property
    def nb_clauses_conformes(self) -> int:
        return sum(1 for c in self.clauses_evaluees if c.niveau == NiveauMaturite.conforme)

    @property
    def nb_ecarts_majeurs(self) -> int:
        return sum(1 for c in self.clauses_evaluees if c.type_ecart == TypeEcart.majeur)

    @property
    def nb_ecarts_mineurs(self) -> int:
        return sum(1 for c in self.clauses_evaluees if c.type_ecart == TypeEcart.mineur)

    @property
    def nb_observations(self) -> int:
        return sum(1 for c in self.clauses_evaluees if c.type_ecart == TypeEcart.observation)

    @property
    def synthese_par_section(self) -> list[dict]:
        """
        Agrège les DiagnosticClause par section ISO de tête (4, 5, 6, 7, 8, 9, 10)
        — déduite du préfixe du code de clause ("7.5.3" -> section "7").
        Utilisé pour le radar chart / la vue "Conformité par groupe de clauses".
        """
        from app.core.iso_engine import score_to_niveau

        sections: dict[str, dict] = {}
        for c in self.clauses_evaluees:
            if not c.est_applicable or not c.clause:
                continue
            code_section = c.clause.code.split(".")[0]
            agg = sections.setdefault(code_section, {
                "code_section": code_section,
                "titre_section": c.clause.titre if c.clause.code == code_section else None,
                "total_pondere": 0.0,
                "total_poids": 0.0,
                "nb_clauses": 0,
                "nb_conformes": 0,
            })
            if c.clause.code == code_section:
                agg["titre_section"] = c.clause.titre
            agg["total_pondere"] += c.score * c.poids
            agg["total_poids"] += c.poids
            agg["nb_clauses"] += 1
            if c.niveau == NiveauMaturite.conforme:
                agg["nb_conformes"] += 1

        resultats = []
        for code_section in sorted(sections.keys(), key=lambda x: int(x)):
            agg = sections[code_section]
            score = round(agg["total_pondere"] / agg["total_poids"], 2) if agg["total_poids"] else 0.0
            resultats.append({
                "code_section": code_section,
                "titre_section": agg["titre_section"] or f"Section {code_section}",
                "score_section": score,
                "niveau_section": score_to_niveau(score),
                "nb_clauses": agg["nb_clauses"],
                "nb_conformes": agg["nb_conformes"],
            })
        return resultats

    def __repr__(self) -> str:
        return (
            f"<DiagnosticISO [{self.reference}] "
            f"processus={self.processus_id} "
            f"score={self.score_global:.1f} "
            f"statut={self.statut}>"
        )


# =============================================================================
# DIAGNOSTIC DÉTAIL PAR CLAUSE  (N par DiagnosticISO)
# =============================================================================

class DiagnosticClause(Base):
    """
    Évaluation d'une clause ISO feuille dans le cadre d'un DiagnosticISO.

    1 DiagnosticISO  →  N DiagnosticClause
    (une par clause feuille applicable du référentiel)

    Recommandation hybride :
      - recommandation_auto   → générée par iso_engine.py selon le score et la clause
      - recommandation_manuelle → saisie libre par l'auditeur
      - recommandation_finale → recommandation_manuelle si renseignée,
                                sinon recommandation_auto
        (logique portée par le service, pas calculée ici en DB)
    """

    __tablename__ = "diagnostics_clauses"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id = Column(Integer, primary_key=True, index=True)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    diagnostic_id = Column(
        Integer,
        ForeignKey("diagnostics_iso.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    clause_id = Column(
        Integer,
        ForeignKey("clauses_iso.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # RESTRICT : on ne peut pas supprimer une clause qui a des diagnostics

    # -------------------------------------------------------------------------
    # Score et niveau (cœur du diagnostic)
    # -------------------------------------------------------------------------
    score = Column(Float, nullable=False, default=0.0)
    # Saisi par l'auditeur : 0.0 → 100.0
    # Représente le pourcentage de conformité à cette clause
    # ATTENTION : ce champ vaut 0.0 par défaut (NOT NULL) — il ne permet PAS
    # de distinguer "noté 0 volontairement" de "jamais évalué". C'est le rôle
    # de est_evalue ci-dessous (ne jamais se fier à score.is_(None), toujours
    # NULL-safe puisque la colonne ne contient jamais NULL).

    est_evalue = Column(Boolean, nullable=False, default=False)
    # True dès qu'un score réel a été saisi (evaluer_clause / modifier_clause /
    # evaluer_toutes_clauses). Seule source de vérité pour la complétude d'un
    # diagnostic — score/niveau/type_ecart ont des valeurs par défaut non-NULL
    # qui ne peuvent pas servir à ça.

    niveau = Column(
        SAEnum(NiveauMaturite),
        nullable=False,
        default=NiveauMaturite.non_conforme,
    )
    # Calculé automatiquement depuis `score` par iso_engine.score_to_niveau()
    # Mis à jour à chaque modification du score

    # -------------------------------------------------------------------------
    # Analyse de l'écart
    # -------------------------------------------------------------------------
    type_ecart = Column(
        SAEnum(TypeEcart),
        nullable=True,
    )
    # Calculé par iso_engine ou saisi par l'auditeur
    # NULL si non encore évalué

    description_ecart = Column(Text, nullable=True)
    # Description libre de l'écart constaté
    # ex: "Aucune procédure documentée pour la maîtrise des achats > seuil"

    preuves_existantes = Column(Text, nullable=True)
    # Ce qui existe déjà et prouve un début de conformité
    # ex: "Bons de commande archivés, suivi Excel partiel"

    # -------------------------------------------------------------------------
    # Recommandations (hybride auto + manuelle)
    # -------------------------------------------------------------------------
    recommandation_auto = Column(Text, nullable=True)
    # Générée par iso_engine.py selon (clause.code, score, type_ecart)
    # Exemples :
    #   clause 7.5.3 + score 20 → "Mettre en place une procédure de maîtrise
    #                              des documents avec droits d'accès définis."
    #   clause 9.2   + score 45 → "Planifier un programme d'audit interne annuel."

    recommandation_manuelle = Column(Text, nullable=True)
    # Saisie libre par l'auditeur — surcharge recommandation_auto si renseignée

    # Pas de champ recommandation_finale en DB :
    # → calculé à la volée par le service : manuelle ?? manuelle : auto
    # → évite la duplication et la désynchronisation

    # -------------------------------------------------------------------------
    # Pondération (pour le calcul du score global)
    # -------------------------------------------------------------------------
    poids = Column(Float, default=1.0, nullable=False)
    # Permet de pondérer certaines clauses plus critiques pour l'organisme
    # Par défaut 1.0 (toutes égales) — ajustable par l'admin

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_applicable = Column(Boolean, default=True, nullable=False)
    # False = clause exclue du périmètre pour ce processus
    # (ex: clause 8.3 non applicable si pas de conception)
    # Si False → non incluse dans le calcul du score_global

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    diagnostic = relationship(
        "DiagnosticISO",
        back_populates="clauses_evaluees",
    )

    clause = relationship(
        "ClauseISO",
        back_populates="diagnostics",
    )

    def __repr__(self) -> str:
        return (
            f"<DiagnosticClause "
            f"diagnostic={self.diagnostic_id} "
            f"clause={self.clause_id} "
            f"score={self.score} "
            f"niveau={self.niveau}>"
        )