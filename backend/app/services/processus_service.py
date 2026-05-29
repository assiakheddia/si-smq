"""
services/processus_service.py — Gestion des processus (dynamique)

Responsabilités :
  - CRUD complet des processus (création dynamique via API)
  - Assignation de pilote
  - Association parties intéressées
  - Calcul score de maturité (depuis diagnostics existants)
  - Validation structure ISO (via iso_engine)

Conventions :
  - Codes processus normalisés en majuscules : PROC-LABO-ACHAT
  - Max 3 niveaux hiérarchiques (racine + 2 niveaux enfants)
  - FK parent SET NULL à la suppression (jamais CASCADE)
"""

from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import valider_processus_iso
from app.models.processus import PartieInteressee, Processus
from app.models.utilisateur import Utilisateur
from app.schemas.processus import (
    AssignerPilote,
    AssocierParties,
    ProcessusCreate,
    ProcessusUpdate,
)

logger = logging.getLogger(__name__)

_MAX_NIVEAUX = 3


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_ou_404(db: Session, processus_id: int) -> Processus:
    p = db.query(Processus).filter(Processus.id == processus_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus {processus_id} introuvable.",
        )
    return p


def _code_existe(db: Session, code: str, exclude_id: int | None = None) -> bool:
    q = db.query(Processus).filter(Processus.code == code)
    if exclude_id:
        q = q.filter(Processus.id != exclude_id)
    return q.first() is not None


def _profondeur(db: Session, processus_id: int) -> int:
    """Calcule le niveau hiérarchique (1 = racine)."""
    niveau = 1
    p = db.query(Processus).filter(Processus.id == processus_id).first()
    while p and p.parent_id:
        niveau += 1
        p = db.query(Processus).filter(Processus.id == p.parent_id).first()
    return niveau


def _valider_profondeur_parent(db: Session, parent_id: int) -> None:
    """Vérifie que l'ajout d'un enfant ne dépasse pas MAX_NIVEAUX."""
    profondeur_parent = _profondeur(db, parent_id)
    if profondeur_parent >= _MAX_NIVEAUX:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Profondeur maximale atteinte ({_MAX_NIVEAUX} niveaux). "
                "Impossible d'ajouter un sous-processus."
            ),
        )


# ---------------------------------------------------------------------------
# §1 — Création
# ---------------------------------------------------------------------------

def creer_processus(
    db: Session,
    payload: ProcessusCreate,
    createur: Utilisateur,
) -> Processus:
    """
    Crée un nouveau processus.

    - Code normalisé en majuscules (validator Pydantic)
    - Unicité du code vérifiée
    - Profondeur max 3 niveaux vérifiée si parent_id fourni
    - Pilote optionnel à la création

    Raises:
        HTTPException 409 — code déjà existant.
        HTTPException 400 — profondeur max dépassée.
        HTTPException 404 — parent_id ou pilote_id introuvable.
    """
    if _code_existe(db, payload.code):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un processus avec le code '{payload.code}' existe déjà.",
        )

    if payload.parent_id:
        _get_ou_404(db, payload.parent_id)  # vérifie existence parent
        _valider_profondeur_parent(db, payload.parent_id)

    pilote = None
    if payload.pilote_id:
        pilote = db.query(Utilisateur).filter(Utilisateur.id == payload.pilote_id).first()
        if not pilote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pilote (utilisateur {payload.pilote_id}) introuvable.",
            )

    processus = Processus(
        code=payload.code,
        nom=payload.nom,
        description=payload.description,
        objectif=payload.objectif,
        entrees=payload.entrees,
        sorties=payload.sorties,
        parent_id=payload.parent_id,
        pilote_id=pilote.id if pilote else None,
    )
    db.add(processus)
    db.commit()
    db.refresh(processus)

    logger.info(
        "Processus créé : %s (%s) par %s",
        processus.code, processus.nom, createur.email,
    )
    return processus


# ---------------------------------------------------------------------------
# §2 — Lecture
# ---------------------------------------------------------------------------

