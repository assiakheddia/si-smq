"""
services/risque_service.py — Gestion des risques AMDEC

Responsabilités :
  - CRUD complet des risques
  - Calcul RPN (P × G × D) via iso_engine
  - Criticité automatique depuis RPN (seuils 20/50/80)
  - Création manuelle et automatique (depuis diagnostic)
  - Workflow : identifie → analyse → traitement → surveillance → clos
  - Heatmap RPN (données pour visualisation)

Référence générée : "RSQ-2025-PROC-LABO-001"
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import (
    calcul_rpn,
    evaluer_risque,
    risque_necessite_action,
    rpn_to_criticite,
)
from app.models.processus import Processus
from app.models.risque import Risque, StatutRisque
from app.models.utilisateur import Utilisateur
from app.schemas.risque import (
    ChangerStatutRisqueRequest,
    RisqueCreate,
    RisqueUpdate,
)

logger = logging.getLogger(__name__)

_TRANSITIONS_VALIDES = {
    StatutRisque.identifie:    [StatutRisque.analyse],
    StatutRisque.analyse:      [StatutRisque.traitement, StatutRisque.identifie],
    StatutRisque.traitement:   [StatutRisque.surveillance],
    StatutRisque.surveillance: [StatutRisque.clos, StatutRisque.traitement],
    StatutRisque.clos:         [],
}


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_ou_404(db: Session, risque_id: int) -> Risque:
    r = db.query(Risque).filter(Risque.id == risque_id).first()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risque {risque_id} introuvable.",
        )
    return r


def _generer_reference(db: Session, processus_code: str, annee: int) -> str:
    count = (
        db.query(Risque)
        .filter(Risque.reference.like(f"RSQ-{annee}-{processus_code}-%"))
        .count()
    )
    return f"RSQ-{annee}-{processus_code}-{count + 1:03d}"


def _appliquer_rpn(risque: Risque) -> None:
    """Recalcule et applique RPN + criticité sur l'objet risque."""
    if all(v is not None for v in [risque.probabilite, risque.gravite, risque.detectabilite]):
        rpn = calcul_rpn(risque.probabilite, risque.gravite, risque.detectabilite)
        risque.rpn = rpn
        risque.criticite = rpn_to_criticite(rpn)
    else:
        risque.rpn = None
        risque.criticite = None


# ---------------------------------------------------------------------------
# §1 — Création
# ---------------------------------------------------------------------------

def creer_risque(
    db: Session,
    payload: RisqueCreate,
    createur: Utilisateur,
) -> Risque:
    """
    Crée un risque manuellement.

    - Vérifie l'existence du processus
    - Calcule RPN et criticité si P, G, D fournis
    - Crée automatiquement une action si RPN critique (nécessite_action)

    Raises:
        HTTPException 404 — processus introuvable.
        HTTPException 400 — scores P/G/D hors plage [1, 10].
    """
    processus = db.query(Processus).filter(
        Processus.code == payload.processus_code
    ).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus '{payload.processus_code}' introuvable.",
        )

    for champ, valeur in [
        ("probabilite", payload.probabilite),
        ("gravite", payload.gravite),
        ("detectabilite", payload.detectabilite),
    ]:
        if valeur is not None and not (1 <= valeur <= 10):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{champ}' doit être compris entre 1 et 10.",
            )

    annee = datetime.now(tz=timezone.utc).year
    reference = _generer_reference(db, payload.processus_code, annee)

    risque = Risque(
        reference=reference,
        processus_id=processus.id,
        description=payload.description,
        cause=payload.cause,
        effet=payload.effet,
        probabilite=payload.probabilite,
        gravite=payload.gravite,
        detectabilite=payload.detectabilite,
        statut=StatutRisque.identifie,
        responsable_id=payload.responsable_id,
        genere_automatiquement=False,
    )
    _appliquer_rpn(risque)
    db.add(risque)
    db.commit()
    db.refresh(risque)

    # Création auto d'une action si le risque est critique
    if risque.rpn and risque_necessite_action(risque.rpn):
        _creer_action_depuis_risque(db, risque, createur)

    logger.info(
        "Risque créé : %s (RPN=%s, criticité=%s) par %s",
        reference, risque.rpn, risque.criticite, createur.email,
    )
    return risque


