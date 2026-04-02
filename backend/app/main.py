from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.api.v1.router import router as api_router
import app.models
from app.core.database import SessionLocal
from app.core.seeder import run_all_seeders
 
app = FastAPI(title="SI-SMQ", version="1.0.0")
Base.metadata.create_all(bind=engine)

 
@app.on_event("startup")
def on_startup() -> None:
    """Exécuté une seule fois au démarrage du serveur Uvicorn."""
    db = SessionLocal()
    try:
        run_all_seeders(db)
    finally:
        db.close()

app = FastAPI(
    title="SI-SMQ — Préparation Certification ISO 9001",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "SI-SMQ API opérationnelle"}

@app.get("/health")
def health():
    return {"status": "ok"}