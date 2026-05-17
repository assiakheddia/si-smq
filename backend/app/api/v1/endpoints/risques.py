from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.risque import Risque
from app.schemas.risque import (
    RisqueCreate, RisqueUpdate, RisqueResponse, RisqueResponseDetail,
    EvaluerRisqueResponse, ChangerStatutRisqueRequest, RisqueListResponse, RisqueHeatmapItem
)

router = APIRouter()

@router.get("/heatmap", response_model=List[RisqueHeatmapItem])
def get_heatmap(db: Session = Depends(get_db)):
    risques = db.query(Risque).all()
    return [{"id": r.id, "probabilite": r.probabilite, "gravite": r.gravite, "criticite": r.niveau_criticite} for r in risques]

@router.get("/", response_model=List[RisqueListResponse])
def list_risques(db: Session = Depends(get_db)):
    return db.query(Risque).all()

@router.post("/", response_model=RisqueResponse)
def create_risque(data: RisqueCreate, db: Session = Depends(get_db)):
    risque = Risque(**data.model_dump())
    db.add(risque)
    db.commit()
    db.refresh(risque)
    return risque

@router.get("/{id}", response_model=RisqueResponseDetail)
def get_risque(id: int, db: Session = Depends(get_db)):
    r = db.query(Risque).filter(Risque.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    return r

@router.put("/{id}", response_model=RisqueResponse)
def update_risque(id: int, data: RisqueUpdate, db: Session = Depends(get_db)):
    r = db.query(Risque).filter(Risque.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(r, key, value)
    db.commit()
    db.refresh(r)
    return r

@router.delete("/{id}")
def delete_risque(id: int, db: Session = Depends(get_db)):
    r = db.query(Risque).filter(Risque.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    db.delete(r)
    db.commit()
    return {"message": "Risque supprimé"}

@router.post("/{id}/evaluer", response_model=EvaluerRisqueResponse)
def evaluer_risque(id: int, data: EvaluerRisqueResponse, db: Session = Depends(get_db)):
    r = db.query(Risque).filter(Risque.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    r.probabilite = data.probabilite
    r.gravite = data.gravite
    r.detectabilite = data.detectabilite
    r.rpn = data.probabilite * data.gravite * data.detectabilite
    db.commit()
    db.refresh(r)
    return r

@router.post("/{id}/statut")
def changer_statut(id: int, data: ChangerStatutRisqueRequest, db: Session = Depends(get_db)):
    r = db.query(Risque).filter(Risque.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    r.statut = data.statut
    db.commit()
    return {"message": f"Statut mis à jour : {data.statut}"}