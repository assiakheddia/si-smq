"""
backend/app/schemas/risque.py

Schemas Pydantic v2 pour le modèle Risque (AMDEC RPN).

Hiérarchie :

  RisqueBase
    ├── RisqueCreate          → création manuelle ou auto depuis diagnostic
    ├── RisqueUpdate          → modification partielle (PATCH)
    ├── RisqueResponse        → lecture légère (liste)
    └── RisqueResponseDetail  → fiche complète avec actions liées

  Utilitaires :
    EvaluerRisqueRequest      → calcul RPN à la volée sans persistance
    EvaluerRisqueResponse     → résultat RPN + criticité + recommandation
    ChangerStatutRisqueRequest → transition de statut avec justification
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.risque import (
    TypeRisque, StatutRisque, NiveauCriticite, StrategieTraitement
)


# =============================================================================
# CONFIG COMMUNE
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
# SOUS-SCHEMAS IMBRIQUÉS
# =============================================================================

class ResponsableResume(_Base):
    id:     int
    nom:    str
    prenom: str
    email:  str
    poste:  str | None = None


class ActionResume(_Base):
    """Référence légère vers une Action liée au risque."""
    id:         int
    reference:  str | None
    titre:      str
    statut:     str
    priorite:   str
    avancement: int


class ClauseEcartResume(_Base):
    """Référence vers le DiagnosticClause source du risque."""
    id:            int
    clause_code:   str
    clause_titre:  str
    score:         float
    type_ecart:    str | None


# =============================================================================
# RISQUE — BASE (validation commune Create/Update)
# =============================================================================

class RisqueBase(_Base):
    titre:       str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    type:        TypeRisque | None = None

    # Dimensions AMDEC — validées individuellement
    probabilite:   int = Field(..., ge=1, le=5,
                               description="Vraisemblance d'occurrence (1=rare, 5=quasi certain)")
    gravite:       int = Field(..., ge=1, le=5,
                               description="Impact sur la qualité/certification (1=négligeable, 5=critique)")
    detectabilite: int = Field(..., ge=1, le=5,
                               description="Difficulté de détection (1=immédiate, 5=indétectable)")

    plan_attenuation: str | None = None
    risque_residuel:  str | None = None
    rpn_cible:        float | None = Field(default=None, ge=1.0, le=125.0,
                                           description="RPN objectif après traitement")
    strategie:        StrategieTraitement | None = None
    date_echeance:    datetime | None = None

    @field_validator("titre")
    @classmethod
    def titre_strip(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def rpn_cible_inferieur_rpn_actuel(self) -> "RisqueBase":
        """
        Le RPN cible doit être inférieur au RPN actuel — sinon aucun sens.
        Calcul approximatif ici (le RPN exact est calculé par l'ISOEngine).
        """
        if self.rpn_cible is not None:
            rpn_actuel = self.probabilite * self.gravite * self.detectabilite
            if self.rpn_cible >= rpn_actuel:
                raise ValueError(
                    f"rpn_cible ({self.rpn_cible}) doit être inférieur au RPN actuel "
                    f"({rpn_actuel} = {self.probabilite}×{self.gravite}×{self.detectabilite}). "
                    "Le traitement doit viser une réduction du risque."
                )
        return self


# =============================================================================
# RISQUE — CREATE
# =============================================================================

class RisqueCreate(RisqueBase):
    """
    Création d'un risque.

    processus_id            : requis — contexte métier obligatoire
    responsable_id          : optionnel (peut être assigné après)
    diagnostic_clause_id    : optionnel — lien vers l'écart source
    genere_automatiquement  : False par défaut (saisie manuelle)
    """
    processus_id:           int = Field(..., description="Processus concerné par le risque")
    responsable_id:         int | None = None
    diagnostic_clause_id:   int | None = Field(
        default=None,
        description="ID du DiagnosticClause source (si risque issu d'un écart ISO)"
    )
    genere_automatiquement: bool = False


# =============================================================================
# RISQUE — UPDATE (PATCH)
# =============================================================================

class RisqueUpdate(_Base):
    """Mise à jour partielle — tous champs optionnels."""
    titre:            str | None = Field(default=None, min_length=3, max_length=255)
    description:      str | None = None
    type:             TypeRisque | None = None

    probabilite:      int | None = Field(default=None, ge=1, le=5)
    gravite:          int | None = Field(default=None, ge=1, le=5)
    detectabilite:    int | None = Field(default=None, ge=1, le=5)

    plan_attenuation: str | None = None
    risque_residuel:  str | None = None
    rpn_cible:        float | None = Field(default=None, ge=1.0, le=125.0)
    strategie:        StrategieTraitement | None = None
    date_echeance:    datetime | None = None
    responsable_id:   int | None = None
    est_actif:        bool | None = None

    model_config = {"from_attributes": True}


# =============================================================================
# RISQUE — RESPONSE (liste)
# =============================================================================

class RisqueResponse(_Base):
    """
    Réponse légère — utilisée dans les listes et tableaux.
    RPN et criticité déjà calculés et stockés en DB.
    """
    id:           int
    reference:    str | None
    titre:        str
    description:  str | None
    type:         TypeRisque | None

    processus_id: int
    processus_nom: str | None = None        # Dénormalisé par le service

    # AMDEC
    probabilite:   int
    gravite:       int
    detectabilite: int
    rpn:           float = Field(ge=1.0, le=125.0)
    criticite:     NiveauCriticite
    rpn_cible:     float | None

    # Traitement
    statut:           StatutRisque
    strategie:        StrategieTraitement | None
    plan_attenuation: str | None

    # Responsable
    responsable:  ResponsableResume | None = None

    # Dates
    date_identification: datetime
    date_echeance:       datetime | None
    date_cloture:        datetime | None

    # Flags
    est_actif:              bool
    genere_automatiquement: bool

    # Compteur actions liées (pas la liste — évite le N+1)
    nb_actions: int = Field(default=0)


# =============================================================================
# RISQUE — RESPONSE DETAIL (fiche complète)
# =============================================================================

class RisqueResponseDetail(RisqueResponse):
    """
    Fiche complète — GET /risques/{id}
    Inclut les actions liées et l'écart source.
    """
    risque_residuel:      str | None = None
    diagnostic_clause:    ClauseEcartResume | None = None
    actions:              list[ActionResume] = []

    # Efficacité du traitement : progression RPN
    reduction_rpn_pct:    float | None = Field(
        default=None,
        description="(rpn - rpn_cible) / rpn × 100 — objectif de réduction"
    )


# =============================================================================
# UTILITAIRES
# =============================================================================

class EvaluerRisqueRequest(_Base):
    """
    POST /risques/evaluer — calcul RPN à la volée, sans persistance.
    Permet à l'utilisateur de simuler différentes valeurs AMDEC
    avant de créer un risque.
    """
    probabilite:   int = Field(..., ge=1, le=5)
    gravite:       int = Field(..., ge=1, le=5)
    detectabilite: int = Field(..., ge=1, le=5)


class EvaluerRisqueResponse(_Base):
    """
    Résultat du calcul RPN — retourné par iso_engine.evaluer_risque().
    """
    probabilite:   int
    gravite:       int
    detectabilite: int
    rpn:           float
    criticite:     NiveauCriticite
    prioritaire:   bool = Field(description="True si criticite = critique ou eleve")
    necessite_action: bool = Field(
        description="True si RPN ≥ 21 — une Action corrective est recommandée"
    )
    seuil_rpn_action: int = Field(default=21)


class ChangerStatutRisqueRequest(_Base):
    """
    POST /risques/{id}/statut — transition explicite du statut.
    Le service vérifie la validité de la transition.
    """
    nouveau_statut: StatutRisque
    commentaire:    str | None = Field(
        default=None,
        description="Justification du changement de statut (requis pour 'clos' et 'annule')"
    )

    @model_validator(mode="after")
    def commentaire_requis_pour_cloture(self) -> "ChangerStatutRisqueRequest":
        if self.nouveau_statut in (StatutRisque.clos,) and not self.commentaire:
            raise ValueError(
                "Un commentaire est requis pour clôturer un risque "
                "(documenter le risque résiduel accepté — §6.1 ISO 9001)."
            )
        return self


class RisqueListResponse(_Base):
    """Réponse paginée GET /risques/"""
    total:           int
    page:            int
    per_page:        int
    items:           list[RisqueResponse]
    nb_critiques:    int = Field(default=0, description="Nombre de risques critiques dans la liste totale")
    nb_eleves:       int = Field(default=0)
    rpn_moyen:       float | None = None


class RisqueHeatmapItem(_Base):
    """
    Élément de la heatmap risques (probabilité × gravité).
    Calculé par risque_service pour le tableau de bord.
    """
    risque_id:   int
    reference:   str | None
    titre:       str
    probabilite: int
    gravite:     int
    rpn:         float
    criticite:   NiveauCriticite