from fastapi import APIRouter
# Ajout de .v1 dans le chemin d'importation
from app.api.v1.endpoints import auth, processus, diagnostics, risques, indicateur, documents, utilisateurs, actions, rapports

router = APIRouter()

router.include_router(auth.router,         prefix="/auth",        tags=["Auth"])
router.include_router(processus.router,    prefix="/processus",   tags=["Processus"])
router.include_router(diagnostics.router,  prefix="/diagnostics", tags=["Diagnostics"])
router.include_router(risques.router,      prefix="/risques",     tags=["Risques"])
router.include_router(indicateur.router,   prefix="/indicateurs", tags=["Indicateurs"])
router.include_router(documents.router,    prefix="/documents",   tags=["Documents"])
router.include_router(utilisateurs.router, prefix="/users",       tags=["Utilisateurs"])
router.include_router(actions.router,      prefix="/actions",     tags=["Actions"])
router.include_router(rapports.router,     prefix="/rapports",    tags=["Rapports"])
