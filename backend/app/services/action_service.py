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
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import (
    get_avancement_force,
    priorite_depuis_criticite,
    priorite_depuis_ecart,
    transition_action_valide,
)
from app.models.action import Action, StatutAction
from app.models.diagnostic import DiagnosticClause
from app.models.processus import Processus
from app.models.risque import Risque
from app.models.utilisateur import RoleEnum, Utilisateur
from app.schemas.action import (
    ActionCreate,
    ActionUpdate,
    TransitionStatutRequest,
    VerifierEfficaciteRequest,
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
    Crée une action corrective/préventive/d'amélioration.

    La priorité peut être calculée automatiquement depuis :
      - la criticité du risque lié (si risque_id renseigné)
      - le type d'écart de la clause liée (si diagnostic_clause_id renseigné)
    Sinon, la priorité fournie dans le payload est utilisée.

    Raises:
        HTTPException 404 — processus introuvable.
        HTTPException 400 — date_echeance dans le passé.
    """
    processus = db.query(Processus).filter(Processus.id == payload.processus_id).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus {payload.processus_id} introuvable.",
        )

    if payload.date_echeance and payload.date_echeance < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date d'échéance ne peut pas être dans le passé.",
        )

    # Calcul automatique de la priorité depuis la source liée
    priorite = payload.priorite
    if payload.risque_id:
        risque = db.query(Risque).filter(Risque.id == payload.risque_id).first()
        if risque:
            priorite = priorite_depuis_criticite(risque.criticite.value)
    elif payload.diagnostic_clause_id:
        clause = db.query(DiagnosticClause).filter(
            DiagnosticClause.id == payload.diagnostic_clause_id
        ).first()
        if clause and clause.type_ecart:
            priorite = priorite_depuis_ecart(clause.type_ecart.value)

    annee = datetime.utcnow().year
    reference = _generer_reference(db, processus.code, annee)

    action = Action(
        reference=reference,
        titre=payload.titre,
        description=payload.description,
        type=payload.type,
        origine=payload.origine,
        processus_id=processus.id,
        risque_id=payload.risque_id,
        diagnostic_clause_id=payload.diagnostic_clause_id,
        clause_iso_code=payload.clause_iso_code,
        responsable_id=payload.responsable_id,
        verificateur_id=payload.verificateur_id,
        cause_racine=payload.cause_racine,
        statut=StatutAction.planifiee,
        priorite=priorite,
        date_planifiee=payload.date_planifiee,
        date_echeance=payload.date_echeance,
        generee_automatiquement=payload.generee_automatiquement,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    logger.info(
        "Action créée : %s (priorité=%s) par %s",
        reference, priorite, createur.email,
    )
    action.processus_nom = processus.nom
    return action


# ---------------------------------------------------------------------------
# §2 — Lecture
# ---------------------------------------------------------------------------

def lister_actions(
    db: Session,
    processus_id: int | None = None,
    statut: StatutAction | None = None,
    responsable_id: int | None = None,
    priorite: str | None = None,
    en_retard: bool = False,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(Action).filter(Action.est_active == True)  # noqa: E712

    if processus_id:
        q = q.filter(Action.processus_id == processus_id)

    if statut:
        q = q.filter(Action.statut == statut)

    if responsable_id:
        q = q.filter(Action.responsable_id == responsable_id)

    if priorite:
        q = q.filter(Action.priorite == priorite)

    if en_retard:
        maintenant = datetime.utcnow()
        q = q.filter(
            Action.date_echeance < maintenant,
            Action.statut.not_in([StatutAction.close, StatutAction.annulee]),
        )

    q = q.order_by(Action.date_echeance.asc().nullslast())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()
    for item in items:
        item.processus_nom = item.processus.nom if item.processus else None

    nb_planifiees = db.query(Action).filter(Action.statut == StatutAction.planifiee).count()
    nb_en_cours = db.query(Action).filter(Action.statut == StatutAction.en_cours).count()
    nb_closes = db.query(Action).filter(Action.statut == StatutAction.close).count()
    nb_en_retard = (
        db.query(Action)
        .filter(
            Action.date_echeance < datetime.utcnow(),
            Action.statut.not_in([StatutAction.close, StatutAction.annulee]),
        )
        .count()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": taille_page,
        "nb_planifiees": nb_planifiees,
        "nb_en_cours": nb_en_cours,
        "nb_en_retard": nb_en_retard,
        "nb_closes": nb_closes,
    }


def get_action(db: Session, action_id: int) -> Action:
    action = _get_ou_404(db, action_id)
    action.processus_nom = action.processus.nom if action.processus else None
    return action


def get_kanban(db: Session, processus_id: int | None = None) -> dict:
    """
    Retourne les actions groupées par statut pour une vue Kanban.
    """
    q = db.query(Action).filter(Action.est_active == True)  # noqa: E712

    if processus_id:
        q = q.filter(Action.processus_id == processus_id)

    actions = q.all()
    kanban: dict[str, list] = {s.value: [] for s in StatutAction}
    for action in actions:
        action.processus_nom = action.processus.nom if action.processus else None
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

    champs = [
        "titre", "description", "type", "priorite", "cause_racine",
        "clause_iso_code", "date_planifiee", "date_echeance", "responsable_id",
        "verificateur_id", "avancement",
    ]
    for champ in champs:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(action, champ, valeur)

    db.commit()
    db.refresh(action)

    logger.info("Action modifiée : %s par %s", action.reference, modificateur.email)
    action.processus_nom = action.processus.nom if action.processus else None
    return action


# ---------------------------------------------------------------------------
# §4 — Workflow
# ---------------------------------------------------------------------------

def transitionner_statut(
    db: Session,
    action_id: int,
    payload: TransitionStatutRequest,
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
    nouveau_statut = payload.nouveau_statut

    if not transition_action_valide(action.statut.value, nouveau_statut.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition '{action.statut.value}' → '{nouveau_statut.value}' "
                "non autorisée."
            ),
        )

    # Droits selon la transition cible.
    # Annulation : réservée aux préparateurs et à la direction (décision destructive).
    if nouveau_statut == StatutAction.annulee and not demandeur.peut("delete", "action"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="L'annulation est réservée aux préparateurs et à la direction.",
        )
    # Clôture (en_verification → close) : vérification d'efficacité §10.2.1 —
    # c'est précisément le rôle de l'auditeur interne, en plus des préparateurs/direction.
    if nouveau_statut == StatutAction.close and not (
        demandeur.peut("delete", "action") or demandeur.role == RoleEnum.auditeur_interne
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La clôture est réservée aux préparateurs, à l'auditeur interne et à la direction.",
        )

    action.statut = nouveau_statut
    if nouveau_statut == StatutAction.annulee:
        action.motif_annulation = payload.commentaire
        action.date_cloture = datetime.utcnow()
    elif nouveau_statut == StatutAction.close:
        action.date_cloture = datetime.utcnow()
        # Traçabilité §10.2.1 : la personne qui valide l'efficacité devient le
        # vérificateur si aucun n'était déjà désigné.
        if not action.verificateur_id:
            action.verificateur_id = demandeur.id
    elif nouveau_statut == StatutAction.en_verification:
        action.date_realisation = datetime.utcnow()

    # Avancement forcé depuis iso_engine (None = avancement libre, ex. en_cours)
    avancement_force = get_avancement_force(nouveau_statut.value)
    if avancement_force is not None:
        action.avancement = avancement_force

    db.commit()
    db.refresh(action)

    logger.info(
        "Action %s → %s par %s",
        action.reference, nouveau_statut.value, demandeur.email,
    )
    action.processus_nom = action.processus.nom if action.processus else None
    return action


# ---------------------------------------------------------------------------
# §5 — Vérification d'efficacité
# ---------------------------------------------------------------------------

def verifier_efficacite(
    db: Session,
    action_id: int,
    payload: VerifierEfficaciteRequest,
    verificateur: Utilisateur,
) -> Action:
    """
    Enregistre la vérification d'efficacité d'une action close.

    La vérification confirme que l'action a produit l'effet attendu.
    Réservée aux préparateurs et à la direction.

    Raises:
        HTTPException 400 — action non close.
        HTTPException 403 — droits insuffisants.
    """
    if not verificateur.peut("delete", "action"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification d'efficacité réservée aux préparateurs et à la direction.",
        )

    action = _get_ou_404(db, action_id)

    if action.statut != StatutAction.close:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La vérification d'efficacité ne s'applique qu'aux actions closes.",
        )

    action.efficacite_verifiee = payload.efficacite_verifiee
    action.commentaire_verification = payload.commentaire_verification
    if not action.verificateur_id:
        action.verificateur_id = verificateur.id

    db.commit()
    db.refresh(action)

    logger.info(
        "Efficacité vérifiée pour %s : %s par %s",
        action.reference,
        "efficace" if payload.efficacite_verifiee else "non efficace",
        verificateur.email,
    )
    action.processus_nom = action.processus.nom if action.processus else None
    return action