def lister_processus(
    db: Session,
    parent_id: int | None = None,
    racines_seulement: bool = False,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    """
    Liste les processus avec filtres optionnels.

    Args:
        parent_id: filtre sur le parent direct.
        racines_seulement: si True, retourne uniquement les processus sans parent.
        page / taille_page: pagination.
    """
    q = db.query(Processus)

    if racines_seulement:
        q = q.filter(Processus.parent_id.is_(None))
    elif parent_id is not None:
        q = q.filter(Processus.parent_id == parent_id)

    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


def get_processus(db: Session, processus_id: int) -> Processus:
    """Retourne un processus par ID avec ses enfants et parties intéressées."""
    return _get_ou_404(db, processus_id)


def get_processus_par_code(db: Session, code: str) -> Processus:
    """Retourne un processus par code normalisé."""
    p = db.query(Processus).filter(Processus.code == code.upper().strip()).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus avec le code '{code}' introuvable.",
        )
    return p


# ---------------------------------------------------------------------------
# §3 — Mise à jour
# ---------------------------------------------------------------------------

def modifier_processus(
    db: Session,
    processus_id: int,
    payload: ProcessusUpdate,
    modificateur: Utilisateur,
) -> Processus:
    """
    Met à jour partiellement un processus.

    - Le code peut être modifié si pas de doublon
    - Le parent_id peut être modifié si la nouvelle profondeur reste ≤ MAX_NIVEAUX
    - Un processus ne peut pas être son propre parent

    Raises:
        HTTPException 404 — processus introuvable.
        HTTPException 409 — nouveau code déjà existant.
        HTTPException 400 — cycle hiérarchique ou profondeur max.
    """
    processus = _get_ou_404(db, processus_id)

    if payload.code and payload.code != processus.code:
        if _code_existe(db, payload.code, exclude_id=processus_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Le code '{payload.code}' est déjà utilisé.",
            )
        processus.code = payload.code

    if payload.parent_id is not None:
        if payload.parent_id == processus_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un processus ne peut pas être son propre parent.",
            )
        _get_ou_404(db, payload.parent_id)
        _valider_profondeur_parent(db, payload.parent_id)
        processus.parent_id = payload.parent_id

    for champ in ["nom", "description", "objectif", "entrees", "sorties"]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(processus, champ, valeur)

    db.commit()
    db.refresh(processus)

    logger.info("Processus modifié : %s par %s", processus.code, modificateur.email)
    return processus


# ---------------------------------------------------------------------------
# §4 — Suppression
# ---------------------------------------------------------------------------

def supprimer_processus(
    db: Session,
    processus_id: int,
    demandeur: Utilisateur,
) -> dict[str, str]:
    """
    Supprime un processus.

    Les enfants directs voient leur parent_id mis à NULL (SET NULL en cascade).
    Les entités liées (diagnostics, risques, actions, indicateurs, documents)
    conservent leurs données avec FK à NULL — jamais de perte de preuves.

    Raises:
        HTTPException 404 — introuvable.
        HTTPException 403 — non admin.
    """
    if not demandeur.peut("administrer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un administrateur peut supprimer un processus.",
        )

    processus = _get_ou_404(db, processus_id)
    code = processus.code

    # Détacher les enfants directs (SET NULL)
    enfants = db.query(Processus).filter(Processus.parent_id == processus_id).all()
    for enfant in enfants:
        enfant.parent_id = None

    db.delete(processus)
    db.commit()

    logger.info("Processus supprimé : %s par %s", code, demandeur.email)
    return {"message": f"Processus '{code}' supprimé. {len(enfants)} enfant(s) détaché(s)."}


# ---------------------------------------------------------------------------
# §5 — Assignation pilote
# ---------------------------------------------------------------------------

def assigner_pilote(
    db: Session,
    processus_id: int,
    payload: AssignerPilote,
    demandeur: Utilisateur,
) -> Processus:
    """
    Assigne ou réassigne le pilote d'un processus.

    Raises:
        HTTPException 404 — processus ou pilote introuvable.
        HTTPException 403 — rôle insuffisant (admin ou pilote uniquement).
    """
    if not demandeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignation de pilote réservée aux pilotes et administrateurs.",
        )

    processus = _get_ou_404(db, processus_id)

    pilote = db.query(Utilisateur).filter(Utilisateur.id == payload.pilote_id).first()
    if not pilote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur {payload.pilote_id} introuvable.",
        )

    ancien_pilote = processus.pilote_id
    processus.pilote_id = pilote.id
    db.commit()
    db.refresh(processus)

    logger.info(
        "Pilote %s → %s assigné au processus %s par %s",
        ancien_pilote, pilote.email, processus.code, demandeur.email,
    )
    return processus


