"""
schemas/utilisateur.py — Schemas Pydantic pour la gestion des utilisateurs

Modèle cible : Utilisateur (auth + rôles + helper peut())
Rôles : admin | pilote | contributeur | auditeur

Schemas exposés :
  - UtilisateurCreate         → création par un admin
  - UtilisateurUpdate         → modification partielle (admin)
  - UtilisateurUpdateSelf     → modification de son propre profil (champs restreints)
  - UtilisateurResponse       → réponse liste (sans données sensibles)
  - UtilisateurResponseDetail → réponse détail (avec permissions calculées)
  - UtilisateurChangerRole    → changement de rôle (admin uniquement)
  - UtilisateurDesactiver     → activation / désactivation du compte
  - UtilisateurListResponse   → liste paginée avec filtres
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.utilisateur import RoleEnum  # miroir de l'enum SQLAlchemy


# ---------------------------------------------------------------------------
# Validators réutilisables
# ---------------------------------------------------------------------------

_RE_MOT_DE_PASSE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$"
)


def _valider_mot_de_passe(v: str) -> str:
    if not _RE_MOT_DE_PASSE.match(v):
        raise ValueError(
            "Le mot de passe doit contenir au moins 8 caractères, "
            "une majuscule, une minuscule, un chiffre et un caractère spécial."
        )
    return v


def _valider_telephone(v: str | None) -> str | None:
    if v is None:
        return v
    v = v.strip()
    if not re.match(r"^\+?[\d\s\-]{8,20}$", v):
        raise ValueError("Numéro de téléphone invalide.")
    return v


# ---------------------------------------------------------------------------
# §1 — UtilisateurCreate
# ---------------------------------------------------------------------------

class UtilisateurCreate(BaseModel):
    """
    Création d'un compte utilisateur par un administrateur.
    Le mot de passe en clair est hashé dans auth_service avant persistance.
    """

    email: EmailStr = Field(
        description="Adresse email — identifiant unique de connexion.",
        examples=["pilote.labo@univ-example.dz"],
    )

    nom: Annotated[str, Field(
        min_length=2,
        max_length=100,
        description="Nom de famille.",
        examples=["Benali"],
    )]

    prenom: Annotated[str, Field(
        min_length=2,
        max_length=100,
        description="Prénom.",
        examples=["Karim"],
    )]

    role: RoleEnum = Field(
        default=RoleEnum.contributeur,
        description="Rôle initial attribué à la création.",
        examples=["pilote"],
    )

    mot_de_passe: Annotated[str, Field(
        min_length=8,
        description="Mot de passe en clair — sera hashé côté service.",
        examples=["Secure@2025"],
    )]

    telephone: Annotated[str | None, Field(
        default=None,
        max_length=20,
        description="Numéro de téléphone (optionnel).",
        examples=["+213 555 123456"],
    )]

    poste: Annotated[str | None, Field(
        default=None,
        max_length=150,
        description="Intitulé du poste au sein du laboratoire.",
        examples=["Responsable Qualité"],
    )]

    est_actif: bool = Field(
        default=True,
        description="Compte activé dès la création (False = compte suspendu).",
    )

    @field_validator("mot_de_passe", mode="after")
    @classmethod
    def valider_mot_de_passe(cls, v: str) -> str:
        return _valider_mot_de_passe(v)

    @field_validator("telephone", mode="before")
    @classmethod
    def valider_telephone(cls, v: str | None) -> str | None:
        return _valider_telephone(v)

    @field_validator("nom", "prenom", mode="before")
    @classmethod
    def capitaliser(cls, v: str) -> str:
        return v.strip().title()

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "email": "pilote.labo@univ-example.dz",
                "nom": "Benali",
                "prenom": "Karim",
                "role": "pilote",
                "mot_de_passe": "Secure@2025",
                "telephone": "+213 555 123456",
                "poste": "Responsable Qualité",
                "est_actif": True,
            }
        },
    )


# ---------------------------------------------------------------------------
# §2 — UtilisateurUpdate  (admin)
# ---------------------------------------------------------------------------

class UtilisateurUpdate(BaseModel):
    """
    Modification partielle d'un compte par un administrateur.
    Tous les champs sont optionnels.
    Le mot de passe suit le flux dédié (ChangePassword / ResetPassword dans auth.py).
    """

    nom: Annotated[str | None, Field(default=None, min_length=2, max_length=100)]
    prenom: Annotated[str | None, Field(default=None, min_length=2, max_length=100)]
    telephone: Annotated[str | None, Field(default=None, max_length=20)]
    poste: Annotated[str | None, Field(default=None, max_length=150)]

    @field_validator("telephone", mode="before")
    @classmethod
    def valider_telephone(cls, v: str | None) -> str | None:
        return _valider_telephone(v)

    @field_validator("nom", "prenom", mode="before")
    @classmethod
    def capitaliser(cls, v: str | None) -> str | None:
        return v.strip().title() if v else v

    @model_validator(mode="after")
    def au_moins_un_champ(self) -> UtilisateurUpdate:
        if all(v is None for v in [self.nom, self.prenom, self.telephone, self.poste]):
            raise ValueError("Au moins un champ doit être fourni pour la mise à jour.")
        return self

    model_config = ConfigDict(str_strip_whitespace=True)


# ---------------------------------------------------------------------------
# §3 — UtilisateurUpdateSelf  (profil personnel)
# ---------------------------------------------------------------------------

class UtilisateurUpdateSelf(BaseModel):
    """
    Modification que l'utilisateur peut faire sur son propre profil.
    Champs restreints : pas de rôle, pas de est_actif.
    """

    nom: Annotated[str | None, Field(default=None, min_length=2, max_length=100)]
    prenom: Annotated[str | None, Field(default=None, min_length=2, max_length=100)]
    telephone: Annotated[str | None, Field(default=None, max_length=20)]
    poste: Annotated[str | None, Field(default=None, max_length=150)]

    @field_validator("telephone", mode="before")
    @classmethod
    def valider_telephone(cls, v: str | None) -> str | None:
        return _valider_telephone(v)

    @field_validator("nom", "prenom", mode="before")
    @classmethod
    def capitaliser(cls, v: str | None) -> str | None:
        return v.strip().title() if v else v

    @model_validator(mode="after")
    def au_moins_un_champ(self) -> UtilisateurUpdateSelf:
        if all(v is None for v in [self.nom, self.prenom, self.telephone, self.poste]):
            raise ValueError("Au moins un champ doit être fourni.")
        return self

    model_config = ConfigDict(str_strip_whitespace=True)


# ---------------------------------------------------------------------------
# §4 — UtilisateurChangerRole
# ---------------------------------------------------------------------------

class UtilisateurChangerRole(BaseModel):
    """
    Changement de rôle — réservé aux admins.
    Un admin ne peut pas rétrograder son propre compte (vérifié au service).
    """

    role: RoleEnum = Field(
        description="Nouveau rôle à attribuer.",
        examples=["auditeur"],
    )

    motif: Annotated[str | None, Field(
        default=None,
        max_length=500,
        description="Justification du changement (recommandé, non obligatoire).",
    )]


# ---------------------------------------------------------------------------
# §5 — UtilisateurDesactiver
# ---------------------------------------------------------------------------

class UtilisateurDesactiver(BaseModel):
    """
    Activation ou désactivation d'un compte.
    Un admin ne peut pas désactiver son propre compte (vérifié au service).
    """

    est_actif: bool = Field(
        description="True = activer, False = désactiver.",
    )

    motif: Annotated[str | None, Field(
        default=None,
        max_length=500,
        description="Motif de désactivation (obligatoire si est_actif=False).",
    )]

    @model_validator(mode="after")
    def motif_requis_desactivation(self) -> UtilisateurDesactiver:
        if not self.est_actif and not self.motif:
            raise ValueError("Un motif est obligatoire pour désactiver un compte.")
        return self


# ---------------------------------------------------------------------------
# §6 — Schemas de réponse
# ---------------------------------------------------------------------------

class PermissionsCalculees(BaseModel):
    """
    Permissions calculées depuis le rôle — miroir du helper peut() du modèle.
    Calculées une fois au service et sérialisées pour éviter les appels répétés.
    """

    peut_administrer: bool = Field(description="Accès administration (admin uniquement).")
    peut_valider: bool     = Field(description="Validation diagnostics / documents (admin, pilote).")
    peut_contribuer: bool  = Field(description="Création / modification de données (admin, pilote, contributeur).")
    peut_auditer: bool     = Field(description="Lecture de tous les diagnostics (admin, auditeur).")

    model_config = ConfigDict(from_attributes=True)


class ProcessusBref(BaseModel):
    """Projection minimale d'un processus piloté par l'utilisateur."""

    id: int
    code: str
    nom: str

    model_config = ConfigDict(from_attributes=True)


class UtilisateurResponse(BaseModel):
    """
    Réponse liste — données publiques uniquement.
    Pas de date de dernière connexion ni de permissions détaillées.
    """

    id: int
    email: EmailStr
    nom: str
    prenom: str
    role: RoleEnum
    poste: str | None
    telephone: str | None
    est_actif: bool
    date_creation: datetime
    date_modification: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 2,
                "email": "pilote.labo@univ-example.dz",
                "nom": "Benali",
                "prenom": "Karim",
                "role": "pilote",
                "poste": "Responsable Qualité",
                "telephone": "+213 555 123456",
                "est_actif": True,
                "date_creation": "2025-01-10T08:00:00",
                "date_modification": "2025-03-01T14:00:00",
            }
        },
    )


class UtilisateurResponseDetail(UtilisateurResponse):
    """
    Réponse détail — enrichie avec :
      - Permissions calculées depuis le rôle
      - Processus pilotés
      - Date de dernière connexion
      - Nombre d'entités gérées (actions, risques, indicateurs)
    """

    permissions: PermissionsCalculees

    processus_pilotes: list[ProcessusBref] = Field(
        default_factory=list,
        description="Processus dont cet utilisateur est pilote.",
    )

    derniere_connexion: datetime | None = Field(
        default=None,
        description="Date/heure de la dernière connexion réussie.",
    )

    # Compteurs d'activité (calculés au service, non stockés)
    nb_actions_responsable: int = Field(
        default=0,
        description="Nombre d'actions correctives dont il est responsable.",
    )
    nb_risques_responsable: int = Field(
        default=0,
        description="Nombre de risques dont il est responsable.",
    )
    nb_indicateurs_responsable: int = Field(
        default=0,
        description="Nombre de KPI dont il est responsable.",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 2,
                "email": "pilote.labo@univ-example.dz",
                "nom": "Benali",
                "prenom": "Karim",
                "role": "pilote",
                "poste": "Responsable Qualité",
                "telephone": "+213 555 123456",
                "est_actif": True,
                "date_creation": "2025-01-10T08:00:00",
                "date_modification": "2025-03-01T14:00:00",
                "permissions": {
                    "peut_administrer": False,
                    "peut_valider": True,
                    "peut_contribuer": True,
                    "peut_auditer": False,
                },
                "processus_pilotes": [
                    {"id": 1, "code": "PROC-LABO", "nom": "Gestion du Laboratoire"},
                    {"id": 3, "code": "PROC-LABO-ACHAT", "nom": "Gestion des Achats"},
                ],
                "derniere_connexion": "2025-06-10T09:15:00",
                "nb_actions_responsable": 4,
                "nb_risques_responsable": 2,
                "nb_indicateurs_responsable": 3,
            }
        },
    )


# ---------------------------------------------------------------------------
# §7 — UtilisateurListResponse
# ---------------------------------------------------------------------------

class UtilisateurListResponse(BaseModel):
    """Liste paginée avec filtres actifs retournés pour cohérence UI."""

    items: list[UtilisateurResponse]
    total: int = Field(description="Nombre total d'utilisateurs correspondant aux filtres.")
    page: int = Field(ge=1, default=1)
    taille_page: int = Field(ge=1, le=100, default=20)
    pages_total: int

    # Filtres actifs
    filtre_role: RoleEnum | None = None
    filtre_actif: bool | None = None
    filtre_processus_code: str | None = None

    model_config = ConfigDict(from_attributes=True)