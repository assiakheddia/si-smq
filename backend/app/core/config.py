"""
core/config.py — Configuration centralisée via Pydantic BaseSettings

Toutes les variables d'environnement du projet sont déclarées ici.
Lecture depuis le fichier .env (développement) ou variables système (production).

Dépendance :
  pip install pydantic-settings

Usage :
  from app.core.config import get_settings
  settings = get_settings()
  print(settings.DATABASE_URL)

La fonction get_settings() est mise en cache avec @lru_cache :
  - une seule instance Settings par processus
  - safe à appeler dans les dépendances FastAPI sans surcoût
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration globale du SI-SMQ.

    Hiérarchie de lecture (ordre croissant de priorité) :
      1. Valeurs par défaut déclarées ici
      2. Fichier .env à la racine du projet
      3. Variables d'environnement système

    En production, NE PAS utiliser de fichier .env :
    injecter les variables via Docker / Kubernetes secrets.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,       # SECRET_KEY ≠ secret_key
        extra="ignore",            # variables inconnues ignorées silencieusement
    )

    # -----------------------------------------------------------------------
    # §1 — Application
    # -----------------------------------------------------------------------

    APP_NAME: str = Field(
        default="SI-SMQ",
        description="Nom de l'application (utilisé dans les réponses et logs).",
    )

    APP_ENV: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Environnement d'exécution.",
    )

    APP_VERSION: str = Field(
        default="0.1.0",
        description="Version sémantique de l'application.",
    )

    DEBUG: bool = Field(
        default=False,
        description="Active le mode debug FastAPI (ne jamais activer en production).",
    )

    # -----------------------------------------------------------------------
    # §2 — Base de données PostgreSQL
    # -----------------------------------------------------------------------

    POSTGRES_USER: str = Field(
        default="si_smq",
        description="Utilisateur PostgreSQL.",
    )

    POSTGRES_PASSWORD: str = Field(
        default="changeme",
        description="Mot de passe PostgreSQL — OBLIGATOIRE en production.",
    )

    POSTGRES_HOST: str = Field(
        default="localhost",
        description="Hôte PostgreSQL.",
    )

    POSTGRES_PORT: int = Field(
        default=5432,
        ge=1,
        le=65535,
        description="Port PostgreSQL.",
    )

    POSTGRES_DB: str = Field(
        default="si_smq_db",
        description="Nom de la base de données.",
    )

    @property
    def DATABASE_URL(self) -> str:
        """
        URL de connexion SQLAlchemy construite depuis les composants.
        Format : postgresql+psycopg2://user:password@host:port/db
        """
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_ASYNC(self) -> str:
        """
        URL asyncpg pour les sessions async (si migration future vers async).
        Format : postgresql+asyncpg://user:password@host:port/db
        """
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Pool de connexions SQLAlchemy
    DB_POOL_SIZE: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Taille du pool de connexions SQLAlchemy.",
    )

    DB_MAX_OVERFLOW: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Connexions supplémentaires au-delà du pool.",
    )

    DB_POOL_TIMEOUT: int = Field(
        default=30,
        ge=5,
        description="Timeout (secondes) pour obtenir une connexion du pool.",
    )

    # -----------------------------------------------------------------------
    # §3 — JWT / Sécurité
    # -----------------------------------------------------------------------

    SECRET_KEY: str = Field(
        default="CHANGE_ME_IN_PRODUCTION_USE_openssl_rand_hex_32",
        min_length=32,
        description=(
            "Clé HMAC-SHA256 pour signer les JWT. "
            "Générer avec : openssl rand -hex 32"
        ),
    )

    ALGORITHM: str = Field(
        default="HS256",
        description="Algorithme de signature JWT.",
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        ge=5,
        le=1440,
        description="Durée de vie de l'access token en minutes.",
    )

    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        ge=1,
        le=30,
        description="Durée de vie du refresh token en jours.",
    )

    ADMIN_DEFAULT_PASSWORD: str = Field(
        default="changeme",
        description=(
            "Mot de passe du compte admin créé au premier démarrage. "
            "Changer immédiatement via l'API après le premier login."
        ),
    )

    # -----------------------------------------------------------------------
    # §3b — Google OAuth
    # -----------------------------------------------------------------------

    GOOGLE_CLIENT_ID: str = Field(
        default="",
        description="Google OAuth 2.0 Client ID (depuis Google Cloud Console).",
    )

    GOOGLE_CLIENT_SECRET: str = Field(
        default="",
        description="Google OAuth 2.0 Client Secret.",
    )

    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="URL du frontend (pour les redirections OAuth).",
    )

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def secret_key_non_defaut_en_production(cls, v: str) -> str:
        # On ne peut pas accéder à APP_ENV ici (validators par champ),
        # la vérification croisée est faite dans le validator model ci-dessous.
        return v

    # -----------------------------------------------------------------------
    # §4 — MinIO (stockage fichiers)
    # -----------------------------------------------------------------------

    MINIO_ENDPOINT: str = Field(
        default="localhost:9000",
        description="Endpoint MinIO (host:port, sans schéma).",
    )

    MINIO_ACCESS_KEY: str = Field(
        default="minioadmin",
        description="Clé d'accès MinIO.",
    )

    MINIO_SECRET_KEY: str = Field(
        default="minioadmin",
        description="Clé secrète MinIO — OBLIGATOIRE en production.",
    )

    MINIO_BUCKET_DOCUMENTS: str = Field(
        default="si-smq-documents",
        description="Nom du bucket MinIO pour les documents GED.",
    )

    MINIO_USE_SSL: bool = Field(
        default=False,
        description="Activer TLS pour la connexion MinIO (True en production).",
    )

    # Durée des URLs présignées MinIO
    MINIO_PRESIGNED_EXPIRE_SECONDS: int = Field(
        default=86400,          # 24h
        ge=300,
        le=604800,              # 7 jours max
        description="Durée de validité des URLs présignées (secondes). Défaut : 24h.",
    )

    MINIO_PRESIGNED_EXPIRE_CONFIDENTIEL_SECONDS: int = Field(
        default=3600,           # 1h
        ge=300,
        le=86400,
        description="Durée réduite pour les documents confidentiels (secondes). Défaut : 1h.",
    )

    # -----------------------------------------------------------------------
    # §5 — CORS
    # -----------------------------------------------------------------------

    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description=(
            "Origines autorisées pour les requêtes CORS. "
            "En production : ['https://si-smq.univ-example.dz']"
        ),
    )

    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Autoriser l'envoi de cookies / Authorization headers cross-origin.",
    )

    # -----------------------------------------------------------------------
    # §6 — Logs
    # -----------------------------------------------------------------------

    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Niveau de log global.",
    )

    LOG_JSON: bool = Field(
        default=False,
        description="Sortie logs en JSON structuré (True en production pour les agrégateurs).",
    )

    # -----------------------------------------------------------------------
    # §7 — Validators croisés
    # -----------------------------------------------------------------------

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parser_cors_origins(cls, v: str | list[str]) -> list[str]:
        """
        Accepte CORS_ORIGINS comme string CSV dans .env :
          CORS_ORIGINS="http://localhost:3000,https://si-smq.dz"
        """
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def valider_production(self) -> None:
        """
        Vérifications bloquantes en production.
        Appeler explicitement dans le lifespan FastAPI.

        Raises:
            ValueError si une configuration dangereuse est détectée.
        """
        if self.APP_ENV != "production":
            return

        erreurs: list[str] = []

        if "CHANGE_ME" in self.SECRET_KEY:
            erreurs.append("SECRET_KEY : utiliser openssl rand -hex 32.")

        if self.POSTGRES_PASSWORD == "changeme":
            erreurs.append("POSTGRES_PASSWORD : changer le mot de passe PostgreSQL.")

        if self.MINIO_SECRET_KEY == "minioadmin":
            erreurs.append("MINIO_SECRET_KEY : changer les credentials MinIO.")

        if self.ADMIN_DEFAULT_PASSWORD == "changeme":
            erreurs.append("ADMIN_DEFAULT_PASSWORD : changer le mot de passe admin.")

        if not self.MINIO_USE_SSL:
            erreurs.append("MINIO_USE_SSL : activer TLS en production.")

        if self.DEBUG:
            erreurs.append("DEBUG : désactiver le mode debug en production.")

        if erreurs:
            raise ValueError(
                "Configuration invalide pour la production :\n"
                + "\n".join(f"  - {e}" for e in erreurs)
            )

    # -----------------------------------------------------------------------
    # §8 — Helpers
    # -----------------------------------------------------------------------

    @property
    def est_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def est_developpement(self) -> bool:
        return self.APP_ENV == "development"


# ---------------------------------------------------------------------------
# Instance unique (cache LRU)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Retourne l'instance unique de Settings (singleton via lru_cache).

    Usage :
      from app.core.config import get_settings
      settings = get_settings()

    En test, surcharger avec :
      from app.core.config import get_settings
      get_settings.cache_clear()
      # puis patcher os.environ avant le prochain appel
    """
    return Settings()