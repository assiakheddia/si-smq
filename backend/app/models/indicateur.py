"""
backend/app/models/indicateur.py

Deux tables complémentaires :

  ┌─────────────────────────────────────────────────────────────────┐
  │  Indicateur      (définition du KPI)                            │
  │  → quoi mesurer, comment, cible, seuils, fréquence, source      │
  │                                                                 │
  │      └── MesureKPI  (historique des valeurs)                    │
  │          → 1 ligne = 1 relevé à une date donnée                 │
  │          → valeur + valeur_precedente + évolution + statut alerte│
  └─────────────────────────────────────────────────────────────────┘

KPI auto calculables (source = "auto") :
  - score_maturite_processus  → depuis Processus.score_maturite
  - taux_actions_closes       → nb actions closes / nb actions totales
  - taux_conformite_clauses   → nb clauses conformes / nb clauses évaluées
  - nb_risques_critiques      → COUNT risques WHERE criticite = 'critique'
  - taux_documents_valides    → nb docs valides / nb docs totaux

KPI manuels (source = "manuel") :
  - satisfaction_client, délais, taux formation, etc.
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

class UniteKPI(str, enum.Enum):
    """Unités de mesure des indicateurs."""
    pourcentage  = "pourcentage"   # 0–100 %
    nombre       = "nombre"        # Entier (nb risques, nb actions...)
    score        = "score"         # Score continu (maturité 0–100)
    jours        = "jours"         # Délai en jours
    heures       = "heures"        # Durée en heures
    euro         = "euro"          # Montant financier (budget labo)
    ratio        = "ratio"         # Ratio décimal (ex: 0.85)
    autre        = "autre"         # Unité libre (précisée dans unite_custom)


class FrequenceMesure(str, enum.Enum):
    """Fréquence de collecte des mesures."""
    quotidien    = "quotidien"
    hebdomadaire = "hebdomadaire"
    mensuel      = "mensuel"
    trimestriel  = "trimestriel"
    semestriel   = "semestriel"
    annuel       = "annuel"
    ponctuel     = "ponctuel"     # Sur événement (ex: après chaque diagnostic)


class SourceKPI(str, enum.Enum):
    """
    Source de la valeur du KPI.
    Détermine si la mesure est saisie manuellement ou calculée automatiquement.
    """
    manuel       = "manuel"       # Saisie par le pilote
    auto         = "auto"         # Calculé par kpi_service.py depuis la DB
    mixte        = "mixte"        # Base auto + ajustement manuel possible


class SensKPI(str, enum.Enum):
    """
    Sens d'amélioration du KPI.
    Utilisé pour calculer si l'évolution est positive ou négative.
    """
    hausse       = "hausse"       # Plus c'est haut, mieux c'est (ex: taux conformité)
    baisse       = "baisse"       # Plus c'est bas, mieux c'est (ex: nb risques critiques)
    cible        = "cible"        # Doit rester proche d'une valeur cible


class StatutAlerte(str, enum.Enum):
    """
    Statut d'alerte d'une mesure KPI.
    Calculé par kpi_service selon seuils de l'Indicateur.
    Correspond aux alertes du diagramme conceptuel (préoccupante/critique/informative).
    """
    normal       = "normal"       # Dans la zone verte
    attention    = "attention"    # Seuil d'attention dépassé (orange)
    alerte       = "alerte"       # Seuil d'alerte dépassé (rouge)


class FormulaKPI(str, enum.Enum):
    """
    Formules de calcul automatique disponibles.
    Chaque valeur correspond à une méthode dans kpi_service.py.
    NULL si source = manuel.
    """
    score_maturite_processus  = "score_maturite_processus"
    # → Processus.score_maturite (mis à jour par ISOEngine)

    taux_actions_closes       = "taux_actions_closes"
    # → COUNT(actions WHERE statut='close') / COUNT(actions) × 100

    taux_conformite_clauses   = "taux_conformite_clauses"
    # → COUNT(DiagnosticClause WHERE niveau='conforme') /
    #   COUNT(DiagnosticClause WHERE est_applicable=True) × 100

    nb_risques_critiques      = "nb_risques_critiques"
    # → COUNT(risques WHERE criticite='critique' AND est_actif=True)

    nb_risques_actifs         = "nb_risques_actifs"
    # → COUNT(risques WHERE est_actif=True AND statut != 'clos')

    taux_documents_valides    = "taux_documents_valides"
    # → COUNT(documents WHERE statut='valide') / COUNT(documents) × 100

    score_global_diagnostic   = "score_global_diagnostic"
    # → DiagnosticISO.score_global (dernier diagnostic valide du processus)

    taux_clauses_conformes    = "taux_clauses_conformes"
    # → Alias de taux_conformite_clauses — pour compatibilité frontend


# =============================================================================
# INDICATEUR (définition du KPI)
# =============================================================================

class Indicateur(Base):
    """
    Définition d'un indicateur de performance (KPI).

    Un indicateur est associé à un processus (optionnel — certains KPI
    sont transversaux, ex: score global ISO de l'organisme).

    Seuils d'alerte (2 niveaux) :
      valeur_cible     : objectif à atteindre
      seuil_attention  : zone orange — surveillance renforcée
      seuil_alerte     : zone rouge — action requise

    Le sens (hausse/baisse/cible) détermine dans quel sens
    les seuils sont interprétés.
    """

    __tablename__ = "indicateurs"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id        = Column(Integer, primary_key=True, index=True)
    code      = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "KPI-MATURITE-LABO", "KPI-ACTIONS-CLOSES"

    nom         = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # NULL = KPI transversal (ex: score global ISO de l'organisme)

    responsable_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )

    # -------------------------------------------------------------------------
    # Configuration de la mesure
    # -------------------------------------------------------------------------
    unite         = Column(SAEnum(UniteKPI), nullable=False, default=UniteKPI.pourcentage)
    unite_custom  = Column(String(50), nullable=True)
    # Utilisé si unite = "autre"

    sens          = Column(SAEnum(SensKPI), nullable=False, default=SensKPI.hausse)
    frequence     = Column(SAEnum(FrequenceMesure), nullable=False, default=FrequenceMesure.mensuel)
    source        = Column(SAEnum(SourceKPI), nullable=False, default=SourceKPI.manuel)

    formule       = Column(SAEnum(FormulaKPI), nullable=True)
    # Renseigné uniquement si source = auto ou mixte
    # Correspond à la méthode appelée dans kpi_service.py

    # -------------------------------------------------------------------------
    # Valeurs de référence
    # -------------------------------------------------------------------------
    valeur_initiale  = Column(Float, nullable=True)
    # Valeur au démarrage du SMQ (baseline)

    valeur_cible     = Column(Float, nullable=True)
    # Objectif à atteindre

    seuil_attention  = Column(Float, nullable=True)
    # Zone orange — déclenche StatutAlerte.attention sur la mesure
    # Sens hausse  : valeur < seuil_attention → attention
    # Sens baisse  : valeur > seuil_attention → attention

    seuil_alerte     = Column(Float, nullable=True)
    # Zone rouge — déclenche StatutAlerte.alerte sur la mesure
    # Sens hausse  : valeur < seuil_alerte → alerte
    # Sens baisse  : valeur > seuil_alerte → alerte

    valeur_actuelle  = Column(Float, default=0.0, nullable=False)
    # Dénormalisée depuis la dernière MesureKPI — pour lecture rapide
    # Mise à jour à chaque nouvelle mesure par kpi_service

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_actif        = Column(Boolean, default=True, nullable=False)
    afficher_dashboard = Column(Boolean, default=True, nullable=False)
    # Contrôle la visibilité sur le tableau de bord principal

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="indicateurs",
    )

    responsable = relationship(
        "Utilisateur",
        foreign_keys=[responsable_id],
    )

    mesures = relationship(
        "MesureKPI",
        back_populates="indicateur",
        cascade="all, delete-orphan",
        order_by="MesureKPI.date_mesure.desc()",
    )

    def __repr__(self) -> str:
        return (
            f"<Indicateur [{self.code}] {self.nom} "
            f"= {self.valeur_actuelle} / {self.valeur_cible}>"
        )


# =============================================================================
# MESURE KPI (historique)
# =============================================================================

class MesureKPI(Base):
    """
    Relevé d'une valeur KPI à un instant donné.

    1 Indicateur → N MesureKPI (série temporelle).

    Évolution intégrée :
      valeur_precedente → copiée depuis la dernière mesure par kpi_service
      evolution         → calculée : valeur - valeur_precedente
      evolution_pct     → ((valeur - valeur_precedente) / valeur_precedente) × 100

    Ces 3 champs sont calculés et stockés par kpi_service.enregistrer_mesure()
    pour permettre le tri/filtrage en DB sans recalcul à la volée.

    Statut d'alerte :
      Calculé par kpi_service.evaluer_alerte() selon les seuils de l'Indicateur.
    """

    __tablename__ = "mesures_kpi"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id = Column(Integer, primary_key=True, index=True)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    indicateur_id = Column(
        Integer,
        ForeignKey("indicateurs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    saisi_par_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # NULL si mesure auto (calculée par kpi_service sans intervention humaine)

    # -------------------------------------------------------------------------
    # Valeur principale
    # -------------------------------------------------------------------------
    valeur      = Column(Float, nullable=False)
    date_mesure = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    # Indexée pour les requêtes ORDER BY date_mesure (graphiques temporels)

    periode     = Column(String(20), nullable=True)
    # Libellé de la période couverte par cette mesure
    # ex: "2025-T1", "2025-S2", "2025-12" (mensuel), "2025"
    # Permet de grouper les mesures par période sur les graphiques

    # -------------------------------------------------------------------------
    # Évolution (calculée et stockée par kpi_service)
    # -------------------------------------------------------------------------
    valeur_precedente = Column(Float, nullable=True)
    # Valeur de la mesure précédente — copiée au moment de l'enregistrement
    # NULL si première mesure de cet indicateur

    evolution         = Column(Float, nullable=True)
    # valeur - valeur_precedente
    # Positif = amélioration si sens=hausse, dégradation si sens=baisse
    # NULL si valeur_precedente est NULL

    evolution_pct     = Column(Float, nullable=True)
    # ((valeur - valeur_precedente) / |valeur_precedente|) × 100
    # NULL si valeur_precedente est NULL ou zéro
    # Stocké pour éviter la division par zéro répétée côté frontend

    # -------------------------------------------------------------------------
    # Statut d'alerte (calculé par kpi_service.evaluer_alerte())
    # -------------------------------------------------------------------------
    statut_alerte = Column(
        SAEnum(StatutAlerte),
        nullable=False,
        default=StatutAlerte.normal,
    )
    # Correspond aux alertes du diagramme conceptuel :
    #   normal    → vert   (dans les clous)
    #   attention → orange (préoccupante)
    #   alerte    → rouge  (critique)

    # -------------------------------------------------------------------------
    # Contexte (enrichissement manuel ou auto)
    # -------------------------------------------------------------------------
    commentaire = Column(Text, nullable=True)
    # Note contextuelle : "Baisse due aux congés d'été", "Audit réalisé en novembre"

    source_detail = Column(String(255), nullable=True)
    # Pour les KPI auto : détail de la requête ou du calcul effectué
    # ex: "Calculé sur 12 processus actifs, 3 diagnostics validés"
    # Pour les KPI manuels : source du relevé (rapport, enquête, etc.)

    est_valide = Column(Boolean, default=True, nullable=False)
    # False = mesure invalidée (erreur de saisie, données incomplètes)
    # Mesures invalides exclues des graphiques mais conservées pour audit

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    indicateur = relationship(
        "Indicateur",
        back_populates="mesures",
    )

    saisi_par = relationship(
        "Utilisateur",
        foreign_keys=[saisi_par_id],
    )

    def __repr__(self) -> str:
        evo = f" ({self.evolution_pct:+.1f}%)" if self.evolution_pct is not None else ""
        return (
            f"<MesureKPI indicateur={self.indicateur_id} "
            f"valeur={self.valeur}{evo} "
            f"[{self.statut_alerte}] "
            f"{self.date_mesure:%Y-%m-%d}>"
        )