from fastapi import FastAPI
from app import models
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SI-SMQ — Préparation Certification ISO 9001",
    description="Système d'Information support à la mise en conformité ISO 9001",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "SI-SMQ API opérationnelle"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

models.Base.metadata.create_all(bind=engine)
