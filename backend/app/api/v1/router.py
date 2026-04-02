from fastapi import APIRouter
from app.api.v1.endpoints import processus, diagnostics

router = APIRouter()
router.include_router(processus.router, prefix="/processus", tags=["Processus"])
router.include_router(diagnostics.router, tags=["Diagnostics"])