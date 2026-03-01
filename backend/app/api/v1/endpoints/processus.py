from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.processus import Processus
from app.schemas.processus import ProcessusCreate, ProcessusResponse, ProcessusUpdate

router = APIRouter()

# Créer un processus
@router.post("/", response_model=ProcessusResponse)
def create_processus(data: ProcessusCreate, db: Session = Depends(get_db)):
    processus = Processus(**data.model_dump())
    db.add(processus)
    db.commit()
    db.refresh(processus)
    return processus

# Lister tous les processus
@router.get("/", response_model=List[ProcessusResponse])
def get_all_processus(db: Session = Depends(get_db)):
    return db.query(Processus).all()

# Récupérer un processus par ID
@router.get("/{id}", response_model=ProcessusResponse)
def get_processus(id: int, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    return p

# Modifier un processus
@router.put("/{id}", response_model=ProcessusResponse)
def update_processus(id: int, data: ProcessusUpdate, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p

# Supprimer un processus
@router.delete("/{id}")
def delete_processus(id: int, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    db.delete(p)
    db.commit()
    return {"message": "Processus supprimé"}