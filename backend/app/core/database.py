"""
core/database.py — Connexion PostgreSQL + session SQLAlchemy

Expose :
  Base       — classe de base déclarative pour tous les modèles
  engine     — moteur SQLAlchemy (utilisé par Alembic et les tests)
  get_db()   — dépendance FastAPI (générateur de session)

Usage dans un endpoint :
  from app.core.database import get_db
  from sqlalchemy.orm import Session
  from typing import Annotated
  from fastapi import Depends

  DbDep = Annotated[Session, Depends(get_db)]

  @router.get("/")
  def liste(db: DbDep):
      ...

Usage dans le seeder (hors FastAPI) :
  from app.core.database import SessionLocal
  with SessionLocal() as db:
      run_all_seeders(db)
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


# ---------------------------------------------------------------------------
# §1 — Moteur SQLAlchemy
# ---------------------------------------------------------------------------

# URL construite depuis la configuration (.env / variables d'environnement),
# avec le driver "psycopg" (v3).
url_str = settings.DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+psycopg://")

engine = create_engine(
    url_str,
    # Paramètres de compatibilité indispensables pour PostgreSQL 12
    connect_args={
        "gssencmode": "disable",
        "channel_binding": "prefer"
    },
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    future=True,
)
# ---------------------------------------------------------------------------
# §2 — Classe de base déclarative
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    """
    Classe de base pour tous les modèles SQLAlchemy du projet.

    Tous les modèles héritent de cette classe :
      from app.core.database import Base
      class MonModele(Base):
          __tablename__ = "mon_modele"
          ...

    Alembic détecte automatiquement les modèles via Base.metadata.
    """
    pass


# ---------------------------------------------------------------------------
# §3 — Factory de sessions
# ---------------------------------------------------------------------------

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,     # évite les lazy-load surprises après commit
)


# ---------------------------------------------------------------------------
# §4 — Dépendance FastAPI
# ---------------------------------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    Dépendance FastAPI : fournit une session SQLAlchemy par requête HTTP.

    - Ouvre la session en début de requête
    - Commit automatique si la requête réussit
    - Rollback automatique en cas d'exception
    - Fermeture garantie via finally

    Usage :
        DbDep = Annotated[Session, Depends(get_db)]

        @router.post("/")
        def creer(payload: MonSchema, db: DbDep):
            ...
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# §5 — Context manager pour usage hors FastAPI (seeder, scripts, tests)
# ---------------------------------------------------------------------------

@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager pour utiliser une session hors du cycle de vie FastAPI.

    Usage :
        from app.core.database import get_db_context

        with get_db_context() as db:
            run_all_seeders(db)

        # ou dans les tests :
        with get_db_context() as db:
            db.add(MonObjet(...))
            db.commit()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# §6 — Vérification de connectivité
# ---------------------------------------------------------------------------

def verifier_connexion() -> bool:
    """
    Teste la connexion à la base de données.
    Appelé au démarrage FastAPI pour un feedback immédiat.

    Returns:
        True si la connexion est établie.

    Raises:
        Exception si la connexion échoue (propagée pour bloquer le démarrage).
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connexion PostgreSQL établie : %s", settings.POSTGRES_HOST)
        return True
    except Exception as exc:
        logger.critical(
            "Impossible de se connecter à PostgreSQL (%s:%s) : %s",
            settings.POSTGRES_HOST,
            settings.POSTGRES_PORT,
            exc,
        )
        raise