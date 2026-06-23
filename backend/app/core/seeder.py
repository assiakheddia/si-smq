"""
seeder.py — Données initiales au démarrage FastAPI

Contient uniquement les données structurelles stables :
  - Référentiel normatif ISO 9001:2015 (clauses)
  - Parties intéressées de base
  - Compte administrateur par défaut
  - Données de démonstration (processus, diagnostics, risques, actions)
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.clause_iso import ClauseISO
from app.models.processus import Processus, PartieInteressee, TypeProcessus, StatutProcessus, FrequenceCycle
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.diagnostic import DiagnosticISO, StatutDiagnostic, NiveauMaturite
from app.models.risque import Risque, NiveauCriticite, StatutRisque, TypeRisque, StrategieTraitement
from app.models.action import Action, StatutAction, PrioriteAction, TypeAction, OrigineAction
from app.data.clauses_iso_seed import CLAUSES_ISO_SEED
from app.data.parties_interessees_seed import PARTIES_INTERESSEES_SEED
from app.core.security import hash_password

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
# §4 — Données de démonstration
# ---------------------------------------------------------------------------

def seed_demo_data(db: Session) -> None:
    """
    Insère des données réalistes pour la démonstration.
    Idempotent : ignoré si PROC-001 existe déjà.
    """
    if db.query(Processus).filter(Processus.code == "PROC-001").first():
        logger.info("seed_demo_data : données démo déjà présentes — ignoré.")
        return

    # --- Utilisateurs supplémentaires ---
    pilote = Utilisateur(
        email="leila.bensalem@si-smq.local",
        nom="Bensalem", prenom="Leila",
        role=RoleEnum.pilote, est_actif=True,
        departement="Qualité", poste="Directrice Qualité",
        hashed_password=hash_password("demo1234"),
    )
    auditeur = Utilisateur(
        email="karim.hadj@si-smq.local",
        nom="Hadj", prenom="Karim",
        role=RoleEnum.auditeur, est_actif=True,
        departement="Audit", poste="Auditeur Interne",
        hashed_password=hash_password("demo1234"),
    )
    contributeur = Utilisateur(
        email="sara.meziane@si-smq.local",
        nom="Meziane", prenom="Sara",
        role=RoleEnum.contributeur, est_actif=True,
        departement="Processus", poste="Chargée de Processus",
        hashed_password=hash_password("demo1234"),
    )
    db.add_all([pilote, auditeur, contributeur])
    db.flush()

    # --- Processus ---
    now = datetime.utcnow()
    proc_data = [
        dict(code="PROC-001", nom="Pilotage Stratégique",
             type=TypeProcessus.strategique, statut=StatutProcessus.conforme,
             objectif="Définir et déployer la politique qualité ISO 9001",
             frequence_cycle=FrequenceCycle.annuel, score_maturite=88.0,
             pilote_id=pilote.id,
             declencheur="Revue de direction annuelle",
             entrees="Politique qualité, objectifs stratégiques",
             sorties="Plan d'amélioration, indicateurs validés"),
        dict(code="PROC-002", nom="Gestion des Achats",
             type=TypeProcessus.operationnel, statut=StatutProcessus.en_cours,
             objectif="Maîtriser les achats conformément aux exigences ISO §8.4",
             frequence_cycle=FrequenceCycle.trimestriel, score_maturite=72.0,
             pilote_id=pilote.id,
             declencheur="Besoin d'approvisionnement validé",
             entrees="Bon de commande, cahier des charges fournisseur",
             sorties="Marchandises réceptionnées, fournisseurs évalués"),
        dict(code="PROC-003", nom="Encadrement Doctoral",
             type=TypeProcessus.operationnel, statut=StatutProcessus.en_cours,
             objectif="Assurer le suivi et la soutenance des doctorants",
             frequence_cycle=FrequenceCycle.semestriel, score_maturite=65.0,
             pilote_id=pilote.id,
             declencheur="Inscription d'un doctorant validée",
             entrees="Dossier inscription, PV commission doctorale",
             sorties="Rapport d'avancement, PV soutenance, attestation"),
        dict(code="PROC-004", nom="Gestion des Ressources Humaines",
             type=TypeProcessus.support, statut=StatutProcessus.conforme,
             objectif="Garantir les compétences et la disponibilité du personnel",
             frequence_cycle=FrequenceCycle.annuel, score_maturite=78.0,
             pilote_id=pilote.id,
             declencheur="Évaluation annuelle ou recrutement",
             entrees="Fiches de poste, plan de formation",
             sorties="Compétences certifiées, personnel formé"),
        dict(code="PROC-005", nom="Maîtrise des Documents",
             type=TypeProcessus.support, statut=StatutProcessus.non_conforme,
             objectif="Contrôler la création, révision et diffusion des documents ISO",
             frequence_cycle=FrequenceCycle.continu, score_maturite=45.0,
             pilote_id=pilote.id,
             declencheur="Création ou révision d'un document qualité",
             entrees="Projet de document, demande de révision",
             sorties="Document approuvé, liste maîtrisée à jour"),
        dict(code="PROC-006", nom="Gestion Financière",
             type=TypeProcessus.support, statut=StatutProcessus.conforme,
             objectif="Suivre et contrôler le budget annuel du laboratoire",
             frequence_cycle=FrequenceCycle.annuel, score_maturite=82.0,
             pilote_id=pilote.id,
             declencheur="Notification budgétaire annuelle du Ministère",
             entrees="Budget alloué, notifications Ministère",
             sorties="Bilan financier, situation dépenses"),
    ]
    processus_objs = []
    for d in proc_data:
        p = Processus(**d)
        db.add(p)
        processus_objs.append(p)
    db.flush()

    p1, p2, p3, p4, p5, p6 = processus_objs

    # --- Diagnostics ---
    def _niveau(score):
        if score >= 75: return NiveauMaturite.conforme
        if score >= 50: return NiveauMaturite.avance
        if score >= 25: return NiveauMaturite.partiel
        return NiveauMaturite.non_conforme

    diag_data = [
        dict(processus_id=p1.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-001", score_global=88.0,
             statut=StatutDiagnostic.valide, periode_couverte="2025-ANNUEL",
             date_diagnostic=now - timedelta(days=30),
             date_validation=now - timedelta(days=25),
             commentaire_global="Pilotage conforme. Axes d'amélioration sur la communication interne."),
        dict(processus_id=p2.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-002", score_global=72.0,
             statut=StatutDiagnostic.valide, periode_couverte="2025-T1",
             date_diagnostic=now - timedelta(days=45),
             date_validation=now - timedelta(days=40),
             commentaire_global="Processus achats avancé. Traçabilité fournisseurs à renforcer."),
        dict(processus_id=p3.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-003", score_global=65.0,
             statut=StatutDiagnostic.soumis, periode_couverte="2025-S1",
             date_diagnostic=now - timedelta(days=10),
             date_validation=None,
             commentaire_global="Suivi doctoral partiel. Rapports semestriels non systématiques."),
        dict(processus_id=p4.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-004", score_global=78.0,
             statut=StatutDiagnostic.valide, periode_couverte="2025-ANNUEL",
             date_diagnostic=now - timedelta(days=60),
             date_validation=now - timedelta(days=55),
             commentaire_global="RH conforme. Plan de formation déployé à 90%."),
        dict(processus_id=p5.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-005", score_global=45.0,
             statut=StatutDiagnostic.soumis, periode_couverte="2025-T1",
             date_diagnostic=now - timedelta(days=5),
             date_validation=None,
             commentaire_global="Maîtrise documentaire insuffisante. GED non déployée."),
        dict(processus_id=p6.id, auditeur_id=auditeur.id,
             reference="DIAG-2025-006", score_global=82.0,
             statut=StatutDiagnostic.valide, periode_couverte="2025-ANNUEL",
             date_diagnostic=now - timedelta(days=20),
             date_validation=now - timedelta(days=15),
             commentaire_global="Gestion financière conforme. Tableau de bord budgétaire opérationnel."),
    ]
    for d in diag_data:
        diag = DiagnosticISO(niveau_global=_niveau(d["score_global"]), **d)
        db.add(diag)

    # --- Risques ---
    risque_data = [
        dict(processus_id=p2.id, responsable_id=pilote.id,
             reference="RSQ-2025-001",
             titre="Dépassement budgétaire sans appel d'offres",
             type=TypeRisque.financier,
             probabilite=4, gravite=5, detectabilite=3, rpn=60.0,
             criticite=NiveauCriticite.eleve, statut=StatutRisque.traitement,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Mise en place d'alertes à 80% du seuil budgétaire",
             date_identification=now - timedelta(days=40)),
        dict(processus_id=p5.id, responsable_id=pilote.id,
             reference="RSQ-2025-002",
             titre="Documents qualité non maîtrisés — versions obsolètes en circulation",
             type=TypeRisque.documentaire,
             probabilite=5, gravite=5, detectabilite=4, rpn=100.0,
             criticite=NiveauCriticite.critique, statut=StatutRisque.identifie,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Déploiement GED avec contrôle de version automatique",
             date_identification=now - timedelta(days=5)),
        dict(processus_id=p3.id, responsable_id=pilote.id,
             reference="RSQ-2025-003",
             titre="Retard dans les rapports d'avancement doctoral",
             type=TypeRisque.operationnel,
             probabilite=4, gravite=3, detectabilite=2, rpn=24.0,
             criticite=NiveauCriticite.modere, statut=StatutRisque.surveillance,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Rappels automatiques semestriels aux encadrants",
             date_identification=now - timedelta(days=60)),
        dict(processus_id=p1.id, responsable_id=pilote.id,
             reference="RSQ-2025-004",
             titre="Non-conformité lors de l'audit de certification externe",
             type=TypeRisque.reglementaire,
             probabilite=2, gravite=5, detectabilite=2, rpn=20.0,
             criticite=NiveauCriticite.faible, statut=StatutRisque.surveillance,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Programme d'audits internes trimestriels",
             date_identification=now - timedelta(days=90)),
        dict(processus_id=p4.id, responsable_id=pilote.id,
             reference="RSQ-2025-005",
             titre="Compétences clés non documentées — risque départ personnel",
             type=TypeRisque.humain,
             probabilite=3, gravite=4, detectabilite=3, rpn=36.0,
             criticite=NiveauCriticite.modere, statut=StatutRisque.traitement,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Cartographie des compétences et plan de succession",
             date_identification=now - timedelta(days=30)),
        dict(processus_id=p5.id, responsable_id=pilote.id,
             reference="RSQ-2025-006",
             titre="Perte de traçabilité des enregistrements qualité",
             type=TypeRisque.qualite,
             probabilite=5, gravite=4, detectabilite=4, rpn=80.0,
             criticite=NiveauCriticite.critique, statut=StatutRisque.identifie,
             strategie=StrategieTraitement.reduction,
             plan_attenuation="Archivage électronique sécurisé avec sauvegarde",
             date_identification=now - timedelta(days=3)),
        dict(processus_id=p2.id, responsable_id=pilote.id,
             reference="RSQ-2025-007",
             titre="Fournisseur stratégique unique sans alternative",
             type=TypeRisque.operationnel,
             probabilite=3, gravite=4, detectabilite=2, rpn=24.0,
             criticite=NiveauCriticite.modere, statut=StatutRisque.analyse,
             strategie=StrategieTraitement.transfert,
             plan_attenuation="Identification et qualification de 2 fournisseurs alternatifs",
             date_identification=now - timedelta(days=20)),
        dict(processus_id=p6.id, responsable_id=pilote.id,
             reference="RSQ-2025-008",
             titre="Délai de remboursement Ministère > 90 jours",
             type=TypeRisque.financier,
             probabilite=4, gravite=3, detectabilite=2, rpn=24.0,
             criticite=NiveauCriticite.modere, statut=StatutRisque.surveillance,
             strategie=StrategieTraitement.acceptation,
             plan_attenuation="Suivi mensuel des remboursements avec relance formelle",
             date_identification=now - timedelta(days=50)),
    ]
    for d in risque_data:
        db.add(Risque(**d))
    db.flush()

    # --- Actions correctives ---
    action_data = [
        dict(processus_id=p5.id, responsable_id=pilote.id,
             verificateur_id=auditeur.id,
             reference="ACT-2025-001",
             titre="Déployer la GED — solution de gestion documentaire",
             description="Mettre en place un système de gestion électronique des documents avec contrôle des versions.",
             type=TypeAction.corrective, priorite=PrioriteAction.critique,
             statut=StatutAction.en_cours, origine=OrigineAction.diagnostic,
             avancement=35,
             date_planifiee=now + timedelta(days=30),
             date_echeance=now + timedelta(days=60)),
        dict(processus_id=p2.id, responsable_id=contributeur.id,
             verificateur_id=pilote.id,
             reference="ACT-2025-002",
             titre="Mettre en place le tableau de bord achats avec alertes budgétaires",
             description="Créer un tableau de suivi mensuel des dépenses avec alerte automatique à 80% du seuil.",
             type=TypeAction.preventive, priorite=PrioriteAction.haute,
             statut=StatutAction.planifiee, origine=OrigineAction.risque,
             avancement=0,
             date_planifiee=now + timedelta(days=15),
             date_echeance=now + timedelta(days=45)),
        dict(processus_id=p3.id, responsable_id=contributeur.id,
             verificateur_id=pilote.id,
             reference="ACT-2025-003",
             titre="Automatiser les rappels de rapports semestriels",
             description="Configurer des notifications automatiques 30 jours avant l'échéance de chaque rapport.",
             type=TypeAction.corrective, priorite=PrioriteAction.normale,
             statut=StatutAction.en_cours, origine=OrigineAction.diagnostic,
             avancement=60,
             date_planifiee=now - timedelta(days=10),
             date_echeance=now + timedelta(days=20)),
        dict(processus_id=p4.id, responsable_id=pilote.id,
             verificateur_id=auditeur.id,
             reference="ACT-2025-004",
             titre="Cartographier les compétences clés du laboratoire",
             description="Identifier et documenter les compétences critiques et établir un plan de succession.",
             type=TypeAction.preventive, priorite=PrioriteAction.normale,
             statut=StatutAction.en_verification, origine=OrigineAction.risque,
             avancement=100,
             date_planifiee=now - timedelta(days=30),
             date_echeance=now - timedelta(days=5),
             date_realisation=now - timedelta(days=5)),
        dict(processus_id=p1.id, responsable_id=auditeur.id,
             verificateur_id=pilote.id,
             reference="ACT-2025-005",
             titre="Planifier le programme d'audits internes 2025",
             description="Élaborer et valider le programme annuel d'audits internes couvrant tous les processus.",
             type=TypeAction.amelioration, priorite=PrioriteAction.haute,
             statut=StatutAction.close, origine=OrigineAction.revue_direction,
             avancement=100,
             date_planifiee=now - timedelta(days=60),
             date_echeance=now - timedelta(days=20),
             date_realisation=now - timedelta(days=22),
             efficacite_verifiee=True,
             commentaire_verification="Programme d'audits validé et communiqué à tous les pilotes."),
    ]
    for d in action_data:
        db.add(Action(**d))

    db.commit()
    logger.info("seed_demo_data : données de démonstration insérées avec succès.")


# ---------------------------------------------------------------------------
# Point d'entrée principal
# ---------------------------------------------------------------------------


def run_all_seeders(db: Session) -> None:
    """
    Appelé une fois au démarrage FastAPI (lifespan ou @app.on_event).
    Ordre : clauses → parties → admin → démo.
    """
    logger.info("=== Démarrage des seeders SI-SMQ ===")
    seed_clauses_iso(db)
    seed_parties_interessees(db)
    seed_admin_user(db)
    seed_demo_data(db)
    logger.info("=== Seeders terminés ===")
