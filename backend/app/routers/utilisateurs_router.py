"""
Router Utilisateurs — SI-SMQ
CRUD admin + profil personnel + gestion rôles et activation.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_current_user,
    get_current_active_admin,
)
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import (
    UtilisateurCreate,
    UtilisateurUpdate,
    UtilisateurUpdateSelf,
    UtilisateurChangerRole,
    UtilisateurDesactiver,
    UtilisateurResponse,
    UtilisateurResponseDetail,
)
from app.schemas.utilisateur import UtilisateurListResponse
from app.services import utilisateur_service

router = APIRouter(prefix="/api/utilisateurs", tags=["Utilisateurs"])

# ── Dépendances typées ──────────────────────────────────────────────────────

DbDep       = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]
AdminUser   = Annotated[Utilisateur, Depends(get_current_active_admin)]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=UtilisateurListResponse,
    summary="Lister les utilisateurs (admin uniquement)",
)
def lister_utilisateurs(
    db: DbDep,
    admin: AdminUser,
    page: int = Query(1, ge=1),
    par_page: int = Query(20, ge=1, le=100),
    role: str | None = None,
    actif: bool | None = None,
):
    return utilisateur_service.lister_utilisateurs(
        db,
        page=page,
        par_page=par_page,
        role=role,
        actif=actif,
    )


@router.post(
    "/",
    response_model=UtilisateurResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un utilisateur (admin uniquement)",
)
def creer_utilisateur(
    payload: UtilisateurCreate,
    db: DbDep,
    admin: AdminUser,
):
    """
    Validation mot de passe : 8 caractères min, majuscule, minuscule, chiffre, spécial.
    L'email doit être unique.
    """
    return utilisateur_service.creer_utilisateur(db, payload=payload, createur=admin)


@router.get(
    "/me",
    response_model=UtilisateurResponseDetail,
    summary="Profil détaillé de l'utilisateur connecté",
)
def get_profil_personnel(db: DbDep, user: CurrentUser):
    """
    Retourne le profil complet avec PermissionsCalculees, processus pilotés
    et compteurs d'activité.
    ⚠️ Déclaré avant /{utilisateur_id} pour éviter la collision de route.
    """
    return utilisateur_service.get_utilisateur_detail(db, utilisateur_id=user.id, demandeur=user)


@router.patch(
    "/me",
    response_model=UtilisateurResponse,
    summary="Modifier son propre profil (champs restreints)",
)
def modifier_profil_personnel(
    payload: UtilisateurUpdateSelf,
    db: DbDep,
    user: CurrentUser,
):
    """
    Schema UtilisateurUpdateSelf intentionnellement séparé de UtilisateurUpdate :
    l'utilisateur ne peut pas modifier son propre rôle ni son statut actif.
    """
    return utilisateur_service.modifier_profil_personnel(
        db, utilisateur=user, payload=payload
    )


@router.get(
    "/{utilisateur_id}",
    response_model=UtilisateurResponseDetail,
    summary="Détail d'un utilisateur (admin uniquement)",
)
def get_utilisateur(utilisateur_id: int, db: DbDep, admin: AdminUser):
    return utilisateur_service.get_utilisateur_detail(
        db, utilisateur_id=utilisateur_id, demandeur=admin
    )


@router.patch(
    "/{utilisateur_id}",
    response_model=UtilisateurResponse,
    summary="Modifier un utilisateur — infos profil (admin uniquement)",
)
def modifier_utilisateur(
    utilisateur_id: int,
    payload: UtilisateurUpdate,
    db: DbDep,
    admin: AdminUser,
):
    return utilisateur_service.modifier_utilisateur(
        db, utilisateur_id=utilisateur_id, payload=payload, demandeur=admin
    )


@router.post(
    "/{utilisateur_id}/role",
    response_model=UtilisateurResponse,
    summary="Changer le rôle d'un utilisateur (admin uniquement)",
)
def changer_role(
    utilisateur_id: int,
    payload: UtilisateurChangerRole,
    db: DbDep,
    admin: AdminUser,
):
    """
    Rôles disponibles : admin, pilote, contributeur.
    Un admin ne peut pas rétrograder son propre rôle (sécurité).
    """
    return utilisateur_service.changer_role(
        db,
        utilisateur_id=utilisateur_id,
        payload=payload,
        demandeur=admin,
    )


@router.post(
    "/{utilisateur_id}/actif",
    response_model=UtilisateurResponse,
    summary="Activer ou désactiver un utilisateur (admin uniquement)",
)
def changer_activation(
    utilisateur_id: int,
    payload: UtilisateurDesactiver,
    db: DbDep,
    admin: AdminUser,
):
    """
    Un motif est obligatoire en cas de désactivation.
    Un admin ne peut pas se désactiver lui-même.
    """
    return utilisateur_service.changer_activation(
        db,
        utilisateur_id=utilisateur_id,
        payload=payload,
        demandeur=admin,
    )