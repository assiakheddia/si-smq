"""
backend/app/schemas/indicateur.py

Schemas Pydantic v2 pour Indicateur (KPI) + MesureKPI (historique).

Hiérarchie :

  Indicateur
    ├── IndicateurCreate        → définition d'un KPI
    ├── IndicateurUpdate        → modification partielle
    ├── IndicateurResponse      → lecture avec valeur actuelle + statut alerte
    └── IndicateurResponseDetail→ fiche complète avec historique mesures

  MesureKPI
    ├── MesureCreate            → enregistrement d'une valeur
    ├── MesureResponse          → lecture avec évolution calculée
    └── MesureListResponse      → série temporelle paginée

  Utilitaires :
    SimulerAlerteRequest        → simulation seuils sans persistance
    TableauBordKPIResponse      → vue synthétique dashboard
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.indicateur import (
    UniteKPI, FrequenceMesure, SourceKPI, SensKPI,
    StatutAlerte, FormulaKPI
)


# =============================================================================
# CONFIG COMMUNE
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
# SOUS-SCHEMAS IMBRIQUÉS
# =============================================================================

class ProcessusResume(_Base):
    id:   int
    code: str | None
    nom:  str


class UtilisateurResume(_Base):
    id:     int
    nom:    str
    prenom: str
    email:  str


# =============================================================================
# MESURE KPI — schemas
# =============================================================================

class MesureBase(_Base):
    valeur:       float = Field(..., description="Valeur mesurée")
    date_mesure:  datetime = Field(
        default_factory=datetime.utcnow,
        description="Date et heure du relevé (défaut : maintenant)"
    )
    periode:      str | None = Field(
        default=None,
        max_length=20,
        description="Libellé de période : '2025-T1', '2025-S2', '2025-12', '2025'"
    )
    commentaire:  str | None = None
    source_detail: str | None = Field(
        default=None,
        description="Détail de la source (rapport, enquête, calcul auto...)"
    )

    @field_validator("valeur")
    @classmethod
    def arrondir_valeur(cls, v: float) -> float:
        return round(v, 4)

    @field_validator("periode")
    @classmethod
    def valider_periode(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        v = v.strip().upper()
        if not re.match(r"^\d{4}(-S[12]|-T[1-4]|-\d{2})?$", v):
            raise ValueError(
                f"Format de période invalide : '{v}'. "
                "Attendu : YYYY, YYYY-S1, YYYY-T2, YYYY-12"
            )
        return v


class MesureCreate(MesureBase):
    """
    Enregistrement d'une mesure KPI.
    indicateur_id porté par l'URL — pas dans le body.
    saisi_par_id : optionnel (défaut : utilisateur courant).
    est_valide   : True par défaut — False pour invalider une saisie erronée.
    """
    saisi_par_id: int | None = Field(
        default=None,
        description="ID du saisissant (défaut : utilisateur courant du token JWT)"
    )
    est_valide: bool = True


class MesureResponse(MesureBase):
    """
    Réponse d'une mesure avec évolution calculée et statut d'alerte.
    valeur_precedente, evolution, evolution_pct : calculés par kpi_service
    et stockés en DB (pas recalculés à la volée).
    """
    id:               int
    indicateur_id:    int
    saisi_par:        UtilisateurResume | None = None
    est_valide:       bool

    # Évolution (stockée — calculée par kpi_service.enregistrer_mesure())
    valeur_precedente: float | None = None
    evolution:         float | None = None
    evolution_pct:     float | None = Field(
        default=None,
        description="Variation en % par rapport à la mesure précédente"
    )

    # Alerte (calculée par iso_engine.evaluer_alerte_kpi() au moment de la saisie)
    statut_alerte: StatutAlerte

    # Indicateur du sens d'évolution (calculé à la sérialisation)
    evolution_positive: bool | None = Field(
        default=None,
        description="True si l'évolution va dans le bon sens selon le sens du KPI"
    )

    @model_validator(mode="after")
    def calculer_evolution_positive(self) -> "MesureResponse":
        """
        Détermine si l'évolution est favorable selon le sens du KPI.
        Nécessite le sens de l'indicateur parent — injecté par le service
        avant sérialisation via un champ temporaire _sens.
        Si _sens non disponible, on laisse None.
        """
        # Le service injecte le sens via un attribut temporaire
        # si non disponible on reste None (pas d'erreur)
        sens = getattr(self, "_sens", None)
        if self.evolution is None or sens is None:
            return self
        if sens == "hausse":
            self.evolution_positive = self.evolution >= 0
        elif sens == "baisse":
            self.evolution_positive = self.evolution <= 0
        # sens="cible" → pas de positif/négatif absolu
        return self


class MesureListResponse(_Base):
    """Série temporelle paginée pour les graphiques."""
    total:      int
    page:       int
    per_page:   int
    items:      list[MesureResponse]

    # Statistiques sur la série complète (pas juste la page)
    valeur_min:     float | None = None
    valeur_max:     float | None = None
    valeur_moyenne: float | None = None
    tendance:       str | None = Field(
        default=None,
        description="'hausse' | 'baisse' | 'stable' — calculé sur les N dernières mesures"
    )


# =============================================================================
# INDICATEUR — BASE
# =============================================================================

class IndicateurBase(_Base):
    nom:          str = Field(..., min_length=2, max_length=255)
    description:  str | None = None
    code:         str | None = Field(default=None, max_length=50)

    unite:        UniteKPI       = Field(default=UniteKPI.pourcentage)
    unite_custom: str | None     = Field(default=None, max_length=50,
                                         description="Unité libre si unite='autre'")
    sens:         SensKPI        = Field(default=SensKPI.hausse)
    frequence:    FrequenceMesure = Field(default=FrequenceMesure.mensuel)
    source:       SourceKPI      = Field(default=SourceKPI.manuel)
    formule:      FormulaKPI | None = Field(
        default=None,
        description="Formule de calcul auto — requis si source='auto' ou 'mixte'"
    )

    valeur_initiale:   float | None = Field(default=None, description="Valeur baseline au démarrage")
    valeur_cible:      float | None = Field(default=None, description="Objectif à atteindre")
    seuil_attention:   float | None = Field(
        default=None,
        description="Seuil zone orange — déclenche StatutAlerte.attention"
    )
    seuil_alerte:      float | None = Field(
        default=None,
        description="Seuil zone rouge — déclenche StatutAlerte.alerte"
    )

    est_actif:           bool = True
    afficher_dashboard:  bool = True

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str | None) -> str | None:
        return v.upper().strip() if v else v

    @field_validator("nom")
    @classmethod
    def nom_strip(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def valider_config_source(self) -> "IndicateurBase":
        """
        Règles de cohérence source ↔ formule :
          - source='auto' ou 'mixte' → formule obligatoire
          - source='manuel'           → formule ignorée (doit être None)
        """
        if self.source in (SourceKPI.auto, SourceKPI.mixte) and not self.formule:
            raise ValueError(
                f"formule est requis quand source='{self.source}'. "
                f"Valeurs disponibles : {[f.value for f in FormulaKPI]}"
            )
        if self.source == SourceKPI.manuel and self.formule:
            raise ValueError(
                "formule doit être None quand source='manuel' "
                "(les KPI manuels n'ont pas de formule de calcul auto)."
            )
        return self

    @model_validator(mode="after")
    def valider_seuils(self) -> "IndicateurBase":
        """
        Cohérence des seuils selon le sens du KPI.

        Sens 'hausse' (plus c'est haut, mieux c'est) :
          seuil_alerte < seuil_attention < valeur_cible

        Sens 'baisse' (plus c'est bas, mieux c'est) :
          valeur_cible < seuil_attention < seuil_alerte

        Sens 'cible' : seuil_attention = valeur cible, seuil_alerte = écart max
        """
        sa = self.seuil_attention
        sal = self.seuil_alerte
        cible = self.valeur_cible

        if sa is None or sal is None:
            return self  # Seuils optionnels — pas de validation si absents

        if self.sens == SensKPI.hausse:
            if sal >= sa:
                raise ValueError(
                    f"Sens 'hausse' : seuil_alerte ({sal}) doit être "
                    f"inférieur à seuil_attention ({sa})."
                )
            if cible is not None and sa >= cible:
                raise ValueError(
                    f"Sens 'hausse' : seuil_attention ({sa}) doit être "
                    f"inférieur à valeur_cible ({cible})."
                )

        elif self.sens == SensKPI.baisse:
            if sal <= sa:
                raise ValueError(
                    f"Sens 'baisse' : seuil_alerte ({sal}) doit être "
                    f"supérieur à seuil_attention ({sa})."
                )
            if cible is not None and sa <= cible:
                raise ValueError(
                    f"Sens 'baisse' : seuil_attention ({sa}) doit être "
                    f"supérieur à valeur_cible ({cible})."
                )
        return self

    @model_validator(mode="after")
    def unite_custom_si_autre(self) -> "IndicateurBase":
        if self.unite == UniteKPI.autre and not self.unite_custom:
            raise ValueError(
                "unite_custom est requis quand unite='autre'."
            )
        return self


# =============================================================================
# INDICATEUR — CREATE
# =============================================================================

class IndicateurCreate(IndicateurBase):
    """
    Création d'un indicateur de performance.
    processus_id : optionnel (None = KPI transversal).
    responsable_id : optionnel.
    """
    processus_id:    int | None = Field(
        default=None,
        description="Processus associé — None pour un KPI transversal"
    )
    responsable_id:  int | None = None


# =============================================================================
# INDICATEUR — UPDATE (PATCH)
# =============================================================================

class IndicateurUpdate(_Base):
    """Mise à jour partielle — tous champs optionnels."""
    nom:             str | None = Field(default=None, min_length=2, max_length=255)
    description:     str | None = None
    code:            str | None = Field(default=None, max_length=50)
    unite:           UniteKPI | None = None
    unite_custom:    str | None = None
    sens:            SensKPI | None = None
    frequence:       FrequenceMesure | None = None
    source:          SourceKPI | None = None
    formule:         FormulaKPI | None = None
    valeur_initiale: float | None = None
    valeur_cible:    float | None = None
    seuil_attention: float | None = None
    seuil_alerte:    float | None = None
    responsable_id:  int | None = None
    est_actif:       bool | None = None
    afficher_dashboard: bool | None = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str | None) -> str | None:
        return v.upper().strip() if v else v

    model_config = {"from_attributes": True}


# =============================================================================
# INDICATEUR — RESPONSE (liste)
# =============================================================================

class IndicateurResponse(_Base):
    """Réponse légère — liste et widgets dashboard."""
    id:              int
    code:            str | None
    nom:             str
    description:     str | None
    processus_id:    int | None
    processus_nom:   str | None = None    # Dénormalisé par le service

    unite:           UniteKPI
    unite_custom:    str | None
    sens:            SensKPI
    frequence:       FrequenceMesure
    source:          SourceKPI
    formule:         FormulaKPI | None

    valeur_actuelle: float
    valeur_cible:    float | None
    valeur_initiale: float | None
    seuil_attention: float | None
    seuil_alerte:    float | None

    # Statut d'alerte de la dernière mesure
    statut_alerte_actuel: StatutAlerte = StatutAlerte.normal

    # Progression vers la cible (calculée par le service)
    progression_cible_pct: float | None = Field(
        default=None,
        description="(valeur_actuelle / valeur_cible) × 100 si cible définie"
    )

    responsable:     UtilisateurResume | None = None
    est_actif:       bool
    afficher_dashboard: bool

    # Dernière mesure (résumé)
    derniere_mesure_date: datetime | None = None
    nb_mesures:           int = 0


# =============================================================================
# INDICATEUR — RESPONSE DETAIL (fiche complète)
# =============================================================================

class IndicateurResponseDetail(IndicateurResponse):
    """Fiche complète — GET /indicateurs/{id}."""
    processus:       ProcessusResume | None = None
    mesures_recentes: list[MesureResponse] = Field(
        default_factory=list,
        description="10 dernières mesures valides — pour le mini-graphique"
    )


# =============================================================================
# UTILITAIRES
# =============================================================================

class SimulerAlerteRequest(_Base):
    """
    POST /indicateurs/{id}/simuler-alerte
    Simule le statut d'alerte pour une valeur hypothétique,
    sans enregistrer de mesure.
    """
    valeur_simulee: float = Field(..., description="Valeur à tester")


class SimulerAlerteResponse(_Base):
    indicateur_id:   int
    valeur_simulee:  float
    statut_alerte:   StatutAlerte
    seuil_attention: float | None
    seuil_alerte:    float | None
    valeur_cible:    float | None
    message:         str


class TableauBordKPIResponse(_Base):
    """
    GET /indicateurs/tableau-bord
    Vue synthétique pour le dashboard — tous les KPI actifs avec statut.
    """
    total_kpi:       int
    kpi_normaux:     int
    kpi_attention:   int
    kpi_alerte:      int

    # KPI en alerte (rouge) triés par criticité
    alertes_critiques: list[IndicateurResponse] = []

    # KPI en attention (orange)
    alertes_attention: list[IndicateurResponse] = []

    # Tous les KPI dashboard (afficher_dashboard=True)
    kpis:            list[IndicateurResponse] = []

    date_calcul:     datetime = Field(default_factory=datetime.utcnow)


class DeclenchementsAutoResponse(_Base):
    """
    Réponse de POST /indicateurs/recalculer-auto
    Résultat du recalcul de tous les KPI source='auto'.
    """
    nb_recalcules:   int
    nb_erreurs:      int
    details:         list[dict] = Field(
        default_factory=list,
        description="[{indicateur_id, code, ancienne_valeur, nouvelle_valeur, statut_alerte}]"
    )
    duree_ms:        int = Field(description="Durée du recalcul en millisecondes")