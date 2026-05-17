import os
import sys

# =============================================================================
# CRITIQUE : CE BLOC DOIT S'ÉXÉCUTER EN PREMIER, AVANT TOUT IMPORT DE "APP"
# =============================================================================
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

os.environ["PGCLIENTENCODING"] = "utf-8"
os.environ.pop("PGUSER", None)
os.environ.pop("PGPASSWORD", None)
os.environ.pop("PGDATABASE", None)
os.environ.pop("PGHOST", None)
# =============================================================================

# Maintenant seulement, tu as le droit d'importer tes modules
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine, SessionLocal
from app.core.seeder import run_all_seeders
from app.api.v1.router import router as api_router
import app.models  # noqa: F401

app = FastAPI(
    title="SI-SMQ — Préparation Certification ISO 9001",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Création des tables + seeders au démarrage
# ---------------------------------------------------------------------------

@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)   # crée les tables si inexistantes
    db = SessionLocal()
    try:
        run_all_seeders(db)
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(api_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Routes utilitaires
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "SI-SMQ API opérationnelle"}

@app.get("/health")
def health():
    return {"status": "ok"}