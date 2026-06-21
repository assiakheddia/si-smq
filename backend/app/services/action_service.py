"""
services/action_service.py — Gestion des actions correctives

Responsabilités :
  - CRUD complet des actions
  - Workflow : planifiee → en_cours → en_verification → close | annulee
  - Vérification d'efficacité (post-clôture)
  - Vue Kanban par statut
  - Calcul avancement forcé (iso_engine)
  - Priorité depuis criticité risque ou type écart

Référence générée : "ACT-2025-PROC-LABO-007"
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import (
    get_avancement_force,
    priorite_depuis_criticite,
    priorite_depuis_ecart,
    transition_action_valide,
)
from app.models.action import Action, StatutAction
from app.models.processus import Processus
from app.models.utilisateur import Utilisateur
from app.schemas.action import (
    ActionCreate,
    ActionUpdate,
    TransitionStatut,
    VerifierEfficacite,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_ou_404(db: Session, action_id: int) -> Action:
    a = db.query(Action).filter(Action.id == action_id).first()
    if not a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action {action_id} introuvable.",
        )
    return a


def _generer_reference(db: Session, processus_code: str, annee: int) -> str:
    count = (
        db.query(Action)
        .filter(Action.reference.like(f"ACT-{annee}-{processus_code}-%"))
        .count()
    )
    return f"ACT-{annee}-{processus_code}-{count + 1:03d}"


# ---------------------------------------------------------------------------
# §1 — Création
# ---------------------------------------------------------------------------

def creer_action(
    db: Session,
    payload: ActionCreate,
    createur: Utilisateur,
) -> Action:
    """
    Crée une action corrective manuellement.

    La priorité peut être calculée automatiquement depuis :
      - criticite_risque (si liée à un risque)
      - type_ecart (si liée à un écart diagnostic)
    Si ni l'une ni l'autre, la priorité fournie dans le payload est utilisée.

    Raises:
        HTTPException 404 — processus introuvable.
        HTTPException 400 — date_echeance dans le passé.
    """
    processus = db.query(Processus).filter(
        Processus.code == payload.processus_code
    ).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus '{payload.processus_code}' introuvable.",
        )

    if payload.date_echeance:
        if payload.date_echeance < datetime.now(tz=timezone.utc).date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La date d'échéance ne peut pas être dans le passé.",
            )

    # Calcul automatique de la priorité
    priorite = payload.priorite
    if payload.criticite_risque:
        priorite = priorite_depuis_criticite(payload.criticite_risque)
    elif payload.type_ecart:
        priorite = priorite_depuis_ecart(payload.type_ecart)

    annee = datetime.now(tz=timezone.utc).year
    reference = _generer_reference(db, payload.processus_code, annee)

    action = Action(
        reference=reference,
        processus_id=processus.id,
        risque_id=payload.risque_id,
        description=payload.description,
        cause_racine=payload.cause_racine,
        statut=StatutAction.planifiee,
        priorite=priorite,
        responsable_id=payload.responsable_id,
        date_echeance=payload.date_echeance,
        genere_automatiquement=False,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    logger.info(
        "Action créée : %s (priorité=%s) par %s",
        reference, priorite, createur.email,
    )
    return action


# ---------------------------------------------------------------------------
# §2 — Lecture
# ---------------------------------------------------------------------------

def lister_actions(
    db: Session,
    processus_code: str | None = None,
    statut: StatutAction | None = None,
    responsable_id: int | None = None,
    priorite: str | None = None,
    en_retard: bool = False,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(Action)

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(Action.processus_id == processus.id)

    if statut:
        q = q.filter(Action.statut == statut)

    if responsable_id:
        q = q.filter(Action.responsable_id == responsable_id)

    if priorite:
        q = q.filter(Action.priorite == priorite)

    if en_retard:
        aujourd_hui = datetime.now(tz=timezone.utc).date()
        q = q.filter(
            Action.date_echeance < aujourd_hui,
            Action.statut.not_in([StatutAction.close, StatutAction.annulee]),
        )

    q = q.order_by(Action.date_echeance.asc().nullslast())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


def get_action(db: Session, action_id: int) -> Action:
    return _get_ou_404(db, action_id)


def get_kanban(db: Session, processus_code: str | None = None) -> dict:
    """
    Retourne les actions groupées par statut pour une vue Kanban.

    Returns:
        dict avec une clé par StatutAction contenant la liste des actions.
    """
    q = db.query(Action)

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(Action.processus_id == processus.id)

    actions = q.all()
    kanban: dict[str, list] = {s.value: [] for s in StatutAction}
    for action in actions:
        kanban[action.statut.value].append(action)

    return kanban


# ---------------------------------------------------------------------------
# §3 — Mise à jour
# ---------------------------------------------------------------------------

def modifier_action(
    db: Session,
    action_id: int,
    payload: ActionUpdate,
    modificateur: Utilisateur,
) -> Action:
    """
    Mise à jour partielle d'une action.

    Raises:
        HTTPException 404 — action introuvable.
        HTTPException 400 — action close ou annulée.
    """
    action = _get_ou_404(db, action_id)

    if action.statut in (StatutAction.close, StatutAction.annulee):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Une action '{action.statut.value}' ne peut plus être modifiée.",
        )

    for champ in ["description", "cause_racine", "responsable_id", "priorite", "date_echeance"]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(action, champ, valeur)

    db.commit()
    db.refresh(action)

    logger.info("Action modifiée : %s par %s", action.reference, modificateur.email)
    return action


# ---------------------------------------------------------------------------
# §4 — Workflow
# ---------------------------------------------------------------------------

def transitionner_statut(
    db: Session,
    action_id: int,
    payload: TransitionStatut,
    demandeur: Utilisateur,
) -> Action:
    """
    Applique une transition de statut workflow.

    Transitions :
      planifiee      → en_cours         (responsable / pilote / admin)
      en_cours       → en_verification  (responsable / pilote / admin)
      en_verification→ close            (pilote / admin)
      en_verification→ en_cours         (renvoi — pilote / admin)
      * → annulee                       (pilote / admin)

    iso_engine.transition_action_valide() est la source de vérité.

    Raises:
        HTTPException 400 — transition invalide.
        HTTPException 403 — droits insuffisants.
    """
    action = _get_ou_404(db, action_id)
    nouveau_statut = payload.statut

    if not transition_action_valide(action.statut.value, nouveau_statut.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition '{action.statut.value}' → '{nouveau_statut.value}' "
                "non autorisée."
            ),
        )

    # Droits selon la transition cible
    transitions_admin = {StatutAction.close, StatutAction.annulee}
    if nouveau_statut in transitions_admin and not demandeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clôture/annulation réservée aux pilotes et administrateurs.",
        )

    # Vérification avant clôture : résultat requis
    if nouveau_statut == StatutAction.close and not payload.resultat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un résultat est requis pour clôturer une action.",
        )

    action.statut = nouveau_statut
    if payload.resultat:
        action.resultat = payload.resultat
    if nouveau_statut == StatutAction.close:
        action.date_cloture = datetime.now(tz=timezone.utc)

    # Avancement forcé depuis iso_engine
    action.avancement = get_avancement_force(nouveau_statut.value)

    db.commit()
    db.refresh(action)

    logger.info(
        "Action %s → %s par %s",
        action.reference, nouveau_statut.value, demandeur.email,
    )
    return action


# ---------------------------------------------------------------------------
# §5 — Vérification d'efficacité
# ---------------------------------------------------------------------------

def verifier_efficacite(
    db: Session,
    action_id: int,
    payload: VerifierEfficacite,
    verificateur: Utilisateur,
) -> Action:
    """
    Enregistre la vérification d'efficacité d'une action close.

    La vérification confirme que l'action a produit l'effet attendu.
    Réservée aux pilotes et administrateurs.

    Raises:
        HTTPException 400 — action non close.
        HTTPException 403 — droits insuffisants.
    """
    if not verificateur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification d'efficacité réservée aux pilotes et administrateurs.",
        )

    action = _get_ou_404(db, action_id)

    if action.statut != StatutAction.close:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La vérification d'efficacité ne s'applique qu'aux actions closes.",
        )

    action.efficacite_verifiee = payload.est_efficace
    action.commentaire_efficacite = payload.commentaire
    action.date_verification_efficacite = datetime.now(tz=timezone.utc)
    action.verificateur_id = verificateur.id

    db.commit()
    db.refresh(action)

    logger.info(
        "Efficacité vérifiée pour %s : %s par %s",
        action.reference,
        "efficace" if payload.est_efficace else "non efficace",
        verificateur.email,
    )
    return action