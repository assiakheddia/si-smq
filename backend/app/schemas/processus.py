from pydantic import BaseModel
from typing import Optional
from app.models.processus import TypeProcessus, StatutProcessus

class ProcessusCreate(BaseModel):
    nom: str
    objectif: Optional[str] = None
    type: TypeProcessus
    pilote_id: Optional[int] = None

class ProcessusResponse(BaseModel):
    id: int
    nom: str
    objectif: Optional[str]
    type: TypeProcessus
    statut: StatutProcessus
    score_maturite: float

    class Config:
        from_attributes = True

class ProcessusUpdate(BaseModel):
    nom: Optional[str] = None
    objectif: Optional[str] = None
    statut: Optional[StatutProcessus] = None
    score_maturite: Optional[float] = None