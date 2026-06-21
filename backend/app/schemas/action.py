"""
backend/app/schemas/action.py

Schemas Pydantic v2 pour le modèle Action (§10.2 ISO 9001:2015).

Hiérarchie :

  ActionBase
    ├── ActionCreate           → création manuelle ou auto
    ├── ActionUpdate           → modification partielle (PATCH)
    ├── ActionResponse         → lecture légère (liste)
    └── ActionResponseDetail   → fiche complète avec traçabilité

  Utilitaires :
    TransitionStatutRequest    → changement de statut avec règles workflow
    VerifierEfficaciteRequest  → clôture avec évaluation §10.2.1
    ActionListResponse         → réponse paginée avec compteurs
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.action import (
    StatutAction, PrioriteAction, TypeAction, OrigineAction
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


class ProcessusResume(_Base):
    id:   int
    code: str | None
    nom:  str


class RisqueSourceResume(_Base):
    """Résumé du risque source d'une action."""
    id:        int
    reference: str | None
    titre:     str
    rpn:       float
    criticite: str


class EcartSourceResume(_Base):
    """Résumé du DiagnosticClause source d'une action."""
    id:           int
    clause_code:  str
    clause_titre: str
    score:        float
    type_ecart:   str | None
    niveau:       str


# =============================================================================
# ACTION — BASE
# =============================================================================