def _creer_action_depuis_risque(
    db: Session, risque: Risque, createur: Utilisateur
) -> None:
    """Crée automatiquement une action corrective pour un risque critique."""
    from app.models.action import Action, StatutAction

    annee = datetime.now(tz=timezone.utc).year
    processus = db.query(Processus).filter(
        Processus.id == risque.processus_id
    ).first()
    code_proc = processus.code if processus else "INCONNU"

    from app.core.iso_engine import priorite_depuis_criticite
    priorite = priorite_depuis_criticite(risque.criticite.value if risque.criticite else "modere")

    count = (
        db.query(Action)
        .filter(Action.reference.like(f"ACT-{annee}-{code_proc}-%"))
        .count()
    )
    action = Action(
        reference=f"ACT-{annee}-{code_proc}-{count + 1:03d}",
        processus_id=risque.processus_id,
        risque_id=risque.id,
        description=f"Action corrective — risque critique {risque.reference}",
        statut=StatutAction.planifiee,
        priorite=priorite,
        genere_automatiquement=True,
    )
    db.add(action)
    db.commit()
    logger.info("Action auto créée depuis risque critique %s", risque.reference)


# ---------------------------------------------------------------------------
# §2 — Lecture
# ---------------------------------------------------------------------------

def lister_risques(
    db: Session,
    processus_code: str | None = None,
    statut: StatutRisque | None = None,
    criticite: str | None = None,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(Risque)

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(Risque.processus_id == processus.id)

    if statut:
        q = q.filter(Risque.statut == statut)

    if criticite:
        q = q.filter(Risque.criticite == criticite)

    q = q.order_by(Risque.rpn.desc().nullslast())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


def get_risque(db: Session, risque_id: int) -> Risque:
    return _get_ou_404(db, risque_id)


# ---------------------------------------------------------------------------
# §3 — Mise à jour
# ---------------------------------------------------------------------------

def modifier_risque(
    db: Session,
    risque_id: int,
    payload: RisqueUpdate,
    modificateur: Utilisateur,
) -> Risque:
    """
    Met à jour partiellement un risque.
    Recalcule RPN et criticité si P, G ou D sont modifiés.

    Raises:
        HTTPException 404 — risque introuvable.
        HTTPException 400 — risque clos non modifiable.
    """
    risque = _get_ou_404(db, risque_id)

    if risque.statut == StatutRisque.clos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un risque clos ne peut plus être modifié.",
        )

    rpn_modifie = False
    for champ in ["description", "cause", "effet", "responsable_id"]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(risque, champ, valeur)

    for champ in ["probabilite", "gravite", "detectabilite"]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            if not (1 <= valeur <= 10):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"'{champ}' doit être compris entre 1 et 10.",
                )
            setattr(risque, champ, valeur)
            rpn_modifie = True

    if rpn_modifie:
        _appliquer_rpn(risque)

    db.commit()
    db.refresh(risque)

    logger.info("Risque modifié : %s par %s", risque.reference, modificateur.email)
    return risque


# ---------------------------------------------------------------------------
# §4 — Workflow
# ---------------------------------------------------------------------------

def changer_statut(
    db: Session,
    risque_id: int,
    payload: ChangerStatut,
    demandeur: Utilisateur,
) -> Risque:
    """
    Transitions workflow risque.

    Raises:
        HTTPException 400 — transition invalide.
        HTTPException 403 — rôle insuffisant pour clôturer.
    """
    risque = _get_ou_404(db, risque_id)
    nouveau_statut = payload.statut
    transitions_possibles = _TRANSITIONS_VALIDES.get(risque.statut, [])

    if nouveau_statut not in transitions_possibles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition '{risque.statut.value}' → '{nouveau_statut.value}' "
                "non autorisée."
            ),
        )

    if nouveau_statut == StatutRisque.clos and not demandeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clôture d'un risque réservée aux pilotes et administrateurs.",
        )

    risque.statut = nouveau_statut
    db.commit()
    db.refresh(risque)

    logger.info(
        "Risque %s → %s par %s",
        risque.reference, nouveau_statut.value, demandeur.email,
    )
    return risque


# ---------------------------------------------------------------------------
# §5 — Heatmap RPN
# ---------------------------------------------------------------------------

def get_heatmap(db: Session, processus_code: str | None = None) -> list[dict]:
    """
    Retourne les données pour la heatmap RPN (Probabilité × Gravité).

    Chaque item contient : probabilite, gravite, rpn, criticite, reference.
    Les risques sans P/G/D sont exclus.
    """
    q = db.query(Risque).filter(
        Risque.probabilite.isnot(None),
        Risque.gravite.isnot(None),
        Risque.detectabilite.isnot(None),
        Risque.statut != StatutRisque.clos,
    )

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(Risque.processus_id == processus.id)

    risques = q.all()
    return [
        {
            "id": r.id,
            "reference": r.reference,
            "probabilite": r.probabilite,
            "gravite": r.gravite,
            "detectabilite": r.detectabilite,
            "rpn": r.rpn,
            "criticite": r.criticite.value if r.criticite else None,
            "description": r.description[:80] if r.description else None,
        }
        for r in risques
    ]