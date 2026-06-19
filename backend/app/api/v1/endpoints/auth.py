from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_password,
    get_current_user,
    decode_token,
    _TYPE_REFRESH,
)
from app.models.utilisateur import Utilisateur
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, ChangePasswordRequest, UserMeResponse

router = APIRouter()


def _token_response(user: Utilisateur) -> dict:
    settings = get_settings()
    return {
        "access_token": create_access_token({"sub": user.email, "role": user.role}),
        "refresh_token": create_refresh_token({"sub": user.email}),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "utilisateur_id": user.id,
        "nom_complet": user.nom_complet,
        "email": user.email,
        "role": user.role,
    }


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    if not user.est_actif:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    return _token_response(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token, expected_type=_TYPE_REFRESH)
    email = payload.get("sub")
    user = db.query(Utilisateur).filter(Utilisateur.email == email).first()
    if not user or not user.est_actif:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return _token_response(user)

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: Annotated[Utilisateur, Depends(get_current_user)]):
    """Utilise directement ta dépendance validée"""
    return current_user

@router.put("/me/password")
def change_password(
    data: ChangePasswordRequest, 
    db: Session = Depends(get_db), 
    current_user: Annotated[Utilisateur, Depends(get_current_user)] = None
):
    if not verify_password(data.ancien_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
        
    current_user.mot_de_passe_hash = hash_password(data.nouveau_mot_de_passe)
    db.commit()
    return {"message": "Mot de passe mis à jour"}