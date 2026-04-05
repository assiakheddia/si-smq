"""
backend/app/schemas/diagnostic.py

Schemas Pydantic v2 pour DiagnosticISO + DiagnosticClause.

Hiérarchie :

  DiagnosticClause
    ├── DiagnosticClauseCreate    → saisie d'une évaluation de clause
    ├── DiagnosticClauseUpdate    → modification partielle
    └── DiagnosticClauseResponse → lecture avec recommandation_finale calculée

  DiagnosticISO
    ├── DiagnosticCreate          → création du diagnostic (+ clauses initiales)
    ├── DiagnosticUpdate          → modification partielle (statut, commentaire)
    ├── DiagnosticResponse        → lecture légère (liste)
    └── DiagnosticResponseDetail  → lecture complète (avec clauses imbriquées)

Logique recommandation_finale (portée ici, pas en DB) :
  recommandation_finale = recommandation_manuelle or recommandation_auto
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.diagnostic import (
    NiveauMaturite, StatutDiagnostic, TypeEcart
)


# =============================================================================
# CONFIG COMMUNE
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
# SOUS-SCHEMAS IMBRIQUÉS (références légères)
# =============================================================================

class ClauseISOResume(_Base):
    """Référence minimale à une ClauseISO dans les réponses de diagnostic."""
    id:           int
    code:         str
    titre:        str
    niveau:       int
    est_feuille:  bool


class ProcessusResume(_Base):
    """Référence minimale à un Processus dans les réponses de diagnostic."""
    id:    int
    code:  str | None
    nom:   str
    type:  str | None


class AuditeurResume(_Base):
    """Référence minimale à l'auditeur."""
    id:     int
    nom:    str
    prenom: str
    email:  str


# =============================================================================
# DIAGNOSTIC CLAUSE — schemas
# =============================================================================

class DiagnosticClauseBase(_Base):
    score:              float = Field(..., ge=0.0, le=100.0,
                                     description="Score de conformité 0–100")
    poids:              float = Field(default=1.0, gt=0.0,
                                     description="Pondération de la clause (défaut 1.0)")
    est_applicable:     bool  = Field(default=True,
                                     description="False = clause exclue du périmètre")
    type_ecart:         TypeEcart | None = None
    description_ecart:  str | None = None
    preuves_existantes: str | None = None
    recommandation_manuelle: str | None = Field(
        default=None,
        description="Surcharge manuelle de la recommandation auto"
    )

    @field_validator("score")
    @classmethod
    def arrondir_score(cls, v: float) -> float:
        return round(v, 2)


class DiagnosticClauseCreate(DiagnosticClauseBase):
    """
    Évaluation d'une clause dans le cadre d'un diagnostic.
    Le diagnostic_id est porté par l'URL, pas le body.
    """
    clause_id: int = Field(..., description="ID de la ClauseISO évaluée (doit être est_feuille=True)")

    @model_validator(mode="after")
    def type_ecart_coherent(self) -> "DiagnosticClauseCreate":
        """
        Si la clause n'est pas applicable, le score doit être 0
        et le type_ecart None — aucune évaluation pertinente.
        """
        if not self.est_applicable:
            self.score = 0.0
            self.type_ecart = None
        return self


class DiagnosticClauseUpdate(_Base):
    """Mise à jour partielle d'une évaluation de clause — tous champs optionnels."""
    score:                   float | None = Field(default=None, ge=0.0, le=100.0)
    poids:                   float | None = Field(default=None, gt=0.0)
    est_applicable:          bool  | None = None
    type_ecart:              TypeEcart | None = None
    description_ecart:       str | None = None
    preuves_existantes:      str | None = None
    recommandation_manuelle: str | None = None

    @field_validator("score")
    @classmethod
    def arrondir_score(cls, v: float | None) -> float | None:
        return round(v, 2) if v is not None else None

    model_config = {"from_attributes": True}


