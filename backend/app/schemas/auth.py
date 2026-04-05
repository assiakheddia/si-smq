"""
backend/app/schemas/auth.py

Schemas Pydantic v2 pour l'authentification JWT.

Flux :
  1. POST /auth/login        → LoginRequest → TokenResponse
  2. POST /auth/refresh      → RefreshRequest → TokenResponse
  3. POST /auth/logout       → LogoutRequest (blacklist token)
  4. POST /auth/mot-de-passe → ChangePasswordRequest → MessageResponse
  5. GET  /auth/me           → UserMeResponse (profil courant)

Sécurité :
  - Access token  : durée courte (480 min par défaut — config.py)
  - Refresh token : durée longue (7 jours)
  - Pas de token en cookie — Bearer header uniquement
  - Mot de passe : validé avec règles de complexité minimales
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, EmailStr

from app.models.utilisateur import RoleEnum


# =============================================================================
# CONFIG COMMUNE
# =============================================================================

class _Base(BaseModel):
    model_config = {"from_attributes": True}


# =============================================================================
# LOGIN
# =============================================================================

class LoginRequest(_Base):
    """
    Payload POST /auth/login
    Credentials de l'utilisateur.
    """
    email:    str = Field(..., description="Email de l'utilisateur")
    password: str = Field(..., min_length=1, description="Mot de passe en clair")

    @field_validator("email")
    @classmethod
    def normaliser_email(cls, v: str) -> str:
        """Normalise l'email en minuscules et supprime les espaces."""
        return v.strip().lower()


# =============================================================================
# TOKEN
# =============================================================================

class TokenResponse(_Base):
    """
    Réponse POST /auth/login et POST /auth/refresh.
    Retourne les deux tokens + métadonnées.
    """
    access_token:  str = Field(..., description="JWT access token — à placer dans Authorization: Bearer")
    refresh_token: str = Field(..., description="JWT refresh token — à utiliser pour renouveler l'access token")
    token_type:    str = Field(default="bearer")
    expires_in:    int = Field(..., description="Durée de validité de l'access token en secondes")

    # Profil minimal inclus pour éviter un second appel /me au login
    utilisateur_id:   int
    nom_complet:      str
    email:            str
    role:             RoleEnum


class RefreshRequest(_Base):
    """
    Payload POST /auth/refresh.
    Échange un refresh token valide contre un nouvel access token.
    """
    refresh_token: str = Field(..., description="Refresh token JWT valide")


class LogoutRequest(_Base):
    """
    Payload POST /auth/logout.
    Le refresh token est invalidé côté serveur (blacklist en cache/DB).
    L'access token expire naturellement (courte durée).
    """
    refresh_token: str = Field(..., description="Refresh token à invalider")


# =============================================================================
# MOT DE PASSE
# =============================================================================

class ChangePasswordRequest(_Base):
    """
    Payload POST /auth/mot-de-passe
    Changement de mot de passe par l'utilisateur connecté.
    """
    ancien_password:   str = Field(..., min_length=1)
    nouveau_password:  str = Field(..., min_length=8,
                                   description="Minimum 8 caractères")
    confirmer_password: str = Field(..., min_length=8)

    @field_validator("nouveau_password")
    @classmethod
    def complexite_password(cls, v: str) -> str:
        """
        Règles minimales de complexité :
          - Au moins 8 caractères
          - Au moins 1 majuscule
          - Au moins 1 chiffre
        Suffisant pour un contexte académique sans durcir l'UX inutilement.
        """
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        return v

    @model_validator(mode="after")
    def passwords_identiques(self) -> "ChangePasswordRequest":
        if self.nouveau_password != self.confirmer_password:
            raise ValueError("Le nouveau mot de passe et sa confirmation ne correspondent pas.")
        if self.ancien_password == self.nouveau_password:
            raise ValueError("Le nouveau mot de passe doit être différent de l'ancien.")
        return self


class ResetPasswordRequest(_Base):
    """
    Payload POST /auth/reset-password (par un admin).
    Réinitialise le mot de passe d'un utilisateur sans connaître l'ancien.
    Réservé au rôle admin — vérifié dans le endpoint.
    """
    utilisateur_id:     int  = Field(..., description="ID de l'utilisateur cible")
    nouveau_password:   str  = Field(..., min_length=8)
    forcer_changement:  bool = Field(
        default=True,
        description="Si True, l'utilisateur devra changer son mot de passe à la prochaine connexion"
    )

    @field_validator("nouveau_password")
    @classmethod
    def complexite_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        return v


# =============================================================================
# PROFIL COURANT
# =============================================================================

class UserMeResponse(_Base):
    """
    Réponse GET /auth/me — profil de l'utilisateur connecté.
    Inclut les permissions déduites du rôle pour le frontend.
    """
    id:               int
    nom:              str
    prenom:           str
    email:            str
    role:             RoleEnum
    est_actif:        bool
    poste:            str | None
    departement:      str | None
    telephone:        str | None
    derniere_connexion: datetime | None
    date_creation:    datetime

    # Permissions synthétiques pour le frontend
    # Permet au frontend d'afficher/masquer les boutons sans appel supplémentaire
    permissions: "PermissionsUtilisateur"


class PermissionsUtilisateur(_Base):
    """
    Matrice de permissions booléenne déduite du rôle.
    Calculée par auth_service depuis Utilisateur.peut().
    Évite au frontend de recoder la logique de rôles.
    """
    peut_creer_diagnostic:    bool
    peut_valider_diagnostic:  bool
    peut_gerer_utilisateurs:  bool
    peut_configurer_systeme:  bool
    peut_supprimer_donnees:   bool
    peut_exporter_rapports:   bool
    peut_gerer_documents:     bool


# =============================================================================
# RÉPONSES GÉNÉRIQUES
# =============================================================================

class MessageResponse(_Base):
    """Réponse simple pour les actions sans payload de retour."""
    message: str
    succes:  bool = True


class TokenPayload(_Base):
    """
    Payload décodé d'un JWT — utilisé par security.py.
    Pas exposé directement en API — usage interne uniquement.
    """
    sub:      str            # utilisateur_id (str pour compatibilité JWT standard)
    role:     str
    exp:      datetime
    type:     str            # "access" | "refresh"


# Résolution forward reference
UserMeResponse.model_rebuild()