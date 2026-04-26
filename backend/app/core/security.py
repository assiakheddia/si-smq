"""
core/security.py — Sécurité : hachage des mots de passe + gestion JWT

Dépendances :
  pip install passlib[bcrypt] python-jose[cryptography]

Variables d'environnement requises (via config.py / Settings) :
  SECRET_KEY          — clé HMAC-SHA256 (min 32 chars, générée avec openssl rand -hex 32)
  ALGORITHM           — "HS256" (défaut)
  ACCESS_TOKEN_EXPIRE_MINUTES  — durée access token (défaut : 30)
  REFRESH_TOKEN_EXPIRE_DAYS    — durée refresh token (défaut : 7)

Fonctions exposées :
  hash_password(plain)               → str
  verify_password(plain, hashed)     → bool
  create_access_token(data, expires) → str
  create_refresh_token(data)         → str
  decode_token(token)                → dict   (lève HTTPException si invalide)
  get_current_user(token, db)        → Utilisateur  (dépendance FastAPI)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.utilisateur import Utilisateur

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

settings = get_settings()

_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,          # coût CPU raisonnable pour un labo
)

# Schéma OAuth2 — pointe vers l'endpoint de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Types de tokens — stockés dans le claim "type" du JWT
_TYPE_ACCESS  = "access"
_TYPE_REFRESH = "refresh"


# ---------------------------------------------------------------------------
# §1 — Hachage des mots de passe
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """
    Retourne le hash bcrypt du mot de passe en clair.
    Utilisé dans auth_service (création compte, reset password).
    """
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Vérifie un mot de passe en clair contre son hash bcrypt.
    Retourne True si correspondance, False sinon.
    """
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# §2 — Création des tokens JWT
# ---------------------------------------------------------------------------

def _build_token(
    data: dict[str, Any],
    token_type: str,
    expires_delta: timedelta,
) -> str:
    """
    Construit et signe un JWT.

    Claims injectés automatiquement :
      - sub  : identifiant (email de l'utilisateur)
      - type : "access" | "refresh"
      - exp  : timestamp d'expiration UTC
      - iat  : timestamp d'émission UTC
    """
    now = datetime.now(tz=timezone.utc)
    payload = {
        **data,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Crée un access token JWT.

    Args:
        data: dict avec au minimum {"sub": email}.
        expires_delta: durée personnalisée (défaut : ACCESS_TOKEN_EXPIRE_MINUTES).

    Returns:
        Token JWT signé en string.
    """
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _build_token(data, _TYPE_ACCESS, delta)


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Crée un refresh token JWT de longue durée.

    Le refresh token ne contient que {"sub": email, "type": "refresh"}.
    Il est utilisé uniquement sur POST /api/auth/refresh.
    """
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    # On ne propage que le sub pour limiter la surface du refresh token
    return _build_token({"sub": data["sub"]}, _TYPE_REFRESH, delta)


# ---------------------------------------------------------------------------
# §3 — Décodage et validation des tokens
# ---------------------------------------------------------------------------

def decode_token(token: str, expected_type: str = _TYPE_ACCESS) -> dict[str, Any]:
    """
    Décode et valide un JWT.

    Vérifie :
      - Signature HMAC-SHA256
      - Expiration (exp)
      - Claim "type" correspond à expected_type

    Args:
        token: JWT string.
        expected_type: "access" (défaut) ou "refresh".

    Returns:
        Payload dict si valide.

    Raises:
        HTTPException 401 si invalide, expiré ou mauvais type.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError as exc:
        logger.debug("JWT decode error : %s", exc)
        raise credentials_exception from exc

    # Vérification du type de token
    if payload.get("type") != expected_type:
        logger.debug(
            "JWT type mismatch : attendu=%s reçu=%s",
            expected_type,
            payload.get("type"),
        )
        raise credentials_exception

    # Vérification du subject
    if not payload.get("sub"):
        raise credentials_exception

    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Raccourci pour décoder un refresh token."""
    return decode_token(token, expected_type=_TYPE_REFRESH)


# ---------------------------------------------------------------------------
# §4 — Dépendances FastAPI
# ---------------------------------------------------------------------------

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Utilisateur:
    """
    Dépendance FastAPI : extrait et valide l'utilisateur depuis le Bearer token.

    Usage dans les endpoints :
        @router.get("/me")
        def me(user: Annotated[Utilisateur, Depends(get_current_user)]):
            ...

    Raises:
        HTTPException 401 — token invalide / expiré
        HTTPException 401 — utilisateur introuvable en base
        HTTPException 403 — compte désactivé
    """
    payload = decode_token(token, expected_type=_TYPE_ACCESS)
    email: str = payload["sub"]

    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email).first()
    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez un administrateur.",
        )

    return utilisateur


def get_current_active_admin(
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
) -> Utilisateur:
    """
    Dépendance FastAPI : vérifie que l'utilisateur courant est admin.

    Usage :
        @router.delete("/{id}")
        def supprimer(admin: Annotated[Utilisateur, Depends(get_current_active_admin)]):
            ...

    Raises:
        HTTPException 403 — rôle insuffisant
    """
    if not current_user.peut("administrer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )
    return current_user


def get_current_pilote_ou_admin(
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
) -> Utilisateur:
    """
    Dépendance FastAPI : vérifie que l'utilisateur peut valider
    (rôles : admin, pilote).

    Utilisé pour : validation diagnostics, validation documents,
    transitions workflow avancées.
    """
    if not current_user.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux pilotes et administrateurs.",
        )
    return current_user