class DiagnosticClauseResponse(DiagnosticClauseBase):
    """
    Réponse complète d'une évaluation de clause.

    Inclut :
      - niveau         : calculé par ISOEngine depuis le score
      - recommandation_auto    : générée par ISOEngine
      - recommandation_finale  : manuelle si renseignée, sinon auto
        (calculée ici — pas en DB)
    """
    id:                  int
    diagnostic_id:       int
    clause_id:           int
    clause:              ClauseISOResume | None = None
    niveau:              NiveauMaturite

    recommandation_auto:   str | None = None
    recommandation_finale: str | None = None
    # Calculée par le service avant sérialisation :
    # recommandation_finale = recommandation_manuelle or recommandation_auto

    @model_validator(mode="after")
    def calculer_recommandation_finale(self) -> "DiagnosticClauseResponse":
        """
        Logique hybride : la recommandation manuelle surcharge l'auto.
        Calculée à la sérialisation — source de vérité unique, pas en DB.
        """
        if not self.recommandation_finale:
            self.recommandation_finale = (
                self.recommandation_manuelle or self.recommandation_auto
            )
        return self


# =============================================================================
# DIAGNOSTIC ISO — schemas
# =============================================================================

class DiagnosticBase(_Base):
    periode_couverte:   str | None = Field(
        default=None,
        max_length=50,
        description="ex: '2025-S1', '2025-Annuel'"
    )
    commentaire_global: str | None = None

    @field_validator("periode_couverte")
    @classmethod
    def valider_periode(cls, v: str | None) -> str | None:
        """
        Format attendu : YYYY, YYYY-SN, YYYY-TN, YYYY-MM
        Exemples valides : "2025", "2025-S1", "2025-T3", "2025-12"
        """
        if v is None:
            return v
        v = v.strip().upper()
        import re
        pattern = r"^\d{4}(-S[12]|-T[1-4]|-\d{2}|-ANNUEL)?$"
        if not re.match(pattern, v):
            raise ValueError(
                f"Format de période invalide : '{v}'. "
                "Attendu : YYYY, YYYY-S1, YYYY-T2, YYYY-12, YYYY-ANNUEL"
            )
        return v


class DiagnosticCreate(DiagnosticBase):
    """
    Création d'un diagnostic ISO pour un processus.

    processus_id    : requis
    auditeur_id     : optionnel (peut être l'utilisateur courant par défaut)
    clauses_initiales : liste optionnelle de clauses à évaluer d'emblée.
      Si vide → le diagnostic est créé en brouillon sans clauses.
      Le service peut auto-générer les clauses applicables du processus.
    initialiser_toutes_clauses : si True, le service génère automatiquement
      un DiagnosticClause pour chaque clause feuille applicable.
    """
    processus_id:  int = Field(..., description="ID du processus à diagnostiquer")
    auditeur_id:   int | None = Field(
        default=None,
        description="ID de l'auditeur (défaut : utilisateur courant)"
    )
    clauses_initiales: list[DiagnosticClauseCreate] = Field(
        default_factory=list,
        description="Évaluations de clauses à créer avec le diagnostic"
    )
    initialiser_toutes_clauses: bool = Field(
        default=False,
        description=(
            "Si True, le service crée un DiagnosticClause vide "
            "(score=0) pour chaque clause feuille applicable — "
            "prêt à être rempli par l'auditeur"
        )
    )

    @model_validator(mode="after")
    def pas_de_doublon_clause(self) -> "DiagnosticCreate":
        """Vérifie qu'une même clause n'est pas évaluée deux fois."""
        ids = [c.clause_id for c in self.clauses_initiales]
        if len(ids) != len(set(ids)):
            doublons = {i for i in ids if ids.count(i) > 1}
            raise ValueError(
                f"Clauses en doublon dans clauses_initiales : {doublons}. "
                "Chaque clause ne peut être évaluée qu'une seule fois par diagnostic."
            )
        return self


