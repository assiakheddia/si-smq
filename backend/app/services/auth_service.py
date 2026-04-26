"""
services/auth_service.py — Authentification et gestion des sessions JWT

Responsabilités :
  - Login (email + mot de passe → access + refresh tokens)
  - Refresh (refresh token → nouvel access token)
  - Logout (invalidation côté client — stateless JWT)
  - Changement de mot de passe (utilisateur connecté)
  - Réinitialisation de mot de passe (admin)

Dépendances :
  - core/security.py  — hash, verify, create_*_token, decode_*
  - core/database.py  — Session
  - models/utilisateur.py — Utilisateur
  - schemas/auth.py   — LoginRequest, TokenResponse, etc.

Note architecture :
  Ce service est stateless côté JWT : il n'y a pas de blacklist de tokens.
  Le logout est effectif côté client (suppression du token).
  Pour une invalidation serveur (ex: désactivation immédiate), utiliser
  la vérification est_actif dans get_current_user() — déjà en place.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.utilisateur import Utilisateur
from app.schemas.auth import (
    ChangePassword,
    LoginRequest,
    ResetPassword,
    TokenResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_utilisateur_par_email(db: Session, email: str) -> Utilisateur | None:
    """Récupère un utilisateur par email (insensible à la casse)."""
    return (
        db.query(Utilisateur)
        .filter(Utilisateur.email == email.lower().strip())
        .first()
    )


def _get_utilisateur_par_id(db: Session, utilisateur_id: int) -> Utilisateur:
    """
    Récupère un utilisateur par ID.

    Raises:
        HTTPException 404 si introuvable.
    """
    utilisateur = db.query(Utilisateur).filter(Utilisateur.id == utilisateur_id).first()
    if not utilisateur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur {utilisateur_id} introuvable.",
        )
    return utilisateur


def _build_token_response(utilisateur: Utilisateur) -> TokenResponse:
    """Construit la réponse TokenResponse depuis un utilisateur authentifié."""
    payload = {
        "sub": utilisateur.email,
        "role": utilisateur.role.value,
        "user_id": utilisateur.id,
    }
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        token_type="bearer",
        role=utilisateur.role,
        user_id=utilisateur.id,
        email=utilisateur.email,
        nom=utilisateur.nom,
        prenom=utilisateur.prenom,
    )


# ---------------------------------------------------------------------------
# §1 — Login
# ---------------------------------------------------------------------------

def login(db: Session, payload: LoginRequest) -> TokenResponse:
    """
    Authentifie un utilisateur et retourne les tokens JWT.

    Étapes :
      1. Recherche par email
      2. Vérification mot de passe (bcrypt)
      3. Vérification compte actif
      4. Mise à jour derniere_connexion
      5. Génération access + refresh tokens

    Args:
        db: Session SQLAlchemy.
        payload: LoginRequest (email + mot_de_passe).

    Returns:
        TokenResponse avec access_token, refresh_token et infos utilisateur.

    Raises:
        HTTPException 401 — email ou mot de passe incorrect.
        HTTPException 403 — compte désactivé.
    """
    # Message d'erreur générique volontaire — évite l'énumération d'emails
    erreur_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email ou mot de passe incorrect.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    utilisateur = _get_utilisateur_par_email(db, payload.email)
    if utilisateur is None:
        # Vérification factice pour éviter les timing attacks
        verify_password("dummy", "$2b$12$" + "x" * 53)
        raise erreur_credentials

    if not verify_password(payload.mot_de_passe, utilisateur.mot_de_passe_hash):
        logger.warning("Tentative de login échouée pour : %s", payload.email)
        raise erreur_credentials

    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez un administrateur.",
        )

    # Mise à jour de la dernière connexion
    utilisateur.derniere_connexion = datetime.now(tz=timezone.utc)
    db.commit()

    logger.info("Login réussi : %s (rôle=%s)", utilisateur.email, utilisateur.role.value)
    return _build_token_response(utilisateur)


# ---------------------------------------------------------------------------
# §2 — Refresh token
# ---------------------------------------------------------------------------

def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    """
    Émet un nouvel access token depuis un refresh token valide.

    Le refresh token est validé (signature + expiration + type="refresh").
    Un nouveau couple access + refresh est retourné (rotation des tokens).

    Args:
        db: Session SQLAlchemy.
        refresh_token: JWT de type refresh.

    Returns:
        TokenResponse avec de nouveaux tokens.

    Raises:
        HTTPException 401 — refresh token invalide ou expiré.
        HTTPException 401 — utilisateur introuvable.
        HTTPException 403 — compte désactivé.
    """
    payload = decode_refresh_token(refresh_token)
    email: str = payload["sub"]

    utilisateur = _get_utilisateur_par_email(db, email)
    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé.",
        )

    logger.debug("Refresh token valide pour : %s", email)
    return _build_token_response(utilisateur)


# ---------------------------------------------------------------------------
# §3 — Logout
# ---------------------------------------------------------------------------

def logout(utilisateur: Utilisateur) -> dict[str, str]:
    """
    Logout stateless — invalide le token côté client uniquement.

    Le service ne maintient pas de blacklist JWT.
    La désactivation immédiate d'un compte passe par UtilisateurDesactiver
    (vérifié à chaque requête via get_current_user → est_actif).

    Args:
        utilisateur: Utilisateur courant (injecté via get_current_user).

    Returns:
        Message de confirmation.
    """
    logger.info("Logout : %s", utilisateur.email)
    return {"message": f"Déconnexion réussie pour {utilisateur.email}."}


# ---------------------------------------------------------------------------
# §4 — Changement de mot de passe (utilisateur connecté)
# ---------------------------------------------------------------------------

def changer_mot_de_passe(
    db: Session,
    utilisateur: Utilisateur,
    payload: ChangePassword,
) -> dict[str, str]:
    """
    Permet à un utilisateur connecté de changer son propre mot de passe.

    Vérifie l'ancien mot de passe avant d'appliquer le nouveau.

    Args:
        db: Session SQLAlchemy.
        utilisateur: Utilisateur courant authentifié.
        payload: ChangePassword (ancien_mot_de_passe + nouveau_mot_de_passe).

    Returns:
        Message de confirmation.

    Raises:
        HTTPException 400 — ancien mot de passe incorrect.
        HTTPException 400 — nouveau mot de passe identique à l'ancien.
    """
    if not verify_password(payload.ancien_mot_de_passe, utilisateur.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ancien mot de passe incorrect.",
        )

    if payload.ancien_mot_de_passe == payload.nouveau_mot_de_passe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'ancien.",
        )

    utilisateur.mot_de_passe_hash = hash_password(payload.nouveau_mot_de_passe)
    db.commit()

    logger.info("Mot de passe changé : %s", utilisateur.email)
    return {"message": "Mot de passe mis à jour avec succès."}


# ---------------------------------------------------------------------------
# §5 — Réinitialisation de mot de passe (admin)
# ---------------------------------------------------------------------------

def reinitialiser_mot_de_passe(
    db: Session,
    admin: Utilisateur,
    utilisateur_id: int,
    payload: ResetPassword,
) -> dict[str, str]:
    """
    Permet à un administrateur de réinitialiser le mot de passe d'un utilisateur.

    Aucune vérification de l'ancien mot de passe (flux admin).
    Un admin ne peut pas réinitialiser son propre mot de passe via ce flux
    (utiliser changer_mot_de_passe à la place).

    Args:
        db: Session SQLAlchemy.
        admin: Utilisateur admin authentifié.
        utilisateur_id: ID de l'utilisateur cible.
        payload: ResetPassword (nouveau_mot_de_passe).

    Returns:
        Message de confirmation.

    Raises:
        HTTPException 403 — non admin.
        HTTPException 400 — tentative de reset sur son propre compte.
        HTTPException 404 — utilisateur cible introuvable.
    """
    if not admin.peut("administrer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux administrateurs.",
        )

    if admin.id == utilisateur_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Utilisez POST /auth/change-password "
                "pour modifier votre propre mot de passe."
            ),
        )

    cible = _get_utilisateur_par_id(db, utilisateur_id)
    cible.mot_de_passe_hash = hash_password(payload.nouveau_mot_de_passe)
    db.commit()

    logger.info(
        "Mot de passe réinitialisé par %s pour l'utilisateur %s.",
        admin.email,
        cible.email,
    )
    return {
        "message": f"Mot de passe réinitialisé pour {cible.email}."
    }