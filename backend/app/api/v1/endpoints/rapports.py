from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.utilisateur import Utilisateur
from app.schemas.rapport import RapportGenerationRequest
from app.services import rapport_service

router = APIRouter()
CurrentUser = Annotated[Utilisateur, Depends(get_current_user)]


@router.post("/generer")
def generer_rapport(
    payload: RapportGenerationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Génère un rapport PDF (tous les processus ou une sélection) et le renvoie en téléchargement direct."""
    pdf_bytes, document = rapport_service.generer_rapport(db, payload, current_user)
    nom_fichier = "".join(c for c in payload.nom if c.isalnum() or c in " _-").strip() or "rapport"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nom_fichier}.pdf"',
            "X-Document-Id": str(document.id),
            "X-Document-Reference": document.reference,
        },
    )
