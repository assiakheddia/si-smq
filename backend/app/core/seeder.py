"""
backend/app/core/seeder.py

Chargement initial des données de référence au démarrage de l'application.
Idempotent : ne réinsère pas si les données existent déjà.
Appelé depuis app/main.py dans l'événement @app.on_event("startup").
"""

from sqlalchemy.orm import Session

from app.models.clause_iso import ClauseISO
from app.models.processus import Processus, PartieInteressee, TypeProcessus, FrequenceCycle

from app.data.clauses_iso_seed import CLAUSES_ISO_9001_2015
from app.data.processus_seed import PROCESSUS_SEED
from app.data.parties_interessees_seed import PARTIES_INTERESSEES_SEED


# =============================================================================
# SEED — Clauses ISO 9001:2015
# =============================================================================

def seed_clauses_iso(db: Session) -> None:
    if db.query(ClauseISO).count() > 0:
        return

    code_to_id: dict[str, int] = {}

    for entry in CLAUSES_ISO_9001_2015:
        parent_id = None
        if entry["parent_code"] is not None:
            parent_id = code_to_id.get(entry["parent_code"])
            if parent_id is None:
                raise ValueError(
                    f"[Seeder] Parent introuvable pour la clause {entry['code']} "
                    f"(parent_code={entry['parent_code']})."
                )

        clause = ClauseISO(
            code=entry["code"],
            titre=entry["titre"],
            description=entry.get("description"),
            parent_id=parent_id,
            niveau=entry["niveau"],
            ordre=entry["ordre"],
            est_feuille=entry["est_feuille"],
            est_applicable=True,
        )
        db.add(clause)
        db.flush()
        code_to_id[entry["code"]] = clause.id

    db.commit()
    print(f"[Seeder] {len(CLAUSES_ISO_9001_2015)} clauses ISO 9001:2015 insérées.")


# =============================================================================
# SEED — Parties Intéressées
# =============================================================================

def seed_parties_interessees(db: Session) -> None:
    if db.query(PartieInteressee).count() > 0:
        return

    for entry in PARTIES_INTERESSEES_SEED:
        partie = PartieInteressee(
            nom=entry["nom"],
            type=entry["type"],
            description=entry.get("description"),
            exigences=entry.get("exigences"),
            est_actif=True,
        )
        db.add(partie)

    db.commit()
    print(f"[Seeder] {len(PARTIES_INTERESSEES_SEED)} parties intéressées insérées.")


# =============================================================================
# SEED — Processus (issus des deux BPMN)
# =============================================================================

def seed_processus(db: Session) -> None:
    if db.query(Processus).count() > 0:
        return

    def _create_processus(entry: dict, parent_id: int | None = None) -> Processus:
        proc = Processus(
            code=entry["code"],
            nom=entry["nom"],
            objectif=entry.get("objectif"),
            type=TypeProcessus(entry["type"]),
            frequence_cycle=FrequenceCycle(entry.get("frequence_cycle", "annuel")),
            declencheur=entry.get("declencheur"),
            entrees=entry.get("entrees"),
            sorties=entry.get("sorties"),
            ressources_cles=entry.get("ressources_cles"),
            parent_id=parent_id,
            ordre=entry.get("ordre", 0),
            est_actif=True,
        )
        db.add(proc)
        db.flush()

        for i, sous in enumerate(entry.get("sous_processus", []), start=1):
            sous["ordre"] = i
            _create_processus(sous, parent_id=proc.id)

        return proc

    for i, entry in enumerate(PROCESSUS_SEED, start=1):
        entry["ordre"] = i
        _create_processus(entry)

    db.commit()
    total = db.query(Processus).count()
    print(f"[Seeder] {total} processus insérés (racines + sous-processus).")


# =============================================================================
# POINT D'ENTRÉE UNIQUE
# =============================================================================

def seed_admin_user(db: Session) -> None:
    """
    Crée un compte admin par défaut si aucun admin n'existe.
    Mot de passe initial à changer obligatoirement à la première connexion.

    Credentials par défaut (dev uniquement) :
      email    : admin@si-smq.local
      password : Admin@SMQ2025!   ← à changer immédiatement en prod
    """
    from app.models.utilisateur import Utilisateur, RoleEnum
    from app.core.security import hash_password  # passlib bcrypt

    existe = db.query(Utilisateur).filter(
        Utilisateur.role == RoleEnum.admin
    ).first()

    if existe:
        return

    admin = Utilisateur(
        nom="Administrateur",
        prenom="SI-SMQ",
        email="admin@si-smq.local",
        hashed_password=hash_password("Admin@SMQ2025!"),
        role=RoleEnum.admin,
        poste="Administrateur Système",
        departement="Direction Qualité",
        est_actif=True,
    )
    db.add(admin)
    db.commit()
    print("[Seeder] Compte admin créé → admin@si-smq.local (changer le mot de passe !)")


def run_all_seeders(db: Session) -> None:
    """
    Ordre :
      1. Clauses ISO    (aucune dépendance)
      2. Parties        (aucune dépendance)
      3. Admin user     (aucune dépendance)
      4. Processus      (pilote_id = NULL au seed, assigné via interface admin)
    """
    seed_clauses_iso(db)
    seed_parties_interessees(db)
    seed_admin_user(db)
    seed_processus(db)