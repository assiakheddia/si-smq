from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.indicateur import SourceKPI
from app.services import kpi_service
from app.schemas.indicateur import (
    IndicateurCreate, IndicateurUpdate, IndicateurResponse, IndicateurResponseDetail,
    MesureCreate, MesureResponse, MesureListResponse,
)

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.get("/tableau-de-bord")
def tableau_de_bord(
    processus_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return kpi_service.get_tableau_de_bord(db, processus_code)


@router.get("/", response_model=List[IndicateurResponse])
def lister_indicateurs(
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
    processus_code: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    taille_page: int = Query(20, ge=1, le=100),
):
    result = kpi_service.lister_indicateurs(
        db, processus_code=processus_code, page=page, taille_page=taille_page
    )
    return result["items"]


@router.post("/", response_model=IndicateurResponse, status_code=status.HTTP_201_CREATED)
def creer_indicateur(
    data: IndicateurCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return kpi_service.creer_indicateur(db, data, current_user)


@router.get("/{id}", response_model=IndicateurResponseDetail)
def get_indicateur(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return kpi_service.get_indicateur(db, id)


@router.put("/{id}", response_model=IndicateurResponse)
def update_indicateur(
    id: int,
    data: IndicateurUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return kpi_service.modifier_indicateur(db, id, data, current_user)


@router.delete("/{id}")
def delete_indicateur(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    i = kpi_service.get_indicateur(db, id)
    db.delete(i)
    db.commit()
    return {"message": "Indicateur supprimé"}


@router.post("/{id}/mesures", response_model=MesureResponse)
def add_mesure(
    id: int,
    data: MesureCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    return kpi_service.enregistrer_mesure(db, id, data, current_user)


@router.get("/{id}/mesures", response_model=MesureListResponse)
def list_mesures(
    id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
    page: int = Query(1, ge=1),
    taille_page: int = Query(50, ge=1, le=200),
):
    return kpi_service.lister_mesures(db, id, page=page, taille_page=taille_page)


@router.post("/{id}/calculer")
def calculer_auto(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    """Déclenche le calcul automatique pour un indicateur à source=auto."""
    return kpi_service.calculer_valeur_auto(db, id)


@router.post("/calculer-tout")
def calculer_tout(db: Session = Depends(get_db), current_user: CurrentUser = None):
    """Déclenche tous les calculs auto (batch)."""
    return kpi_service.declencher_calculs_auto(db)