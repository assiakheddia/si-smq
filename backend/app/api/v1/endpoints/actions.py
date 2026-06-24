from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.action import StatutAction
from app.services import action_service
from app.schemas.action import (
    ActionCreate, ActionUpdate, ActionResponse, ActionResponseDetail,
    TransitionStatutRequest, VerifierEfficaciteRequest, ActionKanbanResponse,
)

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.get("/", response_model=List[ActionResponse])
def lister_actions(
    db: Session = Depends(get_db),
    processus_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    responsable_id: Optional[int] = Query(None),
    priorite: Optional[str] = Query(None),
    en_retard: bool = Query(False),
    page: int = Query(1, ge=1),
    taille_page: int = Query(20, ge=1, le=100),
):
    statut_enum = StatutAction(statut) if statut else None
    result = action_service.lister_actions(
        db, processus_id=processus_id, statut=statut_enum,
        responsable_id=responsable_id, priorite=priorite,
        en_retard=en_retard, page=page, taille_page=taille_page,
    )
    return result["items"]


@router.get("/kanban", response_model=ActionKanbanResponse)
def get_kanban(processus_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    kanban = action_service.get_kanban(db, processus_id)
    return {
        "planifiees":      kanban.get("planifiee", []),
        "en_cours":        kanban.get("en_cours", []),
        "en_verification": kanban.get("en_verification", []),
        "closes":          kanban.get("close", []),
        "annulees":        kanban.get("annulee", []),
    }


@router.post("/", response_model=ActionResponse, status_code=status.HTTP_201_CREATED)
def creer_action(data: ActionCreate, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return action_service.creer_action(db, data, current_user)


@router.get("/{id}", response_model=ActionResponseDetail)
def get_action(id: int, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return action_service.get_action(db, id)


@router.put("/{id}", response_model=ActionResponse)
def update_action(id: int, data: ActionUpdate, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return action_service.modifier_action(db, id, data, current_user)


@router.post("/{id}/statut", response_model=ActionResponse)
def changer_statut(id: int, data: TransitionStatutRequest, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return action_service.transitionner_statut(db, id, data, current_user)


@router.post("/{id}/verifier-efficacite", response_model=ActionResponse)
def verifier_efficacite(id: int, data: VerifierEfficaciteRequest, db: Session = Depends(get_db), current_user: CurrentUser = None):
    return action_service.verifier_efficacite(db, id, data, current_user)