class DiagnosticUpdate(_Base):
    """
    Mise à jour partielle d'un diagnostic — tous champs optionnels.
    Ne permet pas de modifier processus_id ou auditeur_id après création.
    La modification du statut suit des règles de workflow dans le service.
    """
    statut:             StatutDiagnostic | None = None
    periode_couverte:   str | None = Field(default=None, max_length=50)
    commentaire_global: str | None = None

    @field_validator("periode_couverte")
    @classmethod
    def valider_periode(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        v = v.strip().upper()
        if not re.match(r"^\d{4}(-S[12]|-T[1-4]|-\d{2}|-ANNUEL)?$", v):
            raise ValueError(f"Format de période invalide : '{v}'.")
        return v

    model_config = {"from_attributes": True}


class DiagnosticResponse(_Base):
    """
    Réponse légère — utilisée dans les listes (GET /diagnostics/).
    Pas de clauses imbriquées pour limiter la taille des réponses.
    """
    id:                int
    reference:         str | None
    processus_id:      int
    processus:         ProcessusResume | None = None
    auditeur_id:       int | None
    auditeur:          AuditeurResume | None = None

    score_global:      float = Field(ge=0.0, le=100.0)
    niveau_global:     NiveauMaturite
    statut:            StatutDiagnostic

    date_diagnostic:   datetime
    date_validation:   datetime | None
    periode_couverte:  str | None
    commentaire_global: str | None

    nb_clauses_evaluees:  int = Field(default=0)
    nb_clauses_conformes: int = Field(default=0)
    nb_ecarts_majeurs:    int = Field(default=0)
    est_actif:            bool


class DiagnosticResponseDetail(DiagnosticResponse):
    """
    Réponse complète — utilisée pour la fiche détaillée (GET /diagnostics/{id}).
    Inclut toutes les clauses évaluées, groupées par section ISO.
    """
    clauses_evaluees: list[DiagnosticClauseResponse] = []

    # Synthèse par section (calculée par le service)
    synthese_par_section: list["SectionSynthese"] = []


class SectionSynthese(_Base):
    """
    Score agrégé par section ISO (4, 5, 6, 7, 8, 9, 10).
    Calculé par diagnostic_service depuis les DiagnosticClause.
    Utilisé pour le radar chart du tableau de bord.
    """
    code_section:    str          # "4", "5", "6"...
    titre_section:   str          # "Contexte de l'organisme"
    score_section:   float        # Moyenne pondérée des clauses de la section
    niveau_section:  NiveauMaturite
    nb_clauses:      int          # Nombre de clauses évaluées dans la section
    nb_conformes:    int          # Nombre de clauses conformes


# Résolution forward reference
DiagnosticResponseDetail.model_rebuild()


# =============================================================================
# SCHEMAS UTILITAIRES
# =============================================================================

class ValiderDiagnosticRequest(_Base):
    """
    Payload pour POST /diagnostics/{id}/valider
    Transition brouillon/soumis → valide.
    """
    commentaire: str | None = Field(
        default=None,
        description="Commentaire de validation (optionnel)"
    )
    forcer:      bool = Field(
        default=False,
        description=(
            "Si True, valide même si toutes les clauses ne sont pas évaluées "
            "(réservé à l'admin)"
        )
    )


class RapportMaturiteResponse(_Base):
    """
    Rapport de maturité global retourné par GET /diagnostics/{id}/rapport.
    Vue synthétique destinée à l'export PDF / tableau de bord.
    """
    diagnostic_id:       int
    reference:           str | None
    processus_nom:       str
    periode_couverte:    str | None
    date_diagnostic:     datetime
    auditeur_nom_complet: str | None

    # Scores globaux
    score_global:        float
    niveau_global:       NiveauMaturite

    # Répartition par niveau
    nb_clauses_total:    int
    nb_non_conformes:    int   # 0–25
    nb_partiels:         int   # 25–50
    nb_avances:          int   # 50–75
    nb_conformes:        int   # 75–100

    # Écarts
    nb_ecarts_majeurs:   int
    nb_ecarts_mineurs:   int
    nb_observations:     int

    # Synthèse par section (radar chart)
    synthese_par_section: list[SectionSynthese]

    # Top 3 clauses les plus critiques
    clauses_prioritaires: list[DiagnosticClauseResponse]

    # Avertissements ISOEngine (prérequis manquants)
    avertissements_iso:  list[str] = []