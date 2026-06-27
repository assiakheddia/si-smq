from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, List
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.core.database import get_db
from app.models.processus import Processus
from app.schemas.processus import ProcessusCreate, ProcessusResponse, ProcessusUpdate
from app.schemas.diagnostic_smq import (
    DiagnosticSMQResponse, DysfonctionnementResponse, DysfonctionnementUpdate,
)
from app.schemas.processus_revision import ProcessusRevisionResponse
from app.services import processus_service, diagnostic_smq_service

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.post("/", response_model=ProcessusResponse)
def create_processus(
    data: ProcessusCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return processus_service.creer_processus(db, data, current_user)


@router.get("/", response_model=List[ProcessusResponse])
def get_all_processus(db: Session = Depends(get_db)):
    return db.query(Processus).filter(Processus.est_actif == True).all()


@router.get("/{id}", response_model=ProcessusResponse)
def get_processus(id: int, db: Session = Depends(get_db)):
    return processus_service.get_processus(db, id)


@router.put("/{id}", response_model=ProcessusResponse)
def update_processus(
    id: int,
    data: ProcessusUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return processus_service.modifier_processus(db, id, data, current_user)


@router.delete("/{id}")
def delete_processus(id: int, db: Session = Depends(get_db)):
    p = db.query(Processus).filter(Processus.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Processus non trouvé")
    db.delete(p)
    db.commit()
    return {"message": "Processus supprimé"}


@router.post("/{id}/diagnostic-smq", response_model=DiagnosticSMQResponse)
def lancer_diagnostic_smq(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Lance le Moteur Analytique IA (analyse section par section, repli local si l'IA est indisponible)."""
    if not current_user.peut("create", "diagnostic"):
        raise HTTPException(status_code=403, detail="Droits insuffisants pour lancer un diagnostic SMQ.")
    return diagnostic_smq_service.lancer_diagnostic(db, id, current_user)


@router.get("/{id}/dysfonctionnements", response_model=List[DysfonctionnementResponse])
def get_dysfonctionnements(id: int, db: Session = Depends(get_db)):
    """Liste les dysfonctionnements du dernier diagnostic SMQ d'un processus."""
    return diagnostic_smq_service.lister_dysfonctionnements(db, id)


@router.put("/dysfonctionnements/{dysf_id}", response_model=DysfonctionnementResponse)
def update_dysfonctionnement(
    dysf_id: int,
    data: DysfonctionnementUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Met à jour l'échéance/statut/responsable d'un dysfonctionnement (IA ou local)."""
    return diagnostic_smq_service.modifier_dysfonctionnement(db, dysf_id, data)


@router.get("/{id}/revisions", response_model=List[ProcessusRevisionResponse])
def get_revisions(id: int, db: Session = Depends(get_db)):
    """Historique réel des versions du processus (créé/modifié automatiquement)."""
    return processus_service.lister_revisions(db, id)
