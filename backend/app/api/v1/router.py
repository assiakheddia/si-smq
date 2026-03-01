from fastapi import APIRouter
from app.api.v1.endpoints import processus

router = APIRouter()
router.include_router(processus.router, prefix="/processus", tags=["Processus"])