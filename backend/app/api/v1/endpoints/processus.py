from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, List
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.core.database import get_db
from app.models.processus import Processus, PartieInteressee
from app.schemas.processus import ProcessusCreate, ProcessusResponse, ProcessusUpdate

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.post("/", response_model=ProcessusResponse)
def create_processus(data: ProcessusCreate, db: Session = Depends(get_db)):
    data_dict = data.model_dump(exclude={"parties_ids"})
    processus = Processus(**data_dict)
    db.add(processus)
    db.flush()
    if data.parties_ids:
        parties = db.query(PartieInteressee).filter(
            PartieInteressee.id.in_(data.parties_ids)
        ).all()
        processus.parties_interessees = parties
    db.commit()
    db.refresh(processus)
    return processus


@router.get("/", response_model=List[ProcessusResponse])
def get_all_processus(db: Session = Depends(get_db)):
    return db.query(Processus).filter(Processus.est_actif == True).all()


@router.get("/{id}", response_model=ProcessusResponse)
def get_processus(id: int, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    return p


@router.put("/{id}", response_model=ProcessusResponse)
def update_processus(id: int, data: ProcessusUpdate, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    update_dict = data.model_dump(exclude_unset=True)
    parties_ids = update_dict.pop("parties_ids", None)
    for key, value in update_dict.items():
        setattr(p, key, value)
    if parties_ids is not None:
        parties = db.query(PartieInteressee).filter(
            PartieInteressee.id.in_(parties_ids)
        ).all()
        p.parties_interessees = parties
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{id}")
def delete_processus(id: int, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    db.delete(p)
    db.commit()
    return {"message": "Processus supprimé"}
