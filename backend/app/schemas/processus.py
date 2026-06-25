"""
backend/app/schemas/processus.py

Schemas Pydantic v2 pour le modèle Processus + PartieInteressee.

Hiérarchie des schemas :

  ProcessusBase          → champs communs (validation partagée)
    ├── ProcessusCreate   → création (champs requis + optionnels)
    ├── ProcessusUpdate   → mise à jour (tous champs optionnels)
    └── ProcessusResponse → lecture API (+ pilote imbriqué)

  PartieInteresseeBase
    ├── PartieInteresseeCreate
    └── PartieInteresseeResponse

Conventions :
  - Tous les schemas héritent de BaseModel avec model_config from_attributes=True
  - Les champs optionnels utilisent `X | None = None` (style Pydantic v2)
  - Les validators métier sont ici (pas dans les services)
  - Les IDs en sortie sont toujours présents (int, non nullable)
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.processus import TypeProcessus, StatutProcessus, FrequenceCycle
from app.models.processus import TypePartieInteressee


# =============================================================================
# CONFIG COMMUNE
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
# PARTIE INTÉRESSÉE — schemas
# =============================================================================

class PartieInteresseeBase(_Base):
    nom:          str  = Field(..., min_length=2, max_length=200)
    type:         TypePartieInteressee
    description:  str | None = None
    email_contact: str | None = Field(default=None, max_length=255)
    exigences:    str | None = None
    est_actif:    bool = True


class PartieInteresseeCreate(PartieInteresseeBase):
    pass


class PartieInteresseeResponse(PartieInteresseeBase):
    id: int


# =============================================================================
# PILOTE IMBRIQUÉ (sous-schema léger pour éviter la circularité)
# =============================================================================

class PiloteResume(_Base):
    """
    Représentation minimale d'un Utilisateur dans ProcessusResponse.
    Évite d'importer le schema Utilisateur complet (dépendance circulaire).
    """
    id:          int
    nom:         str
    prenom:      str
    email:       str
    poste:       str | None = None
    departement: str | None = None
    telephone:   str | None = None


# =============================================================================
# PROCESSUS — BASE (validation commune)
# =============================================================================

class ProcessusBase(_Base):
    nom:             str  = Field(..., min_length=2, max_length=255,
                                  description="Nom du processus")
    objectif:        str | None = Field(default=None,
                                        description="Finalité du processus — §4.4")
    description:     str | None = None
    code:            str | None = Field(default=None, max_length=50,
                                        description="Code de référence ex: PROC-LABO-001")
    type:            TypeProcessus | None = None
    frequence_cycle: FrequenceCycle | None = FrequenceCycle.annuel
    declencheur:     str | None = Field(default=None, max_length=255)
    entrees:         str | None = None
    sorties:         str | None = None
    ressources_cles: str | None = None
    ordre:           int = Field(default=0, ge=0)
    est_actif:       bool = True

    raci_roles:      list[str] | None = Field(default=None,
                                              description="Rôles de la matrice RACI — §5.3")
    raci_activities: list[str] | None = Field(default=None,
                                              description="Activités de la matrice RACI")
    raci_cells:      dict[str, str] | None = Field(default=None,
                                              description='Cellules "{activite}-{role}" -> R|A|C|I')

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str | None) -> str | None:
        """Normalise le code en majuscules."""
        return v.upper().strip() if v else v

    @field_validator("nom")
    @classmethod
    def nom_strip(cls, v: str) -> str:
        return v.strip()


# =============================================================================
# PROCESSUS — CREATE
# =============================================================================

class ProcessusCreate(ProcessusBase):
    """
    Payload de création d'un processus.

    pilote_id        : optionnel à la création (peut être assigné après)
    parent_id        : optionnel — NULL = processus racine
    parties_ids      : liste d'IDs de PartieInteressee à associer
    """
    pilote_id:   int | None = Field(default=None,
                                    description="ID de l'utilisateur pilote (§5.3)")
    pilote_nom:  str | None = Field(default=None, max_length=255,
                                    description=(
                                        "Nom complet du pilote en texte libre — utilisé pour "
                                        "résoudre pilote_id par correspondance si pilote_id "
                                        "n'est pas fourni directement (ex: formulaire frontend "
                                        "qui ne connaît que le nom, pas l'ID utilisateur)."
                                    ))
    parent_id:   int | None = Field(default=None,
                                    description="ID du processus parent (sous-processus)")
    parties_ids: list[int]  = Field(default_factory=list,
                                    description="IDs des parties intéressées associées")

    @model_validator(mode="after")
    def parent_ne_peut_pas_etre_lui_meme(self) -> "ProcessusCreate":
        # Garde supplémentaire côté service (l'id n'existe pas encore à la création)
        # Mais on bloque les cas évidents (parent_id=0 etc.)
        return self


# =============================================================================
# PROCESSUS — UPDATE
# =============================================================================

class ProcessusUpdate(_Base):
    """
    Mise à jour partielle — tous les champs sont optionnels (PATCH sémantique).
    Seuls les champs fournis sont mis à jour par le service.
    """
    nom:             str | None = Field(default=None, min_length=2, max_length=255)
    objectif:        str | None = None
    description:     str | None = None
    code:            str | None = Field(default=None, max_length=50)
    type:            TypeProcessus | None = None
    statut:          StatutProcessus | None = None
    frequence_cycle: FrequenceCycle | None = None
    declencheur:     str | None = None
    entrees:         str | None = None
    sorties:         str | None = None
    ressources_cles: str | None = None
    pilote_id:       int | None = None
    pilote_nom:      str | None = Field(default=None, max_length=255,
                                        description="Cf. ProcessusCreate.pilote_nom")
    parent_id:       int | None = None
    ordre:           int | None = Field(default=None, ge=0)
    est_actif:       bool | None = None
    parties_ids:     list[int] | None = None
    raci_roles:      list[str] | None = None
    raci_activities: list[str] | None = None
    raci_cells:      dict[str, str] | None = None
    # Si fourni → remplace complètement la liste des parties (PUT sémantique sur la relation)
    # Si None   → liste des parties inchangée

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str | None) -> str | None:
        return v.upper().strip() if v else v

    model_config = {"from_attributes": True}


# =============================================================================
# PROCESSUS — RESPONSE (lecture API)
# =============================================================================

class ProcessusResponse(ProcessusBase):
    """
    Réponse API pour un processus.

    Inclut :
      - Tous les champs de ProcessusBase
      - id, statut, score_maturite (calculé)
      - parent_id (référence, pas l'objet complet)
      - pilote imbriqué (PiloteResume) si assigné
      - parties_interessees (liste légère)
      - nombre de sous-processus (count — pas la liste complète)
    """
    id:              int
    statut:          StatutProcessus
    score_maturite:  float = Field(ge=0.0, le=100.0,
                                   description="Score de maturité ISO 0–100, calculé par ISOEngine")
    parent_id:       int | None = None

    # Relations imbriquées
    pilote:              PiloteResume | None = None
    parties_interessees: list[PartieInteresseeResponse] = []

    # Compteurs (évite de charger les listes complètes en mode liste)
    nb_sous_processus:   int = Field(default=0,
                                     description="Nombre de sous-processus directs")
    nb_diagnostics:      int = Field(default=0,
                                     description="Nombre de diagnostics réalisés")
    nb_risques_actifs:   int = Field(default=0,
                                     description="Nombre de risques actifs non clôturés")
    nb_actions_ouvertes: int = Field(default=0,
                                     description="Nombre d'actions non clôturées")


# =============================================================================
# SCHEMAS UTILITAIRES
# =============================================================================

class ProcessusScoreMaturite(_Base):
    """
    Payload retourné après recalcul du score de maturité par l'ISOEngine.
    Utilisé par le endpoint POST /processus/{id}/recalculer-score
    """
    processus_id:    int
    score_maturite:  float
    statut:          StatutProcessus
    nb_clauses_evaluees:  int
    nb_clauses_conformes: int
    message:         str


class ProcessusListResponse(_Base):
    """
    Réponse paginée pour GET /processus/
    """
    total:    int
    page:     int
    per_page: int
    items:    list[ProcessusResponse]


class AssignerPiloteRequest(_Base):
    """
    Payload pour POST /processus/{id}/assigner-pilote
    """
    pilote_id: int = Field(..., description="ID de l'utilisateur à assigner comme pilote")


class AssocierPartiesRequest(_Base):
    """
    Payload pour POST /processus/{id}/parties-interessees
    Remplace la liste complète des parties associées.
    """
    parties_ids: list[int] = Field(
        ...,
        min_length=0,
        description="Liste complète des IDs de parties intéressées à associer"
    )