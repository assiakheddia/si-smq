"""
services/kpi_service.py — Gestion des indicateurs KPI

Responsabilités :
  - CRUD indicateurs (KPI)
  - Enregistrement des mesures (série temporelle)
  - Calcul automatique des 7 formules (SourceKPI.auto | mixte)
  - Évaluation des alertes (iso_engine)
  - Tableau de bord KPI par processus
  - Déclenchements automatiques des mesures

Formules auto disponibles (FormulaKPI) :
  score_maturite_processus | taux_actions_closes | taux_conformite_clauses |
  nb_risques_critiques | nb_risques_actifs | taux_documents_valides |
  score_global_diagnostic
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import calcul_evolution, evaluer_alerte_kpi
from app.models.indicateur import FormulaKPI, Indicateur, MesureKPI, SourceKPI
from app.models.processus import Processus
from app.models.utilisateur import Utilisateur
from app.schemas.indicateur import (
    IndicateurCreate,
    IndicateurUpdate,
    MesureCreate,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_indicateur_ou_404(db: Session, indicateur_id: int) -> Indicateur:
    ind = db.query(Indicateur).filter(Indicateur.id == indicateur_id).first()
    if not ind:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Indicateur {indicateur_id} introuvable.",
        )
    return ind


def _get_processus_ou_none(db: Session, processus_code: str | None) -> Processus | None:
    if not processus_code:
        return None
    return db.query(Processus).filter(Processus.code == processus_code).first()


# ---------------------------------------------------------------------------
# §1 — CRUD Indicateurs
# ---------------------------------------------------------------------------

def creer_indicateur(
    db: Session,
    payload: IndicateurCreate,
    createur: Utilisateur,
) -> Indicateur:
    """
    Crée un indicateur KPI.

    - Si source=auto ou mixte, une formula_kpi est requise
    - Le processus est optionnel (indicateur transverse possible)

    Raises:
        HTTPException 400 — formula_kpi absente pour source auto.
        HTTPException 404 — processus introuvable.
    """
    if payload.source in (SourceKPI.auto, SourceKPI.mixte) and not payload.formula_kpi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une formula_kpi est requise pour les indicateurs à calcul automatique.",
        )

    processus_id = None
    if payload.processus_code:
        processus = _get_processus_ou_none(db, payload.processus_code)
        if not processus:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Processus '{payload.processus_code}' introuvable.",
            )
        processus_id = processus.id

    indicateur = Indicateur(
        nom=payload.nom,
        description=payload.description,
        unite=payload.unite,
        source=payload.source,
        formula_kpi=payload.formula_kpi,
        cible=payload.cible,
        seuil_alerte_bas=payload.seuil_alerte_bas,
        seuil_alerte_haut=payload.seuil_alerte_haut,
        processus_id=processus_id,
        responsable_id=payload.responsable_id,
        est_actif=True,
    )
    db.add(indicateur)
    db.commit()
    db.refresh(indicateur)

    logger.info(
        "Indicateur créé : '%s' (source=%s) par %s",
        indicateur.nom, indicateur.source.value, createur.email,
    )
    return indicateur


def lister_indicateurs(
    db: Session,
    processus_code: str | None = None,
    source: SourceKPI | None = None,
    actifs_seulement: bool = True,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(Indicateur)

    if actifs_seulement:
        q = q.filter(Indicateur.est_actif == True)  # noqa: E712

    if processus_code:
        processus = _get_processus_ou_none(db, processus_code)
        if processus:
            q = q.filter(Indicateur.processus_id == processus.id)

    if source:
        q = q.filter(Indicateur.source == source)

    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


def get_indicateur(db: Session, indicateur_id: int) -> Indicateur:
    return _get_indicateur_ou_404(db, indicateur_id)


def modifier_indicateur(
    db: Session,
    indicateur_id: int,
    payload: IndicateurUpdate,
    modificateur: Utilisateur,
) -> Indicateur:
    indicateur = _get_indicateur_ou_404(db, indicateur_id)

    for champ in [
        "nom", "description", "unite", "cible",
        "seuil_alerte_bas", "seuil_alerte_haut",
        "responsable_id", "est_actif",
    ]:
        valeur = getattr(payload, champ, None)
        if valeur is not None:
            setattr(indicateur, champ, valeur)

    db.commit()
    db.refresh(indicateur)
    logger.info("Indicateur modifié : '%s' par %s", indicateur.nom, modificateur.email)
    return indicateur


# ---------------------------------------------------------------------------
# §2 — Mesures (série temporelle)
# ---------------------------------------------------------------------------

def enregistrer_mesure(
    db: Session,
    indicateur_id: int,
    payload: MesureCreate,
    saisisseur: Utilisateur,
) -> MesureKPI:
    """
    Enregistre une mesure manuelle pour un indicateur.

    - Calcule l'évolution par rapport à la mesure précédente
    - Évalue les alertes (seuil bas, seuil haut, cible)

    Raises:
        HTTPException 404 — indicateur introuvable.
        HTTPException 400 — indicateur inactif ou calcul auto uniquement.
    """
    indicateur = _get_indicateur_ou_404(db, indicateur_id)

    if not indicateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'indicateur est désactivé.",
        )

    if indicateur.source == SourceKPI.auto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cet indicateur est en calcul automatique. "
                "Utiliser POST /indicateurs/{id}/calculer pour déclencher le calcul."
            ),
        )

    # Mesure précédente pour calcul d'évolution
    mesure_precedente = (
        db.query(MesureKPI)
        .filter(MesureKPI.indicateur_id == indicateur_id)
        .order_by(MesureKPI.date_mesure.desc())
        .first()
    )

    evolution = None
    if mesure_precedente and mesure_precedente.valeur is not None:
        evolution = calcul_evolution(mesure_precedente.valeur, payload.valeur)

    # Évaluation des alertes
    alerte = evaluer_alerte_kpi(
        valeur=payload.valeur,
        cible=indicateur.cible,
        seuil_bas=indicateur.seuil_alerte_bas,
        seuil_haut=indicateur.seuil_alerte_haut,
        valeur_precedente=mesure_precedente.valeur if mesure_precedente else None,
    )

    mesure = MesureKPI(
        indicateur_id=indicateur_id,
        valeur=payload.valeur,
        date_mesure=payload.date_mesure or datetime.now(tz=timezone.utc),
        periode=payload.periode,
        commentaire=payload.commentaire,
        saisie_par_id=saisisseur.id,
        evolution=evolution,
        alerte=alerte.get("alerte"),
        type_alerte=alerte.get("type"),
    )
    db.add(mesure)
    db.commit()
    db.refresh(mesure)

    if alerte.get("alerte"):
        logger.warning(
            "Alerte KPI '%s' : valeur=%.2f type=%s",
            indicateur.nom, payload.valeur, alerte.get("type"),
        )
    else:
        logger.debug(
            "Mesure enregistrée pour '%s' : %.2f",
            indicateur.nom, payload.valeur,
        )

    return mesure


def lister_mesures(
    db: Session,
    indicateur_id: int,
    periode: str | None = None,
    page: int = 1,
    taille_page: int = 50,
) -> dict:
    _get_indicateur_ou_404(db, indicateur_id)

    q = db.query(MesureKPI).filter(MesureKPI.indicateur_id == indicateur_id)

    if periode:
        q = q.filter(MesureKPI.periode == periode)

    q = q.order_by(MesureKPI.date_mesure.desc())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


# ---------------------------------------------------------------------------
# §3 — Calcul automatique (7 formules)
# ---------------------------------------------------------------------------

def calculer_valeur_auto(db: Session, indicateur_id: int) -> MesureKPI:
    """
    Déclenche le calcul automatique d'une mesure selon la formula_kpi.

    Les 7 formules disponibles :
      score_maturite_processus  — score global du dernier diagnostic validé du processus
      taux_actions_closes       — % actions closes / total actions actives
      taux_conformite_clauses   — % clauses conformes dans le dernier diagnostic validé
      nb_risques_critiques      — nombre de risques avec criticité=critique non clos
      nb_risques_actifs         — nombre de risques non clos
      taux_documents_valides    — % documents en statut=valide
      score_global_diagnostic   — score global du dernier diagnostic validé (tous processus)

    Raises:
        HTTPException 400 — indicateur sans formula_kpi ou source=manuel.
        HTTPException 400 — données insuffisantes pour calculer.
    """
    indicateur = _get_indicateur_ou_404(db, indicateur_id)

    if indicateur.source == SourceKPI.manuel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet indicateur est en saisie manuelle uniquement.",
        )

    if not indicateur.formula_kpi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune formula_kpi définie pour cet indicateur.",
        )

    valeur = _executer_formule(db, indicateur)

    if valeur is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Impossible de calculer '{indicateur.formula_kpi.value}' : "
                "données insuffisantes."
            ),
        )

    # Réutiliser enregistrer_mesure pour bénéficier des alertes et évolutions
    from app.schemas.indicateur import MesureCreate
    payload = MesureCreate(
        valeur=valeur,
        date_mesure=datetime.now(tz=timezone.utc),
        periode=_periode_courante(),
        commentaire=f"Calcul automatique ({indicateur.formula_kpi.value})",
    )

    # Bypass vérification source pour les calculs auto
    indicateur_original_source = indicateur.source
    indicateur.source = SourceKPI.mixte  # temporaire pour contourner la garde
    mesure = enregistrer_mesure(db, indicateur_id, payload, _utilisateur_systeme(db))
    indicateur.source = indicateur_original_source
    db.commit()

    return mesure


def _periode_courante() -> str:
    """Retourne la période courante au format YYYY-MM."""
    now = datetime.now(tz=timezone.utc)
    return f"{now.year}-{now.month:02d}"


def _utilisateur_systeme(db: Session) -> Utilisateur:
    """Retourne le compte admin pour les saisies automatiques système."""
    from app.models.utilisateur import RoleEnum
    admin = (
        db.query(Utilisateur)
        .filter(Utilisateur.role == RoleEnum.admin, Utilisateur.est_actif == True)  # noqa: E712
        .first()
    )
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Aucun administrateur actif disponible pour le calcul automatique.",
        )
    return admin


def _executer_formule(db: Session, indicateur: Indicateur) -> float | None:
    """
    Dispatche vers la bonne fonction de calcul selon formula_kpi.
    Retourne None si les données sont insuffisantes.
    """
    formule = indicateur.formula_kpi
    processus_id = indicateur.processus_id

    if formule == FormulaKPI.score_maturite_processus:
        return _calc_score_maturite_processus(db, processus_id)

    elif formule == FormulaKPI.taux_actions_closes:
        return _calc_taux_actions_closes(db, processus_id)

    elif formule == FormulaKPI.taux_conformite_clauses:
        return _calc_taux_conformite_clauses(db, processus_id)

    elif formule == FormulaKPI.nb_risques_critiques:
        return _calc_nb_risques_critiques(db, processus_id)

    elif formule == FormulaKPI.nb_risques_actifs:
        return _calc_nb_risques_actifs(db, processus_id)

    elif formule == FormulaKPI.taux_documents_valides:
        return _calc_taux_documents_valides(db, processus_id)

    elif formule == FormulaKPI.score_global_diagnostic:
        return _calc_score_global_diagnostic(db, processus_id)

    return None


def _calc_score_maturite_processus(db: Session, processus_id: int | None) -> float | None:
    from app.models.diagnostic import DiagnosticISO, StatutDiagnostic
    q = db.query(DiagnosticISO).filter(
        DiagnosticISO.statut == StatutDiagnostic.valide,
        DiagnosticISO.score_global.isnot(None),
    )
    if processus_id:
        q = q.filter(DiagnosticISO.processus_id == processus_id)
    diag = q.order_by(DiagnosticISO.date_creation.desc()).first()
    return float(diag.score_global) if diag else None


def _calc_taux_actions_closes(db: Session, processus_id: int | None) -> float | None:
    from app.models.action import Action, StatutAction
    q = db.query(Action)
    if processus_id:
        q = q.filter(Action.processus_id == processus_id)
    total = q.filter(Action.statut != StatutAction.annulee).count()
    if total == 0:
        return None
    closes = q.filter(Action.statut == StatutAction.close).count()
    return round(closes / total * 100, 1)


def _calc_taux_conformite_clauses(db: Session, processus_id: int | None) -> float | None:
    from app.models.diagnostic import DiagnosticClause, DiagnosticISO, StatutDiagnostic
    q = db.query(DiagnosticISO).filter(
        DiagnosticISO.statut == StatutDiagnostic.valide
    )
    if processus_id:
        q = q.filter(DiagnosticISO.processus_id == processus_id)
    diag = q.order_by(DiagnosticISO.date_creation.desc()).first()
    if not diag:
        return None
    clauses = (
        db.query(DiagnosticClause)
        .filter(DiagnosticClause.diagnostic_id == diag.id)
        .all()
    )
    total = len([c for c in clauses if c.score is not None])
    if total == 0:
        return None
    conformes = sum(1 for c in clauses if c.type_ecart == "conforme")
    return round(conformes / total * 100, 1)


def _calc_nb_risques_critiques(db: Session, processus_id: int | None) -> float:
    from app.models.risque import Risque, StatutRisque
    q = db.query(Risque).filter(
        Risque.criticite == "critique",
        Risque.statut != StatutRisque.clos,
    )
    if processus_id:
        q = q.filter(Risque.processus_id == processus_id)
    return float(q.count())


def _calc_nb_risques_actifs(db: Session, processus_id: int | None) -> float:
    from app.models.risque import Risque, StatutRisque
    q = db.query(Risque).filter(Risque.statut != StatutRisque.clos)
    if processus_id:
        q = q.filter(Risque.processus_id == processus_id)
    return float(q.count())


def _calc_taux_documents_valides(db: Session, processus_id: int | None) -> float | None:
    from app.models.document import Document
    q = db.query(Document)
    if processus_id:
        q = q.filter(Document.processus_id == processus_id)
    total = q.count()
    if total == 0:
        return None
    valides = q.filter(Document.statut == "valide").count()
    return round(valides / total * 100, 1)


def _calc_score_global_diagnostic(db: Session, processus_id: int | None) -> float | None:
    return _calc_score_maturite_processus(db, processus_id)


# ---------------------------------------------------------------------------
# §4 — Tableau de bord KPI
# ---------------------------------------------------------------------------

def get_tableau_de_bord(
    db: Session,
    processus_code: str | None = None,
) -> dict:
    """
    Retourne le tableau de bord KPI avec la dernière mesure de chaque indicateur actif
    et son statut d'alerte.
    """
    q = db.query(Indicateur).filter(Indicateur.est_actif == True)  # noqa: E712

    if processus_code:
        processus = _get_processus_ou_none(db, processus_code)
        if processus:
            q = q.filter(Indicateur.processus_id == processus.id)

    indicateurs = q.all()
    items = []

    for ind in indicateurs:
        derniere_mesure = (
            db.query(MesureKPI)
            .filter(MesureKPI.indicateur_id == ind.id)
            .order_by(MesureKPI.date_mesure.desc())
            .first()
        )
        items.append({
            "indicateur_id": ind.id,
            "nom": ind.nom,
            "unite": ind.unite,
            "cible": ind.cible,
            "derniere_valeur": derniere_mesure.valeur if derniere_mesure else None,
            "date_derniere_mesure": derniere_mesure.date_mesure if derniere_mesure else None,
            "evolution": derniere_mesure.evolution if derniere_mesure else None,
            "alerte": derniere_mesure.alerte if derniere_mesure else False,
            "type_alerte": derniere_mesure.type_alerte if derniere_mesure else None,
        })

    nb_alertes = sum(1 for i in items if i["alerte"])
    return {
        "processus_code": processus_code,
        "nb_indicateurs": len(items),
        "nb_alertes": nb_alertes,
        "items": items,
    }


# ---------------------------------------------------------------------------
# §5 — Déclenchements automatiques (batch)
# ---------------------------------------------------------------------------

def declencher_calculs_auto(db: Session) -> dict:
    """
    Déclenche le calcul automatique de tous les indicateurs actifs
    avec source=auto ou mixte.

    Conçu pour être appelé par un scheduler (ex: APScheduler, Celery Beat)
    ou manuellement via POST /indicateurs/calculer-tout.

    Returns:
        Résumé : nb calculés, nb erreurs, détails.
    """
    indicateurs = (
        db.query(Indicateur)
        .filter(
            Indicateur.est_actif == True,  # noqa: E712
            Indicateur.source.in_([SourceKPI.auto, SourceKPI.mixte]),
            Indicateur.formula_kpi.isnot(None),
        )
        .all()
    )

    resultats = {"calcules": 0, "erreurs": 0, "details": []}

    for ind in indicateurs:
        try:
            mesure = calculer_valeur_auto(db, ind.id)
            resultats["calcules"] += 1
            resultats["details"].append({
                "indicateur": ind.nom,
                "valeur": mesure.valeur,
                "alerte": mesure.alerte,
                "statut": "ok",
            })
        except Exception as exc:
            resultats["erreurs"] += 1
            resultats["details"].append({
                "indicateur": ind.nom,
                "statut": "erreur",
                "message": str(exc),
            })
            logger.error("Erreur calcul auto KPI '%s' : %s", ind.nom, exc)

    logger.info(
        "Calculs auto KPI : %d calculés, %d erreurs",
        resultats["calcules"], resultats["erreurs"],
    )
    return resultats