"""
seeder.py — Données initiales au démarrage FastAPI

Contient uniquement les données structurelles stables :
  - Référentiel normatif ISO 9001:2015 (clauses)
  - Parties intéressées de base
  - Compte administrateur par défaut
  - Données de démonstration alignées sur les deux BPMN :
      PROC-LABO  : Gestion du Laboratoire (budget, intégration, achats, KPI)
      PROC-DOC   : Encadrement Doctoral (inscription, avancement, soutenance)
"""

import logging
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.iso_engine import calcul_score_global, score_to_niveau, score_to_type_ecart
from app.models.clause_iso import ClauseISO
from app.models.processus import Processus, PartieInteressee, TypeProcessus, StatutProcessus, FrequenceCycle
from app.models.utilisateur import Utilisateur, RoleEnum
from app.models.diagnostic import DiagnosticClause, DiagnosticISO, StatutDiagnostic, NiveauMaturite
from app.models.risque import Risque, NiveauCriticite, StatutRisque, TypeRisque, StrategieTraitement
from app.models.action import Action, StatutAction, PrioriteAction, TypeAction, OrigineAction
from app.models.indicateur import (
    Indicateur, MesureKPI,
    UniteKPI, FrequenceMesure, SourceKPI, SensKPI, StatutAlerte, FormulaKPI,
)
from app.models.processus_revision import ProcessusRevision, StatutRevision
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

    db.flush()

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
    """
    existing = db.query(Utilisateur).count()
    if existing > 0:
        logger.info("seed_admin_user : utilisateurs déjà présents — ignoré.")
        return

    admin = Utilisateur(
        email="admin@si-smq.local",
        nom="Administrateur",
        prenom="SI-SMQ",
        role=RoleEnum.direction,
        est_actif=True,
        hashed_password=hash_password("my_password"),
    )
    db.add(admin)
    db.commit()
    logger.info("seed_admin_user : compte admin créé (admin@si-smq.local).")


# ---------------------------------------------------------------------------
# §4 — Données de démonstration alignées sur les BPMN
# ---------------------------------------------------------------------------


def _niveau_maturite(score: float) -> NiveauMaturite:
    if score >= 75:
        return NiveauMaturite.conforme
    if score >= 50:
        return NiveauMaturite.avance
    if score >= 25:
        return NiveauMaturite.partiel
    return NiveauMaturite.non_conforme


def _generer_clauses_diagnostic(
    db: Session, diagnostic: DiagnosticISO, score_cible: float, clauses_iso: list,
) -> None:
    """
    Génère une DiagnosticClause par clause applicable, avec un score individuel
    dispersé autour de score_cible (±20, clampé 0-100) — pour que score_global,
    nb_clauses_evaluees et nb_ecarts_majeurs/mineurs soient des valeurs réelles
    calculées depuis le détail, pas des chiffres fixés à la main.
    """
    rng = random.Random(diagnostic.reference)
    clauses_evaluees = []
    for clause in clauses_iso:
        score = max(0.0, min(100.0, rng.gauss(score_cible, 15)))
        dc = DiagnosticClause(
            diagnostic_id=diagnostic.id,
            clause_id=clause.id,
            score=score,
            niveau=_niveau_maturite(score),
            type_ecart=score_to_type_ecart(score),
            poids=1.0,
            est_applicable=True,
            est_evalue=True,
        )
        db.add(dc)
        clauses_evaluees.append(dc)

    diagnostic.score_global = calcul_score_global(clauses_evaluees)
    diagnostic.niveau_global = score_to_niveau(diagnostic.score_global)


def _statut_alerte(valeur: float, seuil_attention: float, seuil_alerte: float, sens: str) -> StatutAlerte:
    if sens == "hausse":
        if valeur < seuil_alerte:
            return StatutAlerte.alerte
        if valeur < seuil_attention:
            return StatutAlerte.attention
    else:  # baisse ou cible interprété comme baisse
        if valeur > seuil_alerte:
            return StatutAlerte.alerte
        if valeur > seuil_attention:
            return StatutAlerte.attention
    return StatutAlerte.normal


def seed_demo_data(db: Session) -> None:
    """
    Insère des données réalistes alignées sur les deux diagrammes BPMN :
      PROC-LABO — Gestion du Laboratoire (budget, intégration, achats, KPI annuel)
      PROC-DOC  — Encadrement Doctoral (inscription, avancement, soutenance)

    Idempotent : ignoré si PROC-LABO existe déjà.
    """
    if db.query(Processus).filter(Processus.code == "PROC-001").first():
        logger.info("seed_demo_data : données démo déjà présentes — ignoré.")
        return

    now = datetime.utcnow()

    # -------------------------------------------------------------------------
    # Utilisateurs
    # -------------------------------------------------------------------------
    directeur = Utilisateur(
        email="directeur@si-smq.local",
        nom="Boumediene", prenom="Mourad",
        role=RoleEnum.direction, est_actif=True,
        departement="Direction", poste="Directeur du Laboratoire",
        hashed_password=hash_password("demo1234"),
    )
    resp_qualite = Utilisateur(
        email="leila.bensalem@si-smq.local",
        nom="Bensalem", prenom="Leila",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Qualité", poste="Responsable Qualité & SMQ",
        hashed_password=hash_password("demo1234"),
    )
    auditeur_interne = Utilisateur(
        email="karim.hadj@si-smq.local",
        nom="Hadj", prenom="Karim",
        role=RoleEnum.auditeur_interne, est_actif=True,
        departement="Audit", poste="Auditeur Interne",
        hashed_password=hash_password("demo1234"),
    )
    auditeur_interne_2 = Utilisateur(
        email="sofia.amrani@si-smq.local",
        nom="Amrani", prenom="Sofia",
        role=RoleEnum.auditeur_interne, est_actif=True,
        departement="Audit", poste="Auditrice Qualité Interne",
        hashed_password=hash_password("demo1234"),
    )
    chef_equipe = Utilisateur(
        email="ahmed.benali@si-smq.local",
        nom="Benali", prenom="Ahmed",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Équipe Génie Logiciel", poste="Chef d'Équipe de Recherche",
        hashed_password=hash_password("demo1234"),
    )
    dir_these = Utilisateur(
        email="nadia.ferhat@si-smq.local",
        nom="Ferhat", prenom="Nadia",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Équipe Systèmes Distribués", poste="Directrice de Thèse",
        hashed_password=hash_password("demo1234"),
    )
    comptable = Utilisateur(
        email="fatima.kaci@si-smq.local",
        nom="Kaci", prenom="Fatima",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Administration", poste="Responsable Financière",
        hashed_password=hash_password("demo1234"),
    )
    doctorant1 = Utilisateur(
        email="yacine.tlemcani@si-smq.local",
        nom="Tlemcani", prenom="Yacine",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Équipe Systèmes Distribués", poste="Doctorant — 3e année",
        hashed_password=hash_password("demo1234"),
    )
    doctorant2 = Utilisateur(
        email="amira.saadi@si-smq.local",
        nom="Saadi", prenom="Amira",
        role=RoleEnum.preparateur, est_actif=True,
        departement="Équipe Génie Logiciel", poste="Doctorante — 1re année",
        hashed_password=hash_password("demo1234"),
    )
    db.add_all([directeur, resp_qualite, auditeur_interne, auditeur_interne_2, chef_equipe, dir_these, comptable, doctorant1, doctorant2])
    db.flush()

    # =========================================================================
    # BPMN 1 — PROC-LABO : Gestion du Laboratoire
    # Sous-processus : Budget · Intégration Membres · Achats · Bilan KPI
    # =========================================================================
    proc_labo = Processus(
        code="PROC-001",
        nom="Gestion du Laboratoire",
        type=TypeProcessus.support,
        statut=StatutProcessus.en_cours,
        objectif=(
            "Assurer la gestion administrative, financière et humaine du laboratoire "
            "en conformité avec les exigences du Ministère et de l'ATRST."
        ),
        frequence_cycle=FrequenceCycle.annuel,
        score_maturite=74.0,
        pilote_id=directeur.id,
        declencheur="Notification du budget annuel par le Ministère",
        entrees=(
            "Notification budgétaire annuelle du Ministère, "
            "dossiers d'intégration des membres, carnets de recherche, demandes d'achat"
        ),
        sorties=(
            "Liste officielle des membres, bilan KPI annuel, "
            "situation financière transmise au Directeur, rapport bilan soumis à l'ATRST"
        ),
        ressources_cles="Budget alloué, Service des Marchés, Directeur, Comptable, ATRST",
    )
    db.add(proc_labo)
    db.flush()

    proc_budget = Processus(
        code="PROC-002",
        nom="Gestion Budgétaire Annuelle",
        type=TypeProcessus.support,
        statut=StatutProcessus.conforme,
        objectif="Réceptionner, analyser et consolider la notification budgétaire du Ministère.",
        frequence_cycle=FrequenceCycle.annuel,
        score_maturite=82.0,
        pilote_id=comptable.id,
        parent_id=proc_labo.id,
        declencheur="Réception de la notification budgétaire du Ministère",
        entrees="Notification budget annuel, besoins exprimés par les équipes de recherche",
        sorties="Budget consolidé par poste, besoins validés et planifiés pour l'année",
        ressources_cles="Directeur, Comptable, service financier du Ministère",
    )
    proc_integration = Processus(
        code="PROC-003",
        nom="Intégration des Membres",
        type=TypeProcessus.support,
        statut=StatutProcessus.conforme,
        objectif=(
            "Examiner et valider les demandes d'intégration, "
            "mettre à jour la liste officielle des membres du laboratoire."
        ),
        frequence_cycle=FrequenceCycle.ponctuel,
        score_maturite=78.0,
        pilote_id=directeur.id,
        parent_id=proc_labo.id,
        declencheur="Dépôt d'un dossier d'intégration par un nouveau membre",
        entrees="Dossier d'intégration (CV, lettre motivation), liste actuelle des membres",
        sorties="Liste membres mise à jour, notification ATRST si changement majeur",
        ressources_cles="Directeur du laboratoire, commission d'intégration",
    )
    proc_achat = Processus(
        code="PROC-004",
        nom="Gestion des Achats et Dépenses",
        type=TypeProcessus.support,
        statut=StatutProcessus.en_cours,
        objectif=(
            "Traiter les demandes d'achat dans le respect des seuils réglementaires "
            "(appel d'offres obligatoire ou achat direct selon montant)."
        ),
        frequence_cycle=FrequenceCycle.continu,
        score_maturite=62.0,
        pilote_id=comptable.id,
        parent_id=proc_labo.id,
        declencheur="Expression d'un besoin d'achat validé par un chef d'équipe",
        entrees="Carnet de recherche, demande d'achat approuvée, budget disponible par poste",
        sorties="Bon de commande émis, situation financière au Directeur, achat traité ou dossier refusé",
        ressources_cles="Service des Marchés, Directeur (signature), seuils réglementaires appel d'offres",
    )
    proc_kpi = Processus(
        code="PROC-005",
        nom="Bilan et Suivi des KPI Annuels",
        type=TypeProcessus.strategique,
        statut=StatutProcessus.en_cours,
        objectif=(
            "Consolider les KPI annuels du laboratoire, élaborer le bilan "
            "et le soumettre à l'ATRST avec les preuves des processus."
        ),
        frequence_cycle=FrequenceCycle.annuel,
        score_maturite=70.0,
        pilote_id=resp_qualite.id,
        parent_id=proc_labo.id,
        declencheur="Synchronisation des sous-processus en fin de cycle annuel",
        entrees="Rapports des sous-processus, bilan financier, KPI consolidés de l'année",
        sorties="Bilan annuel validé, rapport soumis à l'ATRST, accréditation renouvelée ou cycle relancé",
        ressources_cles="Directeur, ATRST, preuves des processus budget et achats",
    )
    db.add_all([proc_budget, proc_integration, proc_achat, proc_kpi])
    db.flush()

    # =========================================================================
    # BPMN 2 — PROC-DOC : Encadrement Doctoral
    # Sous-processus : Inscription · Suivi Avancement · Soutenance
    # =========================================================================
    proc_doc = Processus(
        code="PROC-006",
        nom="Encadrement Doctoral",
        type=TypeProcessus.operationnel,
        statut=StatutProcessus.en_cours,
        objectif=(
            "Assurer le suivi pédagogique et administratif des doctorants "
            "depuis l'inscription jusqu'à la soutenance."
        ),
        frequence_cycle=FrequenceCycle.semestriel,
        score_maturite=67.0,
        pilote_id=resp_qualite.id,
        declencheur="Inscription d'un nouveau doctorant validée par la commission",
        entrees="Dossier d'inscription, PV de commission doctorale, sujet de thèse validé",
        sorties="Rapports semestriels d'avancement, PV de soutenance, attestation de doctorat",
        ressources_cles="Directeur de thèse, co-encadrant éventuel, commission doctorale, jury",
    )
    db.add(proc_doc)
    db.flush()

    proc_inscription = Processus(
        code="PROC-007",
        nom="Inscription et Affectation",
        type=TypeProcessus.operationnel,
        statut=StatutProcessus.conforme,
        objectif="Valider l'inscription du doctorant, affecter un directeur de thèse et enregistrer le sujet.",
        frequence_cycle=FrequenceCycle.annuel,
        score_maturite=80.0,
        pilote_id=dir_these.id,
        parent_id=proc_doc.id,
        declencheur="Candidature du doctorant déposée auprès de la commission",
        entrees="Dossier de candidature, liste des directeurs disponibles, sujets proposés",
        sorties="Inscription validée, directeur de thèse affecté, sujet enregistré dans le système",
        ressources_cles="Commission doctorale, Directeur de thèse, administration",
    )
    proc_avancement = Processus(
        code="PROC-008",
        nom="Suivi de l'Avancement",
        type=TypeProcessus.operationnel,
        statut=StatutProcessus.en_cours,
        objectif="Assurer le suivi semestriel de l'avancement des travaux et valider les rapports d'étape.",
        frequence_cycle=FrequenceCycle.semestriel,
        score_maturite=60.0,
        pilote_id=dir_these.id,
        parent_id=proc_doc.id,
        declencheur="Échéance semestrielle de rapport d'avancement (S1 : 30 juin / S2 : 31 décembre)",
        entrees="Rapport d'avancement du doctorant, historique des évaluations précédentes",
        sorties="Rapport validé ou retourné pour correction, recommandations du directeur de thèse",
        ressources_cles="Directeur de thèse, co-encadrant",
    )
    proc_soutenance = Processus(
        code="PROC-009",
        nom="Préparation et Soutenance",
        type=TypeProcessus.operationnel,
        statut=StatutProcessus.en_cours,
        objectif=(
            "Organiser la soutenance de thèse : constitution du jury, "
            "dépôt du manuscrit, déroulement et délibération."
        ),
        frequence_cycle=FrequenceCycle.ponctuel,
        score_maturite=55.0,
        pilote_id=dir_these.id,
        parent_id=proc_doc.id,
        declencheur="Autorisation de soutenance accordée par la commission doctorale",
        entrees="Manuscrit final, composition du jury proposée, PV d'autorisation de soutenance",
        sorties="PV de soutenance, mention attribuée, attestation de doctorat émise",
        ressources_cles="Jury (interne + externe), Directeur de thèse, administration doctorale",
    )
    db.add_all([proc_inscription, proc_avancement, proc_soutenance])
    db.flush()

    # -------------------------------------------------------------------------
    # Matrice RACI (§5.3) — appliquée aux 9 processus pour cohérence démo
    # -------------------------------------------------------------------------
    raci_roles = ["Pilote", "Qualité", "Direction"]
    raci_activities = ["Planification", "Mise en œuvre", "Contrôle", "Revue"]
    raci_cells = {
        "0-0": "R", "0-1": "C", "0-2": "I",
        "1-0": "R", "1-1": "C", "1-2": "I",
        "2-0": "C", "2-1": "R", "2-2": "A",
        "3-0": "I", "3-1": "C", "3-2": "A",
    }
    for p in [
        proc_labo, proc_budget, proc_integration, proc_achat, proc_kpi,
        proc_doc, proc_inscription, proc_avancement, proc_soutenance,
    ]:
        p.raci_roles = raci_roles
        p.raci_activities = raci_activities
        p.raci_cells = raci_cells
        db.add(ProcessusRevision(
            processus_id=p.id,
            version="1.0",
            auteur_id=p.pilote_id,
            description="Création initiale",
            statut=StatutRevision.approuve,
        ))

    # -------------------------------------------------------------------------
    # Diagnostics ISO
    # -------------------------------------------------------------------------
    diags = [
        # PROC-LABO — audit global annuel
        DiagnosticISO(
            processus_id=proc_labo.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2024-LABO-001", score_global=68.0,
            niveau_global=_niveau_maturite(68.0),
            statut=StatutDiagnostic.valide, periode_couverte="2024-ANNUEL",
            date_diagnostic=now - timedelta(days=270),
            date_validation=now - timedelta(days=262),
            commentaire_global="Première évaluation. Processus achats et KPI non formalisés.",
        ),
        DiagnosticISO(
            processus_id=proc_labo.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-LABO-001", score_global=74.0,
            niveau_global=_niveau_maturite(74.0),
            statut=StatutDiagnostic.valide, periode_couverte="2025-ANNUEL",
            date_diagnostic=now - timedelta(days=45),
            date_validation=now - timedelta(days=38),
            commentaire_global="Progression notable. Processus achats à renforcer sur la traçabilité budgétaire.",
        ),
        # PROC-LABO-ACHAT
        DiagnosticISO(
            processus_id=proc_achat.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-ACHAT-001", score_global=58.0,
            niveau_global=_niveau_maturite(58.0),
            statut=StatutDiagnostic.valide, periode_couverte="2025-T1",
            date_diagnostic=now - timedelta(days=120),
            date_validation=now - timedelta(days=112),
            commentaire_global="Délais acceptables. Absence de tableau de suivi formalisé. Seuil d'appel d'offres méconnu des équipes.",
        ),
        DiagnosticISO(
            processus_id=proc_achat.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-ACHAT-002", score_global=62.0,
            niveau_global=_niveau_maturite(62.0),
            statut=StatutDiagnostic.soumis, periode_couverte="2025-T2",
            date_diagnostic=now - timedelta(days=12),
            date_validation=None,
            commentaire_global="Amélioration sur les délais. Alertes budgétaires à automatiser. Formation chefs d'équipe planifiée.",
        ),
        # PROC-LABO-BUDGET
        DiagnosticISO(
            processus_id=proc_budget.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-BUDGET-001", score_global=82.0,
            niveau_global=_niveau_maturite(82.0),
            statut=StatutDiagnostic.valide, periode_couverte="2025-ANNUEL",
            date_diagnostic=now - timedelta(days=90),
            date_validation=now - timedelta(days=83),
            commentaire_global="Budget consolidé dans les délais. Tableau de bord mensuel déployé. Communication aux équipes à améliorer.",
        ),
        # PROC-DOC — audit global semestriel
        DiagnosticISO(
            processus_id=proc_doc.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2024-DOC-001", score_global=60.0,
            niveau_global=_niveau_maturite(60.0),
            statut=StatutDiagnostic.valide, periode_couverte="2024-S2",
            date_diagnostic=now - timedelta(days=200),
            date_validation=now - timedelta(days=193),
            commentaire_global="Suivi doctoral insuffisant. 40% des rapports S2 non déposés. Processus soutenance non documenté.",
        ),
        DiagnosticISO(
            processus_id=proc_doc.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-DOC-001", score_global=67.0,
            niveau_global=_niveau_maturite(67.0),
            statut=StatutDiagnostic.valide, periode_couverte="2025-S1",
            date_diagnostic=now - timedelta(days=30),
            date_validation=now - timedelta(days=23),
            commentaire_global="Progression. Taux de dépôt des rapports amélioré à 70%. Formalisation de la procédure soutenance en cours.",
        ),
        # PROC-DOC-AVANCEMENT
        DiagnosticISO(
            processus_id=proc_avancement.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-AVANC-001", score_global=60.0,
            niveau_global=_niveau_maturite(60.0),
            statut=StatutDiagnostic.soumis, periode_couverte="2025-S1",
            date_diagnostic=now - timedelta(days=8),
            date_validation=None,
            commentaire_global="30% des rapports S1 non déposés. Rappels automatiques en cours de déploiement.",
        ),
        # PROC-DOC-SOUTENANCE
        DiagnosticISO(
            processus_id=proc_soutenance.id, auditeur_id=auditeur_interne.id,
            reference="DIAG-2025-SOUT-001", score_global=55.0,
            niveau_global=_niveau_maturite(55.0),
            statut=StatutDiagnostic.brouillon, periode_couverte="2025-S1",
            date_diagnostic=now - timedelta(days=3),
            date_validation=None,
            commentaire_global="Processus non encore formalisé. Constitution du jury généralement tardive (< 30 jours avant soutenance).",
        ),
    ]
    for d in diags:
        db.add(d)
    db.flush()

    # Génère des DiagnosticClause réelles autour du score cible de chaque diagnostic
    # pour que score_global, nb_clauses_evaluees et nb_ecarts_majeurs/mineurs soient
    # de vraies valeurs calculées, pas des chiffres fixés à la main.
    clauses_iso_applicables = (
        db.query(ClauseISO).filter(ClauseISO.est_applicable == True).all()  # noqa: E712
    )
    for d in diags:
        score_cible = d.score_global
        _generer_clauses_diagnostic(db, d, score_cible, clauses_iso_applicables)
    db.flush()

    # -------------------------------------------------------------------------
    # Risques
    # -------------------------------------------------------------------------
    risques = [
        # — Gestion des Achats —
        Risque(
            processus_id=proc_achat.id, responsable_id=comptable.id,
            reference="RSQ-2025-ACHAT-001",
            titre="Achats fractionnés pour contourner le seuil d'appel d'offres",
            description=(
                "Risque de fractionnement non intentionnel des commandes, "
                "entraînant un non-respect de la réglementation sur les marchés publics."
            ),
            type=TypeRisque.reglementaire,
            probabilite=4, gravite=5, detectabilite=3, rpn=60.0,
            criticite=NiveauCriticite.eleve, statut=StatutRisque.traitement,
            strategie=StrategieTraitement.reduction,
            plan_attenuation=(
                "Alertes automatiques à 80% du seuil par poste budgétaire. "
                "Formation des chefs d'équipe à la procédure réglementaire."
            ),
            date_identification=now - timedelta(days=120),
        ),
        Risque(
            processus_id=proc_achat.id, responsable_id=directeur.id,
            reference="RSQ-2025-ACHAT-002",
            titre="Fournisseur stratégique unique sans alternative qualifiée",
            description="Dépendance critique à un seul fournisseur pour les équipements de recherche.",
            type=TypeRisque.operationnel,
            probabilite=3, gravite=4, detectabilite=2, rpn=24.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.analyse,
            strategie=StrategieTraitement.transfert,
            plan_attenuation="Qualification de 2 fournisseurs alternatifs d'ici fin 2025.",
            date_identification=now - timedelta(days=60),
        ),
        # — Gestion Budgétaire —
        Risque(
            processus_id=proc_budget.id, responsable_id=comptable.id,
            reference="RSQ-2025-BUDGET-001",
            titre="Remboursements Ministère supérieurs à 90 jours",
            description="Les délais de remboursement longs fragilisent la trésorerie du laboratoire.",
            type=TypeRisque.financier,
            probabilite=4, gravite=3, detectabilite=2, rpn=24.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.surveillance,
            strategie=StrategieTraitement.acceptation,
            plan_attenuation="Suivi mensuel des remboursements avec relance formelle et escalade au Directeur si > 60 j.",
            date_identification=now - timedelta(days=150),
        ),
        # — Bilan KPI —
        Risque(
            processus_id=proc_kpi.id, responsable_id=resp_qualite.id,
            reference="RSQ-2025-KPI-001",
            titre="Bilan ATRST soumis hors délai",
            description=(
                "Consolidation tardive des KPI due au retard de remontée des données "
                "des sous-processus, entraînant un risque de non-conformité réglementaire."
            ),
            type=TypeRisque.reglementaire,
            probabilite=3, gravite=5, detectabilite=3, rpn=45.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.traitement,
            strategie=StrategieTraitement.reduction,
            plan_attenuation="Lancement de la collecte KPI 6 semaines avant l'échéance ATRST.",
            date_identification=now - timedelta(days=30),
        ),
        # — Encadrement Doctoral (global) —
        Risque(
            processus_id=proc_doc.id, responsable_id=resp_qualite.id,
            reference="RSQ-2025-DOC-001",
            titre="Abandon de doctorat non détecté à temps",
            description="Absence d'entretien régulier expose au départ silencieux d'un doctorant.",
            type=TypeRisque.humain,
            probabilite=3, gravite=4, detectabilite=4, rpn=48.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.surveillance,
            strategie=StrategieTraitement.reduction,
            plan_attenuation="Entretien individuel trimestriel obligatoire entre doctorant et directeur de thèse.",
            date_identification=now - timedelta(days=90),
        ),
        # — Suivi Avancement —
        Risque(
            processus_id=proc_avancement.id, responsable_id=dir_these.id,
            reference="RSQ-2025-AVANC-001",
            titre="Retards systématiques dans les rapports semestriels",
            description="30% des doctorants ne déposent pas leur rapport dans le délai imparti.",
            type=TypeRisque.operationnel,
            probabilite=4, gravite=3, detectabilite=2, rpn=24.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.traitement,
            strategie=StrategieTraitement.reduction,
            plan_attenuation="Rappels automatiques par email à J-30 et J-7 avant chaque échéance semestrielle.",
            date_identification=now - timedelta(days=60),
        ),
        # — Soutenance —
        Risque(
            processus_id=proc_soutenance.id, responsable_id=dir_these.id,
            reference="RSQ-2025-SOUT-001",
            titre="Constitution tardive du jury — risque d'annulation de la soutenance",
            description="Désignation du jury à moins de 30 jours de la date de soutenance.",
            type=TypeRisque.operationnel,
            probabilite=3, gravite=4, detectabilite=3, rpn=36.0,
            criticite=NiveauCriticite.modere, statut=StatutRisque.identifie,
            strategie=StrategieTraitement.reduction,
            plan_attenuation="Procédure de constitution du jury déclenchée 3 mois avant la date prévisionnelle.",
            date_identification=now - timedelta(days=20),
        ),
    ]
    for r in risques:
        db.add(r)
    db.flush()

    # -------------------------------------------------------------------------
    # Actions correctives / préventives
    # -------------------------------------------------------------------------
    actions = [
        # — PROC-LABO-ACHAT —
        Action(
            processus_id=proc_achat.id,
            responsable_id=comptable.id, verificateur_id=directeur.id,
            reference="ACT-2025-ACHAT-001",
            titre="Déployer les alertes budgétaires automatiques par poste",
            description=(
                "Configurer des notifications email à 80% du seuil budgétaire par poste, "
                "générées automatiquement depuis le tableau de suivi des achats."
            ),
            type=TypeAction.preventive, priorite=PrioriteAction.haute,
            statut=StatutAction.en_cours, origine=OrigineAction.risque,
            avancement=55,
            date_planifiee=now - timedelta(days=10),
            date_echeance=now + timedelta(days=20),
        ),
        Action(
            processus_id=proc_achat.id,
            responsable_id=chef_equipe.id, verificateur_id=comptable.id,
            reference="ACT-2025-ACHAT-002",
            titre="Former les chefs d'équipe à la procédure d'achat réglementaire",
            description=(
                "Session de 2h sur les seuils réglementaires d'appel d'offres, "
                "le formulaire de demande d'achat et la traçabilité requise."
            ),
            type=TypeAction.preventive, priorite=PrioriteAction.normale,
            statut=StatutAction.planifiee, origine=OrigineAction.diagnostic,
            avancement=0,
            date_planifiee=now + timedelta(days=5),
            date_echeance=now + timedelta(days=35),
        ),
        # — PROC-LABO-BUDGET —
        Action(
            processus_id=proc_budget.id,
            responsable_id=comptable.id, verificateur_id=directeur.id,
            reference="ACT-2025-BUDGET-001",
            titre="Élaborer le tableau de bord de suivi budgétaire mensuel",
            description=(
                "Rapport mensuel automatisé (dépenses réelles vs. budget par poste) "
                "transmis chaque 1er du mois au Directeur par email."
            ),
            type=TypeAction.amelioration, priorite=PrioriteAction.haute,
            statut=StatutAction.en_verification, origine=OrigineAction.diagnostic,
            avancement=100,
            date_planifiee=now - timedelta(days=60),
            date_echeance=now - timedelta(days=20),
            date_realisation=now - timedelta(days=22),
        ),
        # — PROC-LABO-KPI —
        Action(
            processus_id=proc_kpi.id,
            responsable_id=resp_qualite.id, verificateur_id=directeur.id,
            reference="ACT-2025-KPI-001",
            titre="Définir et déployer le tableau de bord KPI du laboratoire",
            description=(
                "Identifier les 8 KPI prioritaires, définir les sources de données, "
                "et déployer le tableau de bord dans le SI-SMQ."
            ),
            type=TypeAction.amelioration, priorite=PrioriteAction.haute,
            statut=StatutAction.close, origine=OrigineAction.revue_direction,
            avancement=100,
            date_planifiee=now - timedelta(days=180),
            date_echeance=now - timedelta(days=90),
            date_realisation=now - timedelta(days=95),
            efficacite_verifiee=True,
            commentaire_verification="8 indicateurs opérationnels, tableau de bord accessible à tous les pilotes.",
        ),
        # — PROC-DOC-AVANCEMENT —
        Action(
            processus_id=proc_avancement.id,
            responsable_id=dir_these.id, verificateur_id=resp_qualite.id,
            reference="ACT-2025-AVANC-001",
            titre="Automatiser les rappels de rapports semestriels aux doctorants",
            description=(
                "Configurer des emails automatiques à J-30 et J-7 avant chaque échéance "
                "semestrielle, avec copie au directeur de thèse."
            ),
            type=TypeAction.corrective, priorite=PrioriteAction.haute,
            statut=StatutAction.en_cours, origine=OrigineAction.diagnostic,
            avancement=70,
            date_planifiee=now - timedelta(days=20),
            date_echeance=now + timedelta(days=10),
        ),
        Action(
            processus_id=proc_avancement.id,
            responsable_id=resp_qualite.id, verificateur_id=auditeur_interne.id,
            reference="ACT-2025-AVANC-002",
            titre="Créer le canevas standardisé de rapport semestriel d'avancement",
            description=(
                "Élaborer un modèle officiel de rapport d'avancement couvrant : "
                "objectifs atteints, publications, difficultés, plan S2."
            ),
            type=TypeAction.corrective, priorite=PrioriteAction.normale,
            statut=StatutAction.planifiee, origine=OrigineAction.diagnostic,
            avancement=0,
            date_planifiee=now + timedelta(days=3),
            date_echeance=now + timedelta(days=25),
        ),
        # — PROC-DOC-SOUTENANCE —
        Action(
            processus_id=proc_soutenance.id,
            responsable_id=dir_these.id, verificateur_id=resp_qualite.id,
            reference="ACT-2025-SOUT-001",
            titre="Formaliser la procédure de constitution et convocation du jury",
            description=(
                "Rédiger la procédure documentée : délais réglementaires, composition du jury, "
                "envoi des convocations, gestion des PV de soutenance."
            ),
            type=TypeAction.amelioration, priorite=PrioriteAction.normale,
            statut=StatutAction.en_cours, origine=OrigineAction.risque,
            avancement=40,
            date_planifiee=now - timedelta(days=5),
            date_echeance=now + timedelta(days=25),
        ),
        # — PROC-DOC (global) —
        Action(
            processus_id=proc_doc.id,
            responsable_id=resp_qualite.id, verificateur_id=auditeur_interne.id,
            reference="ACT-2025-DOC-001",
            titre="Réaliser l'audit interne S1 du processus d'encadrement doctoral",
            description=(
                "Audit interne couvrant les trois sous-processus (inscription, avancement, soutenance) "
                "avec rapport de constatations et plan d'actions."
            ),
            type=TypeAction.amelioration, priorite=PrioriteAction.haute,
            statut=StatutAction.en_cours, origine=OrigineAction.revue_direction,
            avancement=30,
            date_planifiee=now - timedelta(days=3),
            date_echeance=now + timedelta(days=30),
        ),
    ]
    for a in actions:
        db.add(a)
    db.flush()

    # -------------------------------------------------------------------------
    # Indicateurs KPI avec historique des mesures
    # -------------------------------------------------------------------------

    def _mesures(kpi: Indicateur, donnees: list[tuple], pilote: Utilisateur, sens: str) -> None:
        """
        donnees : liste de (valeur, periode_label, jours_avant_maintenant)
        Calcule évolution, evolution_pct et statut_alerte pour chaque mesure.
        """
        prev = None
        for valeur, periode, jours_avant in donnees:
            evo = (valeur - prev) if prev is not None else None
            evo_pct = (
                ((valeur - prev) / abs(prev) * 100)
                if (prev is not None and prev != 0)
                else None
            )
            alerte = _statut_alerte(
                valeur,
                kpi.seuil_attention,
                kpi.seuil_alerte,
                sens,
            )
            db.add(MesureKPI(
                indicateur_id=kpi.id,
                saisi_par_id=pilote.id,
                valeur=valeur,
                date_mesure=now - timedelta(days=jours_avant),
                periode=periode,
                valeur_precedente=prev,
                evolution=evo,
                evolution_pct=evo_pct,
                statut_alerte=alerte,
                est_valide=True,
            ))
            prev = valeur
        if donnees:
            kpi.valeur_actuelle = donnees[-1][0]

    # KPI 1 — Taux d'exécution budgétaire (PROC-LABO-BUDGET)
    kpi_budget_exec = Indicateur(
        code="KPI-BUDGET-EXEC",
        nom="Taux d'exécution budgétaire",
        description="Pourcentage du budget annuel alloué effectivement consommé à date.",
        processus_id=proc_budget.id,
        responsable_id=comptable.id,
        unite=UniteKPI.pourcentage,
        sens=SensKPI.hausse,
        frequence=FrequenceMesure.trimestriel,
        source=SourceKPI.manuel,
        valeur_initiale=0.0, valeur_cible=95.0,
        seuil_attention=60.0, seuil_alerte=40.0,
        afficher_dashboard=True,
    )
    db.add(kpi_budget_exec)
    db.flush()
    _mesures(kpi_budget_exec, [
        (22.0, "2025-T1", 270),
        (45.0, "2025-T2", 180),
        (68.0, "2025-T3", 90),
        (87.0, "2025-T4", 0),
    ], comptable, "hausse")

    # KPI 2 — Délai moyen de traitement des achats (PROC-LABO-ACHAT)
    kpi_delai_achat = Indicateur(
        code="KPI-ACHAT-DELAI",
        nom="Délai moyen de traitement des achats (jours)",
        description="Nombre moyen de jours entre la demande d'achat validée et l'émission du bon de commande.",
        processus_id=proc_achat.id,
        responsable_id=comptable.id,
        unite=UniteKPI.jours,
        sens=SensKPI.baisse,
        frequence=FrequenceMesure.mensuel,
        source=SourceKPI.manuel,
        valeur_initiale=25.0, valeur_cible=7.0,
        seuil_attention=14.0, seuil_alerte=20.0,
        afficher_dashboard=True,
    )
    db.add(kpi_delai_achat)
    db.flush()
    _mesures(kpi_delai_achat, [
        (26.0, "2025-02", 210),
        (22.0, "2025-03", 180),
        (19.0, "2025-04", 150),
        (16.0, "2025-05", 120),
        (13.0, "2025-06", 90),
        (11.0, "2025-07", 60),
        (9.0,  "2025-08", 30),
        (8.0,  "2025-09", 0),
    ], comptable, "baisse")

    # KPI 3 — Nombre de doctorants actifs (PROC-DOC)
    kpi_doctorants_actifs = Indicateur(
        code="KPI-DOC-ACTIFS",
        nom="Nombre de doctorants actifs",
        description="Nombre total de doctorants inscrits et en cours de thèse au laboratoire.",
        processus_id=proc_doc.id,
        responsable_id=dir_these.id,
        unite=UniteKPI.nombre,
        sens=SensKPI.hausse,
        frequence=FrequenceMesure.semestriel,
        source=SourceKPI.manuel,
        valeur_initiale=6.0, valeur_cible=18.0,
        seuil_attention=10.0, seuil_alerte=6.0,
        afficher_dashboard=True,
    )
    db.add(kpi_doctorants_actifs)
    db.flush()
    _mesures(kpi_doctorants_actifs, [
        (6.0,  "2023-S2", 540),
        (8.0,  "2024-S1", 365),
        (9.0,  "2024-S2", 180),
        (11.0, "2025-S1", 0),
    ], dir_these, "hausse")

    # KPI 4 — Taux de rapports d'avancement déposés dans les délais (PROC-DOC-AVANCEMENT)
    kpi_rapports_delai = Indicateur(
        code="KPI-DOC-RAPPORTS-DELAI",
        nom="Taux de rapports d'avancement déposés dans les délais",
        description="Pourcentage de doctorants ayant soumis leur rapport semestriel avant l'échéance.",
        processus_id=proc_avancement.id,
        responsable_id=dir_these.id,
        unite=UniteKPI.pourcentage,
        sens=SensKPI.hausse,
        frequence=FrequenceMesure.semestriel,
        source=SourceKPI.manuel,
        valeur_initiale=50.0, valeur_cible=95.0,
        seuil_attention=70.0, seuil_alerte=55.0,
        afficher_dashboard=True,
    )
    db.add(kpi_rapports_delai)
    db.flush()
    _mesures(kpi_rapports_delai, [
        (50.0, "2023-S2", 540),
        (58.0, "2024-S1", 365),
        (63.0, "2024-S2", 180),
        (70.0, "2025-S1", 0),
    ], dir_these, "hausse")

    # KPI 5 — Score de maturité globale ISO (transversal)
    kpi_maturite = Indicateur(
        code="KPI-GLOBAL-MATURITE",
        nom="Score de maturité globale des processus",
        description="Moyenne des scores de maturité ISO des processus racines (PROC-LABO et PROC-DOC).",
        processus_id=None,
        responsable_id=resp_qualite.id,
        unite=UniteKPI.score,
        sens=SensKPI.hausse,
        frequence=FrequenceMesure.trimestriel,
        source=SourceKPI.auto,
        formule=FormulaKPI.score_maturite_processus,
        valeur_initiale=50.0, valeur_cible=80.0,
        seuil_attention=60.0, seuil_alerte=50.0,
        afficher_dashboard=True,
    )
    db.add(kpi_maturite)
    db.flush()
    _mesures(kpi_maturite, [
        (50.0, "2024-T1", 450),
        (55.0, "2024-T2", 360),
        (59.0, "2024-T3", 270),
        (63.0, "2024-T4", 180),
        (66.0, "2025-T1", 90),
        (70.0, "2025-T2", 0),
    ], resp_qualite, "hausse")

    # KPI 6 — Nombre de risques critiques actifs (transversal)
    kpi_risques_critiques = Indicateur(
        code="KPI-GLOBAL-RISQUES-CRITIQUES",
        nom="Nombre de risques critiques non clôturés",
        description="Nombre de risques avec RPN > 80 et statut différent de 'clos'.",
        processus_id=None,
        responsable_id=resp_qualite.id,
        unite=UniteKPI.nombre,
        sens=SensKPI.baisse,
        frequence=FrequenceMesure.mensuel,
        source=SourceKPI.auto,
        formule=FormulaKPI.nb_risques_critiques,
        valeur_initiale=6.0, valeur_cible=0.0,
        seuil_attention=2.0, seuil_alerte=4.0,
        afficher_dashboard=True,
    )
    db.add(kpi_risques_critiques)
    db.flush()
    _mesures(kpi_risques_critiques, [
        (6.0, "2025-03", 180),
        (5.0, "2025-04", 150),
        (4.0, "2025-05", 120),
        (3.0, "2025-06", 90),
        (2.0, "2025-07", 60),
        (2.0, "2025-08", 30),
        (1.0, "2025-09", 0),
    ], resp_qualite, "baisse")

    # KPI 7 — Taux d'actions correctives clôturées (transversal)
    kpi_actions_closes = Indicateur(
        code="KPI-GLOBAL-ACTIONS-CLOSES",
        nom="Taux d'actions correctives clôturées",
        description="Pourcentage d'actions en statut 'close' ou 'annulée' sur le total des actions créées.",
        processus_id=None,
        responsable_id=resp_qualite.id,
        unite=UniteKPI.pourcentage,
        sens=SensKPI.hausse,
        frequence=FrequenceMesure.mensuel,
        source=SourceKPI.auto,
        formule=FormulaKPI.taux_actions_closes,
        valeur_initiale=20.0, valeur_cible=80.0,
        seuil_attention=55.0, seuil_alerte=35.0,
        afficher_dashboard=True,
    )
    db.add(kpi_actions_closes)
    db.flush()
    _mesures(kpi_actions_closes, [
        (20.0, "2025-03", 180),
        (28.0, "2025-04", 150),
        (35.0, "2025-05", 120),
        (40.0, "2025-06", 90),
        (47.0, "2025-07", 60),
        (52.0, "2025-08", 30),
        (58.0, "2025-09", 0),
    ], resp_qualite, "hausse")

    db.commit()
    logger.info(
        "seed_demo_data : 2 processus BPMN (9 total), 8 utilisateurs, "
        "9 diagnostics, 7 risques, 8 actions, 7 KPIs avec historique — insérés."
    )

    # -------------------------------------------------------------------------
    # Moteur Analytique — lance un DiagnosticSMQ initial sur les 2 processus
    # racines pour que Tab5 (Dysfonctionnements) ait des données dès le départ.
    # Best-effort : une erreur ici ne doit jamais empêcher le démarrage.
    # -------------------------------------------------------------------------
    try:
        from app.services import diagnostic_smq_service
        for p in [proc_labo, proc_doc]:
            diagnostic_smq_service.lancer_diagnostic(db, p.id, resp_qualite)
        logger.info("seed_demo_data : DiagnosticSMQ initial lancé sur PROC-LABO et PROC-DOC.")
    except Exception as exc:  # noqa: BLE001 — ne bloque jamais le démarrage
        logger.warning("seed_demo_data : DiagnosticSMQ initial non lancé (%s).", exc)


# ---------------------------------------------------------------------------
# Point d'entrée principal
# ---------------------------------------------------------------------------


def run_all_seeders(db: Session) -> None:
    """
    Appelé une fois au démarrage FastAPI (lifespan ou @app.on_event).
    Ordre : clauses ISO → parties intéressées → admin → données démo BPMN.
    """
    logger.info("=== Démarrage des seeders SI-SMQ ===")
    seed_clauses_iso(db)
    seed_parties_interessees(db)
    seed_admin_user(db)
    seed_demo_data(db)
    logger.info("=== Seeders terminés ===")
