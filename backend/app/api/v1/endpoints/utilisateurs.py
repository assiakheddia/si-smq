from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurResponse

router = APIRouter()


@router.get("/", response_model=List[UtilisateurResponse])
def list_utilisateurs(
    q: str | None = Query(default=None, description="Filtre par nom ou prénom (insensible à la casse)"),
    db: Session = Depends(get_db),
):
    query = db.query(Utilisateur).filter(Utilisateur.est_actif == True)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            Utilisateur.nom.ilike(like) | Utilisateur.prenom.ilike(like)
        )
    return query.order_by(Utilisateur.nom, Utilisateur.prenom).all()
