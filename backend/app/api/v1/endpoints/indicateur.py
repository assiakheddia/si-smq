from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.indicateur import Indicateur, MesureKPI
from app.schemas.indicateur import (
    IndicateurCreate, IndicateurUpdate, IndicateurResponse, IndicateurResponseDetail,
    MesureCreate, MesureResponse, MesureListResponse, SimulerAlerteRequest, TableauBordKPIResponse
)

router = APIRouter()

@router.get("/tableau-de-bord", response_model=List[TableauBordKPIResponse])
def tableau_de_bord(db: Session = Depends(get_db)):
    return db.query(Indicateur).all()

@router.get("/", response_model=List[IndicateurResponse])
def list_indicateurs(db: Session = Depends(get_db)):
    return db.query(Indicateur).all()

@router.post("/", response_model=IndicateurResponse)
def create_indicateur(data: IndicateurCreate, db: Session = Depends(get_db)):
    indicateur = Indicateur(**data.model_dump())
    db.add(indicateur)
    db.commit()
    db.refresh(indicateur)
    return indicateur

@router.get("/{id}", response_model=IndicateurResponseDetail)
def get_indicateur(id: int, db: Session = Depends(get_db)):
    i = db.query(Indicateur).filter(Indicateur.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    return i

@router.put("/{id}", response_model=IndicateurResponse)
def update_indicateur(id: int, data: IndicateurUpdate, db: Session = Depends(get_db)):
    i = db.query(Indicateur).filter(Indicateur.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(i, key, value)
    db.commit()
    db.refresh(i)
    return i

@router.delete("/{id}")
def delete_indicateur(id: int, db: Session = Depends(get_db)):
    i = db.query(Indicateur).filter(Indicateur.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    db.delete(i)
    db.commit()
    return {"message": "Indicateur supprimé"}

@router.post("/{id}/mesures", response_model=MesureResponse)
def add_mesure(id: int, data: MesureCreate, db: Session = Depends(get_db)):
    i = db.query(Indicateur).filter(Indicateur.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    mesure = MesureKPI(indicateur_id=id, **data.model_dump())
    db.add(mesure)
    db.commit()
    db.refresh(mesure)
    return mesure

@router.get("/{id}/mesures", response_model=MesureListResponse)
def list_mesures(id: int, db: Session = Depends(get_db)):
    mesures = db.query(MesureKPI).filter(MesureKPI.indicateur_id == id).order_by(MesureKPI.date_mesure.desc()).all()
    return {"indicateur_id": id, "mesures": mesures}

@router.post("/{id}/simuler-alerte")
def simuler_alerte(id: int, data: SimulerAlerteRequest, db: Session = Depends(get_db)):
    i = db.query(Indicateur).filter(Indicateur.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Indicateur non trouvé")
    # Déléguer à kpi_service plus tard
    return {"alerte": None, "valeur_simulee": data.valeur}