"""
seeder.py — Données initiales au démarrage FastAPI

Contient uniquement les données structurelles stables :
  - Référentiel normatif ISO 9001:2015 (clauses)
  - Parties intéressées de base
  - Compte administrateur par défaut

Les processus sont désormais créés dynamiquement via l'API (POST /processus).
"""

import logging
from sqlalchemy.orm import Session

from app.models.clause_iso import ClauseISO
from app.models.processus import PartieInteressee
from app.models.utilisateur import Utilisateur, RoleEnum
from app.data.clauses_iso_seed import CLAUSES_ISO_SEED
from app.data.parties_interessees_seed import PARTIES_INTERESSEES_SEED
from app.core.security import hash_password  # à implémenter dans security.py

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# §1 — Référentiel ISO 9001:2015
# ---------------------------------------------------------------------------


def seed_clauses_iso(db: Session) -> None:
    """
    Insère les 93 clauses normatives ISO 9001:2015 (sections 4→10, 3 niveaux).
    Idempotent : ignoré si les clauses existent déjà.
    """
    existing = db.query(ClauseISO).count()
    if existing > 0:
        logger.info("seed_clauses_iso : %d clauses déjà présentes — ignoré.", existing)
        return

    # Passe 1 : insérer sans parent_id pour avoir les IDs
    code_to_obj: dict[str, ClauseISO] = {}
    for item in CLAUSES_ISO_SEED:
        clause = ClauseISO(
            code=item["code"],
            titre=item["titre"],
            description=item.get("description"),
            niveau=item["niveau"],
            est_applicable=item.get("est_applicable", True),
            parent_id=None,
        )
        db.add(clause)
        code_to_obj[item["code"]] = clause

    db.flush()  # génère les IDs sans commit

    # Passe 2 : résoudre parent_id
    for item in CLAUSES_ISO_SEED:
        parent_code = item.get("parent_code")
        if parent_code and parent_code in code_to_obj:
            code_to_obj[item["code"]].parent_id = code_to_obj[parent_code].id

    db.commit()
    logger.info("seed_clauses_iso : %d clauses insérées.", len(CLAUSES_ISO_SEED))


# ---------------------------------------------------------------------------
# §2 — Parties intéressées
# ---------------------------------------------------------------------------


def seed_parties_interessees(db: Session) -> None:
    """
    Insère les parties intéressées de base (Ministère, ATRST, Direction...).
    Idempotent : ignoré si au moins une partie existe déjà.

    Note : des parties intéressées supplémentaires peuvent être ajoutées
    dynamiquement via l'API (POST /parties-interessees).
    """
    existing = db.query(PartieInteressee).count()
    if existing > 0:
        logger.info(
            "seed_parties_interessees : %d parties déjà présentes — ignoré.", existing
        )
        return

    for item in PARTIES_INTERESSEES_SEED:
        partie = PartieInteressee(
            nom=item["nom"],
            type=item.get("type"),
            description=item.get("description"),
            exigences=item.get("exigences"),
        )
        db.add(partie)

    db.commit()
    logger.info(
        "seed_parties_interessees : %d parties insérées.", len(PARTIES_INTERESSEES_SEED)
    )


# ---------------------------------------------------------------------------
# §3 — Compte administrateur par défaut
# ---------------------------------------------------------------------------


def seed_admin_user(db: Session) -> None:
    """
    Crée le compte admin initial si aucun utilisateur n'existe.
    Mot de passe : défini via la variable d'environnement ADMIN_DEFAULT_PASSWORD
    (fallback : 'changeme' en développement uniquement).
    """
    existing = db.query(Utilisateur).count()
    if existing > 0:
        logger.info("seed_admin_user : utilisateurs déjà présents — ignoré.")
        return

    import os

    password_plain = "my_password"  # Valeur par défaut pour le développement

    admin = Utilisateur(
        email="admin@si-smq.local",
        nom="Administrateur",
        prenom="SI-SMQ",
        role=RoleEnum.admin,
        est_actif=True,
        hashed_password=hash_password(str(password_plain)[:72]),
    )
    db.add(admin)
    db.commit()
    logger.info("seed_admin_user : compte admin créé (admin@si-smq.local).")


# ---------------------------------------------------------------------------
# Point d'entrée principal
# ---------------------------------------------------------------------------


def run_all_seeders(db: Session) -> None:
    """
    Appelé une fois au démarrage FastAPI (lifespan ou @app.on_event).
    Ordre : clauses → parties → admin.
    Les processus ne sont PAS seedés : ils sont créés via l'API.
    """
    logger.info("=== Démarrage des seeders SI-SMQ ===")
    seed_clauses_iso(db)
    seed_parties_interessees(db)
    seed_admin_user(db)
    logger.info("=== Seeders terminés ===")
