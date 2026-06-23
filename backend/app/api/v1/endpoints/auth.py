import json
import urllib.parse
import urllib.request
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    _TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.utilisateur import Utilisateur
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserMeResponse,
)

router = APIRouter()

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


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
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
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
    from app.schemas.auth import PermissionsUtilisateur
    u = current_user
    perms = PermissionsUtilisateur(
        peut_creer_diagnostic=u.peut("create", "diagnostic"),
        peut_valider_diagnostic=u.peut("update", "diagnostic"),
        peut_gerer_utilisateurs=u.peut("update", "utilisateur"),
        peut_configurer_systeme=u.peut("delete", "*"),
        peut_supprimer_donnees=u.peut("delete", "diagnostic"),
        peut_exporter_rapports=u.peut("read", "document"),
        peut_gerer_documents=u.peut("create", "document"),
    )
    return {
        "id": u.id, "nom": u.nom, "prenom": u.prenom, "email": u.email,
        "role": u.role, "est_actif": u.est_actif, "poste": u.poste,
        "departement": u.departement, "telephone": u.telephone,
        "derniere_connexion": u.derniere_connexion, "date_creation": u.date_creation,
        "permissions": perms,
    }

@router.put("/me/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Annotated[Utilisateur, Depends(get_current_user)] = None
):
    if not verify_password(data.ancien_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")

    current_user.hashed_password = hash_password(data.nouveau_password)
    db.commit()
    return {"message": "Mot de passe mis à jour"}


# ---------------------------------------------------------------------------
# Google OAuth 2.0
# ---------------------------------------------------------------------------

def _google_redirect_uri() -> str:
    settings = get_settings()
    # Backend receives the callback, then redirects to frontend with tokens
    return f"http://localhost:8000/api/v1/auth/google/callback"


@router.get("/google")
def google_login():
    """Redirige l'utilisateur vers la page de consentement Google."""
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Connexion Google non configurée")

    params = urllib.parse.urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": _google_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    })
    return RedirectResponse(url=f"{_GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
def google_callback(code: str = None, error: str = None, db: Session = Depends(get_db)):
    """Reçoit le code Google, échange contre un token, identifie l'utilisateur."""
    settings = get_settings()
    frontend_error_url = f"{settings.FRONTEND_URL}/login?error="

    if error or not code:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Connexion Google annulée"))

    # 1. Échanger le code contre un access_token Google
    try:
        token_data = urllib.parse.urlencode({
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": _google_redirect_uri(),
            "grant_type": "authorization_code",
        }).encode()
        req = urllib.request.Request(_GOOGLE_TOKEN_URL, data=token_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req, timeout=10) as resp:
            google_tokens = json.loads(resp.read())
    except Exception:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Erreur lors de la connexion avec Google"))

    google_access_token = google_tokens.get("access_token")
    if not google_access_token:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Token Google invalide"))

    # 2. Récupérer les informations de l'utilisateur Google
    try:
        info_req = urllib.request.Request(_GOOGLE_USERINFO_URL)
        info_req.add_header("Authorization", f"Bearer {google_access_token}")
        with urllib.request.urlopen(info_req, timeout=10) as resp:
            google_user = json.loads(resp.read())
    except Exception:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Impossible de récupérer le profil Google"))

    google_id = google_user.get("id")
    email = google_user.get("email")

    if not google_id or not email:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Profil Google incomplet"))

    # 3. Trouver l'utilisateur en base par google_id ou par email
    user = db.query(Utilisateur).filter(Utilisateur.google_id == google_id).first()
    if not user:
        user = db.query(Utilisateur).filter(Utilisateur.email == email).first()
        if not user:
            return RedirectResponse(
                url=frontend_error_url + urllib.parse.quote(
                    "Aucun compte associé à cette adresse Google. Contactez votre administrateur."
                )
            )
        # Lier le compte Google à l'utilisateur existant
        user.google_id = google_id
        db.commit()

    if not user.est_actif:
        return RedirectResponse(url=frontend_error_url + urllib.parse.quote("Compte désactivé"))

    # 4. Générer les tokens JWT et rediriger vers le frontend
    tokens = _token_response(user)
    user_json = urllib.parse.quote(json.dumps({
        "id": tokens["utilisateur_id"],
        "nom_complet": tokens["nom_complet"],
        "email": tokens["email"],
        "role": tokens["role"],
    }))
    redirect_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={tokens['access_token']}"
        f"&refresh_token={tokens['refresh_token']}"
        f"&user={user_json}"
    )
    return RedirectResponse(url=redirect_url)