class ActionBase(_Base):
    titre:       str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    type:        TypeAction    = Field(default=TypeAction.corrective)
    priorite:    PrioriteAction = Field(default=PrioriteAction.normale)

    cause_racine:     str | None = Field(
        default=None,
        description="Analyse des causes racines (5 Pourquoi, Ishikawa...) — §10.2.1"
    )
    date_planifiee:   datetime | None = None
    date_echeance:    datetime | None = None

    @field_validator("titre")
    @classmethod
    def titre_strip(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def echeance_apres_planifiee(self) -> "ActionBase":
        if (
            self.date_planifiee is not None
            and self.date_echeance is not None
            and self.date_echeance <= self.date_planifiee
        ):
            raise ValueError(
                "La date d'échéance doit être postérieure à la date de démarrage planifiée."
            )
        return self


# =============================================================================
# ACTION — CREATE
# =============================================================================

class ActionCreate(ActionBase):
    """
    Création d'une action corrective/préventive.

    processus_id            : requis — contexte métier obligatoire
    responsable_id          : optionnel (assignable après)
    verificateur_id         : optionnel — peut différer du responsable (§10.2.1)
    risque_id               : optionnel — si origine = "risque"
    diagnostic_clause_id    : optionnel — si origine = "diagnostic"
    origine                 : "manuelle" par défaut
    """
    processus_id:         int = Field(..., description="Processus concerné")
    responsable_id:       int | None = None
    verificateur_id:      int | None = None
    risque_id:            int | None = Field(
        default=None,
        description="Risque source — renseigner si origine='risque'"
    )
    diagnostic_clause_id: int | None = Field(
        default=None,
        description="Écart source — renseigner si origine='diagnostic'"
    )
    origine: OrigineAction = Field(
        default=OrigineAction.manuelle,
        description="Circuit de création de l'action"
    )
    generee_automatiquement: bool = False

    @model_validator(mode="after")
    def coherence_origine_source(self) -> "ActionCreate":
        """
        Cohérence origine ↔ source :
          - origine="risque"      → risque_id requis
          - origine="diagnostic"  → diagnostic_clause_id requis
          - origine="manuelle"    → aucune source requise
        """
        if self.origine == OrigineAction.risque and not self.risque_id:
            raise ValueError(
                "risque_id est requis quand origine='risque'."
            )
        if self.origine == OrigineAction.diagnostic and not self.diagnostic_clause_id:
            raise ValueError(
                "diagnostic_clause_id est requis quand origine='diagnostic'."
            )
        return self

    @model_validator(mode="after")
    def responsable_ne_verifie_pas_lui_meme(self) -> "ActionCreate":
        """
        §10.2.1 : l'évaluateur de l'efficacité ne devrait pas être
        la même personne que l'exécutant. Avertissement non bloquant.
        (Bloquant seulement si les deux sont explicitement renseignés.)
        """
        if (
            self.responsable_id
            and self.verificateur_id
            and self.responsable_id == self.verificateur_id
        ):
            raise ValueError(
                "Le vérificateur et le responsable d'exécution ne peuvent pas "
                "être la même personne (§10.2.1 — indépendance de la vérification)."
            )
        return self


# =============================================================================
# ACTION — UPDATE (PATCH)
# =============================================================================

class ActionUpdate(_Base):
    """Mise à jour partielle — tous champs optionnels. Statut via endpoint dédié."""
    titre:            str | None = Field(default=None, min_length=3, max_length=255)
    description:      str | None = None
    type:             TypeAction | None = None
    priorite:         PrioriteAction | None = None
    cause_racine:     str | None = None
    date_planifiee:   datetime | None = None
    date_echeance:    datetime | None = None
    responsable_id:   int | None = None
    verificateur_id:  int | None = None
    avancement:       int | None = Field(default=None, ge=0, le=100,
                                         description="Avancement 0–100% (libre en statut en_cours)")

    @field_validator("avancement")
    @classmethod
    def avancement_coherent(cls, v: int | None) -> int | None:
        """
        L'avancement forcé par le statut (0 pour planifiee, 100 pour en_verification)
        est géré par le service — ici on valide juste la plage.
        """
        return v

    model_config = {"from_attributes": True}


# =============================================================================
# ACTION — RESPONSE (liste)
# =============================================================================

class ActionResponse(_Base):
    """Réponse légère — listes et tableaux kanban."""
    id:           int
    reference:    str | None
    titre:        str
    description:  str | None
    type:         TypeAction
    origine:      OrigineAction
    priorite:     PrioriteAction
    statut:       StatutAction
    avancement:   int

    processus_id:  int
    processus_nom: str | None = None     # Dénormalisé par le service

    responsable:   ResponsableResume | None = None
    verificateur:  ResponsableResume | None = None

    # Dates clés
    date_creation:    datetime
    date_planifiee:   datetime | None
    date_echeance:    datetime | None
    date_realisation: datetime | None
    date_cloture:     datetime | None

    # Efficacité (§10.2.1)
    efficacite_verifiee:      bool | None = None

    # Flags
    est_active:             bool
    generee_automatiquement: bool

    # Indicateur retard (calculé par le service)
    est_en_retard: bool = Field(
        default=False,
        description="True si date_echeance dépassée et statut non terminal"
    )
    jours_restants: int | None = Field(
        default=None,
        description="Jours restants avant échéance (négatif si en retard)"
    )


# =============================================================================
# ACTION — RESPONSE DETAIL (fiche complète)
# =============================================================================

class ActionResponseDetail(ActionResponse):
    """Fiche complète — GET /actions/{id}."""
    cause_racine:             str | None = None
    risque_residuel_associe:  str | None = None
    commentaire_verification: str | None = None
    motif_annulation:         str | None = None

    # Sources (traçabilité triple)
    processus:         ProcessusResume | None = None
    risque_source:     RisqueSourceResume | None = None
    ecart_source:      EcartSourceResume | None = None

    # Transitions disponibles depuis le statut courant
    # Calculées par iso_engine.transition_action_valide()
    transitions_disponibles: list[StatutAction] = Field(
        default_factory=list,
        description="Statuts vers lesquels l'action peut transitionner"
    )


# =============================================================================
# UTILITAIRES — WORKFLOW
# =============================================================================

class TransitionStatutRequest(_Base):
    """
    POST /actions/{id}/statut — transition de statut.
    Le service valide la transition via iso_engine.transition_action_valide().
    """
    nouveau_statut: StatutAction
    commentaire:    str | None = Field(
        default=None,
        description="Commentaire de transition (requis pour 'annulee')"
    )

    @model_validator(mode="after")
    def commentaire_requis_annulation(self) -> "TransitionStatutRequest":
        if self.nouveau_statut == StatutAction.annulee and not self.commentaire:
            raise ValueError(
                "Un commentaire (motif) est requis pour annuler une action."
            )
        return self


class VerifierEfficaciteRequest(_Base):
    """
    POST /actions/{id}/verifier-efficacite
    Évaluation de l'efficacité avant clôture — §10.2.1.

    efficacite_verifiee = True  → action efficace → passage à "close"
    efficacite_verifiee = False → insuffisant → retour à "en_cours" (nouvelle itération)
    """
    efficacite_verifiee:      bool = Field(
        ...,
        description="True = cause éliminée, False = action insuffisante"
    )
    commentaire_verification: str = Field(
        ...,
        min_length=10,
        description=(
            "Justification obligatoire — §10.2.1 : "
            "'évaluer la nécessité d'agir pour éliminer les causes'"
        )
    )
    nouvelle_action_requise:  bool = Field(
        default=False,
        description="Si True et efficacite=False, le service crée automatiquement une nouvelle action"
    )

    @model_validator(mode="after")
    def coherence_efficacite_action(self) -> "VerifierEfficaciteRequest":
        """Si l'action est efficace, pas besoin d'une nouvelle action."""
        if self.efficacite_verifiee and self.nouvelle_action_requise:
            raise ValueError(
                "nouvelle_action_requise ne peut pas être True si l'action est vérifiée efficace."
            )
        return self


# =============================================================================
# RÉPONSES PAGINÉES ET TABLEAUX DE BORD
# =============================================================================

class ActionListResponse(_Base):
    """Réponse paginée GET /actions/ avec compteurs agrégés."""
    total:            int
    page:             int
    per_page:         int
    items:            list[ActionResponse]

    # Compteurs agrégés sur le total (pas juste la page)
    nb_planifiees:    int = 0
    nb_en_cours:      int = 0
    nb_en_retard:     int = 0
    nb_closes:        int = 0
    taux_completion:  float = Field(
        default=0.0,
        description="nb_closes / (total - nb_annulees) × 100"
    )


class ActionKanbanResponse(_Base):
    """
    Vue kanban par statut — GET /actions/kanban
    Groupées par colonne pour le composant React kanban du frontend.
    """
    planifiees:       list[ActionResponse] = []
    en_cours:         list[ActionResponse] = []
    en_verification:  list[ActionResponse] = []
    closes:           list[ActionResponse] = []
    annulees:         list[ActionResponse] = []

    # Métriques globales
    total:            int = 0
    nb_en_retard:     int = 0
    taux_completion:  float = 0.0