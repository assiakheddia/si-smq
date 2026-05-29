"""
SI-SMQ — Point d'entrée FastAPI
Lifespan : validation config → ping DB → seeders → démarrage.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import get_db_context, verifier_connexion
from app.core.seeder import run_all_seeders

from app.api.auth_router import router as auth_router
from app.api.processus_router import router as processus_router
from app.api.diagnostics_router import router as diagnostics_router
from app.api.risques_router import router as risques_router
from app.api.actions_router import router as actions_router
from app.api.indicateurs_router import router as indicateurs_router
from app.api.documents_router import router as documents_router
from app.api.utilisateurs_router import router as utilisateurs_router

settings = get_settings()


# ── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────
    # 1. Vérifie que la configuration est sûre pour la production
    #    (valider_production() est appelé ici, pas dans Settings.__init__,
    #    pour ne pas bloquer les tests unitaires)
    settings.valider_production()

    # 2. Ping PostgreSQL — lève une exception si la base est inaccessible
    verifier_connexion()

    # 3. Seeders idempotents (clauses ISO, parties intéressées, admin)
    with get_db_context() as db:
        run_all_seeders(db)

    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    # Rien pour l'instant — les connexions SQLAlchemy se ferment proprement.


# ── Application ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="SI-SMQ — Système d'Information Management Qualité",
    description=(
        "API REST pour la préparation à la certification ISO 9001:2015. "
        "Couvre le diagnostic, la cartographie des processus, le suivi des actions, "
        "des KPIs et la gestion documentaire."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
# CORS_ORIGINS accepte une string CSV dans .env :
# CORS_ORIGINS="http://localhost:3000,https://si-smq.dz"

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
# Ordre recommandé dans le handoff — respecté ici.

app.include_router(auth_router)
app.include_router(processus_router)
app.include_router(diagnostics_router)
app.include_router(risques_router)
app.include_router(actions_router)
app.include_router(indicateurs_router)
app.include_router(documents_router)
app.include_router(utilisateurs_router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Système"], summary="Vérification de l'état de l'API")
def health():
    """
    Endpoint léger pour les probes Docker / Kubernetes.
    Ne requiert pas d'authentification.
    """
    return {"status": "ok", "version": "1.0.0"}