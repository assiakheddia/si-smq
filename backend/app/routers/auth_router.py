"""
Router d'authentification — SI-SMQ
Endpoints : login, refresh, logout, changement/réinitialisation de mot de passe, profil courant.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_active_admin
from app.models.utilisateur import Utilisateur
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ChangerMotDePasseRequest,
    ReinitialiserMotDePasseRequest,
)
from app.schemas.utilisateur import UtilisateurResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentification"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep       = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]
AdminUser   = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Connexion — retourne access + refresh token",
)
def login(payload: LoginRequest, db: DbDep):
    """
    Authentifie l'utilisateur par email/mot de passe.
    Retourne un access token (courte durée) et un refresh token (longue durée).
    Résistant aux timing-attacks : bcrypt factice si l'email est inconnu.
    """
    return auth_service.login(db, email=payload.email, mot_de_passe=payload.mot_de_passe)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renouveler les tokens via le refresh token",
)
def refresh(payload: dict, db: DbDep):
    """
    Rotation complète : un nouveau refresh token est émis à chaque appel.
    L'ancien refresh token est invalidé côté client.
    """
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le champ 'refresh_token' est requis.",
        )
    return auth_service.refresh_access_token(db, refresh_token=refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Déconnexion (stateless — invalider côté client)",
)
def logout(user: CurrentUser):
    """
    Déconnexion stateless : aucun token n'est blacklisté côté serveur.
    Le client doit supprimer les tokens de son stockage local.
    Documenté intentionnellement pour clarifier le comportement.
    """
    auth_service.logout(utilisateur=user)
    # 204 No Content — pas de body


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Changer son propre mot de passe",
)
def changer_mot_de_passe(
    payload: ChangerMotDePasseRequest,
    db: DbDep,
    user: CurrentUser,
):
    """
    L'utilisateur connecté change son mot de passe.
    Vérifie l'ancien mot de passe et refuse si identique au nouveau.
    """
    auth_service.changer_mot_de_passe(
        db,
        utilisateur=user,
        ancien_mot_de_passe=payload.ancien_mot_de_passe,
        nouveau_mot_de_passe=payload.nouveau_mot_de_passe,
    )


@router.post(
    "/reset-password/{utilisateur_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Réinitialiser le mot de passe d'un utilisateur (admin uniquement)",
)
def reinitialiser_mot_de_passe(
    utilisateur_id: int,
    payload: ReinitialiserMotDePasseRequest,
    db: DbDep,
    admin: AdminUser,
):
    """
    Un administrateur réinitialise le mot de passe d'un autre utilisateur.
    Un admin ne peut pas réinitialiser son propre mot de passe via cet endpoint
    (utiliser /change-password à la place).
    """
    auth_service.reinitialiser_mot_de_passe(
        db,
        admin=admin,
        utilisateur_id=utilisateur_id,
        nouveau_mot_de_passe=payload.nouveau_mot_de_passe,
    )


@router.get(
    "/me",
    response_model=UtilisateurResponse,
    summary="Profil de l'utilisateur connecté",
)
def me(user: CurrentUser):
    """
    Retourne les informations de l'utilisateur authentifié.
    Pas de requête DB supplémentaire : l'utilisateur est déjà chargé par la dépendance.
    """
    return user