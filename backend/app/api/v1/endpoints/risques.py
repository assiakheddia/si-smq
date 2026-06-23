from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.risque import StatutRisque
from app.services import risque_service
from app.schemas.risque import (
    RisqueCreate, RisqueUpdate, RisqueResponse, RisqueResponseDetail,
    EvaluerRisqueRequest, ChangerStatutRisqueRequest, RisqueHeatmapItem,
)

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.get("/heatmap", response_model=List[RisqueHeatmapItem])
def get_heatmap(
    processus_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return risque_service.get_heatmap(db, processus_code)


@router.get("/", response_model=List[RisqueResponse])
def lister_risques(
    db: Session = Depends(get_db),
    processus_code: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    criticite: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    taille_page: int = Query(20, ge=1, le=100),
):
    statut_enum = StatutRisque(statut) if statut else None
    result = risque_service.lister_risques(
        db, processus_code=processus_code, statut=statut_enum,
        criticite=criticite, page=page, taille_page=taille_page
    )
    return result["items"]


@router.post("/", response_model=RisqueResponse, status_code=status.HTTP_201_CREATED)
def creer_risque(
    data: RisqueCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return risque_service.creer_risque(db, data, current_user)


@router.get("/{id}", response_model=RisqueResponseDetail)
def get_risque(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return risque_service.get_risque(db, id)


@router.put("/{id}", response_model=RisqueResponse)
def update_risque(
    id: int,
    data: RisqueUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return risque_service.modifier_risque(db, id, data, current_user)


@router.delete("/{id}")
def delete_risque(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    r = risque_service.get_risque(db, id)
    db.delete(r)
    db.commit()
    return {"message": "Risque supprimé"}


@router.post("/{id}/evaluer", response_model=RisqueResponse)
def evaluer_risque(
    id: int,
    data: EvaluerRisqueRequest,           # ← input séparé du response
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    # Réutilise modifier_risque — le service recalcule RPN via iso_engine
    from app.schemas.risque import RisqueUpdate
    update = RisqueUpdate(
        probabilite=data.probabilite,
        gravite=data.gravite,
        detectabilite=data.detectabilite,
    )
    return risque_service.modifier_risque(db, id, update, current_user)


@router.post("/{id}/statut")
def changer_statut(
    id: int,
    data: ChangerStatutRisqueRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return risque_service.changer_statut(db, id, data, current_user)