# ---------------------------------------------------------------------------
# §6 — Parties intéressées
# ---------------------------------------------------------------------------

def associer_parties_interessees(
    db: Session,
    processus_id: int,
    payload: AssocierParties,
    demandeur: Utilisateur,
) -> Processus:
    """
    Remplace la liste des parties intéressées associées au processus.

    Opération de type "set" : les IDs fournis remplacent l'association existante.

    Raises:
        HTTPException 404 — processus introuvable.
        HTTPException 404 — une des parties intéressées introuvable.
        HTTPException 403 — rôle insuffisant.
    """
    if not demandeur.peut("valider"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Association de parties réservée aux pilotes et administrateurs.",
        )

    processus = _get_ou_404(db, processus_id)

    parties = []
    for pid in payload.parties_ids:
        partie = db.query(PartieInteressee).filter(PartieInteressee.id == pid).first()
        if not partie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Partie intéressée {pid} introuvable.",
            )
        parties.append(partie)

    processus.parties_interessees = parties
    db.commit()
    db.refresh(processus)

    logger.info(
        "Parties intéressées mises à jour pour %s : %s",
        processus.code,
        [p.nom for p in parties],
    )
    return processus


# ---------------------------------------------------------------------------
# §7 — Score de maturité
# ---------------------------------------------------------------------------

def get_score_maturite(db: Session, processus_id: int) -> dict:
    """
    Calcule le score de maturité ISO du processus depuis ses diagnostics validés.

    Retourne le score du diagnostic validé le plus récent.
    Si aucun diagnostic validé, retourne None.

    Returns:
        dict avec score_global, niveau, nb_clauses_evaluees, date_diagnostic.
    """
    from app.models.diagnostic import DiagnosticISO, StatutDiagnostic

    processus = _get_ou_404(db, processus_id)

    diagnostic = (
        db.query(DiagnosticISO)
        .filter(
            DiagnosticISO.processus_id == processus_id,
            DiagnosticISO.statut == StatutDiagnostic.valide,
        )
        .order_by(DiagnosticISO.date_creation.desc())
        .first()
    )

    if not diagnostic:
        return {
            "processus_code": processus.code,
            "score_global": None,
            "niveau": None,
            "nb_clauses_evaluees": 0,
            "date_diagnostic": None,
            "message": "Aucun diagnostic validé pour ce processus.",
        }

    validation = valider_processus_iso(
        {
            "pilote_id": processus.pilote_id,
            "objectif": processus.objectif,
            "entrees": processus.entrees,
            "sorties": processus.sorties,
        }
    )

    return {
        "processus_code": processus.code,
        "score_global": diagnostic.score_global,
        "niveau": diagnostic.niveau_global,
        "nb_clauses_evaluees": len(diagnostic.clauses),
        "date_diagnostic": diagnostic.date_creation,
        "prerequis_iso_valides": validation.get("valide", False),
        "prerequis_manquants": validation.get("manquants", []),
    }
    
    
# def evaluer_clause_diagnostic(db: Session, diag_clause_id: int, constat_utilisateur: str):
#     # 1. On récupère la ligne de diagnostic de la clause
#     diag_clause = db.query(DiagnosticClause).filter(DiagnosticClause.id == diag_clause_id).first()
#     processus_id = diag_clause.diagnostic.processus_id
    
#     # 2. On extrait la fiche processus complète depuis la BDD via le service dédié
#     fiche_contexte = extraire_fiche_processus_contexte(db, processus_id)
    
#     # 3. L'ISO Engine tourne de manière dynamique
#     analyse_ia = iso_engine.analyser_conformite_fiche(
#         clause_code=diag_clause.clause.code,
#         clause_texte=diag_clause.clause.texte,
#         fiche_processus=fiche_contexte,
#         constat_terrain=constat_utilisateur
#     )
    
#     # 4. On enregistre le résultat analytique en BDD
#     diag_clause.constat = constat_utilisateur
#     diag_clause.type_ecart = analyse_ia.type_ecart # "Aucun", "Mineur", "Majeur"
#     diag_clause.recommandation = analyse_ia.recommandation
#     diag_clause.conforme = analyse_ia.conforme
    
#     db.commit()
#     return diag_clause