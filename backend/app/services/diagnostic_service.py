"""
services/diagnostic_service.py — Gestion des diagnostics ISO 9001:2015

Responsabilités :
  - Création d'un diagnostic (brouillon)
  - Évaluation des clauses (score 0-100 + type écart)
  - Agrégation des scores (score global pondéré via iso_engine)
  - Génération automatique de risques et actions depuis les écarts
  - Workflow : brouillon → soumis → valide → archive
  - Rapport de maturité

Référence générée : "DIAG-2025-PROC-LABO-001"
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.iso_engine import (
    calcul_score_global,
    get_recommandation_auto,
    score_to_niveau,
    score_to_type_ecart,
)
from app.models.clause_iso import ClauseISO
from app.models.diagnostic import DiagnosticClause, DiagnosticISO, StatutDiagnostic
from app.models.processus import Processus
from app.models.utilisateur import Utilisateur
from app.schemas.diagnostic import (
    DiagnosticCreate,
    DiagnosticUpdate,
    DiagnosticClauseCreate,
    DiagnosticClauseUpdate,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------

def _get_ou_404(db: Session, diagnostic_id: int) -> DiagnosticISO:
    d = db.query(DiagnosticISO).filter(DiagnosticISO.id == diagnostic_id).first()
    if not d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnostic {diagnostic_id} introuvable.",
        )
    return d


def _generer_reference(db: Session, processus_code: str, annee: int) -> str:
    """Génère la prochaine référence : DIAG-2025-PROC-LABO-001."""
    count = (
        db.query(DiagnosticISO)
        .filter(DiagnosticISO.reference.like(f"DIAG-{annee}-{processus_code}-%"))
        .count()
    )
    return f"DIAG-{annee}-{processus_code}-{count + 1:03d}"


def _verifier_statut_modifiable(diagnostic: DiagnosticISO) -> None:
    """Lève une exception si le diagnostic n'est plus modifiable."""
    if diagnostic.statut not in (StatutDiagnostic.brouillon,):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Le diagnostic '{diagnostic.reference}' est en statut "
                f"'{diagnostic.statut.value}' et ne peut plus être modifié."
            ),
        )


# ---------------------------------------------------------------------------
# §1 — Création
# ---------------------------------------------------------------------------

def creer_diagnostic(
    db: Session,
    payload: DiagnosticCreate,
    auditeur: Utilisateur,
) -> DiagnosticISO:
    """
    Crée un nouveau diagnostic ISO en statut brouillon.

    - Vérifie l'existence du processus
    - Génère la référence automatique
    - Crée les DiagnosticClause vides pour toutes les clauses applicables

    Raises:
        HTTPException 404 — processus introuvable.
    """
    processus = db.query(Processus).filter(
        Processus.code == payload.processus_code
    ).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus '{payload.processus_code}' introuvable.",
        )

    annee = datetime.now(tz=timezone.utc).year
    reference = _generer_reference(db, payload.processus_code, annee)

    diagnostic = DiagnosticISO(
        reference=reference,
        processus_id=processus.id,
        auditeur_id=auditeur.id,
        periode=payload.periode,
        statut=StatutDiagnostic.brouillon,
        score_global=None,
        niveau_global=None,
    )
    db.add(diagnostic)
    db.flush()  # obtenir l'ID avant de créer les clauses

    # Créer les DiagnosticClause vides pour toutes les clauses applicables
    clauses = (
        db.query(ClauseISO)
        .filter(ClauseISO.est_applicable == True)  # noqa: E712
        .all()
    )
    for clause in clauses:
        dc = DiagnosticClause(
            diagnostic_id=diagnostic.id,
            clause_id=clause.id,
            score=None,
            type_ecart=None,
            commentaire=None,
            recommandation=None,
            genere_automatiquement=False,
        )
        db.add(dc)

    db.commit()
    db.refresh(diagnostic)

    logger.info(
        "Diagnostic créé : %s (%d clauses) par %s",
        reference, len(clauses), auditeur.email,
    )
    return diagnostic


# ---------------------------------------------------------------------------
# §2 — Lecture
# ---------------------------------------------------------------------------

def lister_diagnostics(
    db: Session,
    processus_code: str | None = None,
    statut: StatutDiagnostic | None = None,
    auditeur_id: int | None = None,
    page: int = 1,
    taille_page: int = 20,
) -> dict:
    q = db.query(DiagnosticISO)

    if processus_code:
        processus = db.query(Processus).filter(
            Processus.code == processus_code
        ).first()
        if processus:
            q = q.filter(DiagnosticISO.processus_id == processus.id)

    if statut:
        q = q.filter(DiagnosticISO.statut == statut)

    if auditeur_id:
        q = q.filter(DiagnosticISO.auditeur_id == auditeur_id)

    q = q.order_by(DiagnosticISO.date_diagnostic.desc())
    total = q.count()
    items = q.offset((page - 1) * taille_page).limit(taille_page).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "taille_page": taille_page,
        "pages_total": max(1, -(-total // taille_page)),
    }


def get_diagnostic(db: Session, diagnostic_id: int) -> DiagnosticISO:
    return _get_ou_404(db, diagnostic_id)


# ---------------------------------------------------------------------------
# §3 — Évaluation d'une clause
# ---------------------------------------------------------------------------

def evaluer_clause(
    db: Session,
    diagnostic_id: int,
    clause_id: int,
    payload: ClauseCreate,
    evaluateur: Utilisateur,
) -> DiagnosticClause:
    """
    Enregistre ou met à jour le score d'une clause dans un diagnostic.

    - Calcule automatiquement le type_ecart depuis le score (iso_engine)
    - Génère une recommandation automatique si non fournie
    - Recalcule le score global du diagnostic

    Raises:
        HTTPException 404 — diagnostic ou clause introuvable.
        HTTPException 400 — diagnostic non modifiable.
        HTTPException 400 — score hors plage [0, 100].
    """
    diagnostic = _get_ou_404(db, diagnostic_id)
    _verifier_statut_modifiable(diagnostic)

    if not (0 <= payload.score <= 100):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le score doit être compris entre 0 et 100.",
        )

    clause = db.query(ClauseISO).filter(ClauseISO.id == clause_id).first()
    if not clause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clause {clause_id} introuvable.",
        )

    dc = (
        db.query(DiagnosticClause)
        .filter(
            DiagnosticClause.diagnostic_id == diagnostic_id,
            DiagnosticClause.clause_id == clause_id,
        )
        .first()
    )

    type_ecart = score_to_type_ecart(payload.score)
    recommandation = payload.recommandation or get_recommandation_auto(
        clause.code, payload.score
    )

    if dc:
        dc.score = payload.score
        dc.type_ecart = type_ecart
        dc.commentaire = payload.commentaire
        dc.recommandation = recommandation
    else:
        dc = DiagnosticClause(
            diagnostic_id=diagnostic_id,
            clause_id=clause_id,
            score=payload.score,
            type_ecart=type_ecart,
            commentaire=payload.commentaire,
            recommandation=recommandation,
        )
        db.add(dc)

    db.flush()

    # Recalcul du score global
    _recalculer_score_global(db, diagnostic)
    db.commit()
    db.refresh(dc)

    logger.debug(
        "Clause %s évaluée (score=%d, écart=%s) dans %s par %s",
        clause.code, payload.score, type_ecart, diagnostic.reference, evaluateur.email,
    )
    return dc


def modifier_clause(
    db: Session,
    diagnostic_id: int,
    clause_id: int,
    payload: ClauseUpdate,
    modificateur: Utilisateur,
) -> DiagnosticClause:
    """Mise à jour partielle d'une clause déjà évaluée."""
    diagnostic = _get_ou_404(db, diagnostic_id)
    _verifier_statut_modifiable(diagnostic)

    dc = (
        db.query(DiagnosticClause)
        .filter(
            DiagnosticClause.diagnostic_id == diagnostic_id,
            DiagnosticClause.clause_id == clause_id,
        )
        .first()
    )
    if not dc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clause {clause_id} non évaluée dans ce diagnostic.",
        )

    if payload.score is not None:
        if not (0 <= payload.score <= 100):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le score doit être compris entre 0 et 100.",
            )
        dc.score = payload.score
        dc.type_ecart = score_to_type_ecart(payload.score)

    if payload.commentaire is not None:
        dc.commentaire = payload.commentaire

    if payload.recommandation is not None:
        dc.recommandation = payload.recommandation

    _recalculer_score_global(db, diagnostic)
    db.commit()
    db.refresh(dc)
    return dc


# ---------------------------------------------------------------------------
# §4 — Score global
# ---------------------------------------------------------------------------

def _recalculer_score_global(db: Session, diagnostic: DiagnosticISO) -> None:
    """
    Recalcule et persiste le score global du diagnostic.
    Appelé après chaque évaluation de clause.
    """
    clauses_evaluees = (
        db.query(DiagnosticClause)
        .filter(
            DiagnosticClause.diagnostic_id == diagnostic.id,
            DiagnosticClause.score.isnot(None),
        )
        .all()
    )

    if not clauses_evaluees:
        diagnostic.score_global = None
        diagnostic.niveau_global = None
        return

    # Construire la structure attendue par iso_engine
    clauses_dict = [
        {
            "code": dc.clause.code if dc.clause else "",
            "score": dc.score,
            "est_applicable": True,
        }
        for dc in clauses_evaluees
    ]

    score = calcul_score_global(clauses_dict)
    diagnostic.score_global = score
    diagnostic.niveau_global = score_to_niveau(score)


# ---------------------------------------------------------------------------
# §5 — Workflow
# ---------------------------------------------------------------------------

_TRANSITIONS_VALIDES = {
    StatutDiagnostic.brouillon: [StatutDiagnostic.soumis],
    StatutDiagnostic.soumis:    [StatutDiagnostic.valide, StatutDiagnostic.brouillon],
    StatutDiagnostic.valide:    [StatutDiagnostic.archive],
    StatutDiagnostic.archive:   [],
}


def changer_statut(
    db: Session,
    diagnostic_id: int,
    nouveau_statut: StatutDiagnostic,
    demandeur: Utilisateur,
    commentaire: str | None = None,
) -> DiagnosticISO:
    """
    Transitions workflow :
      brouillon → soumis       (contributeur+)
      soumis    → valide        (pilote/admin)
      soumis    → brouillon     (renvoi en correction — pilote/admin)
      valide    → archive       (admin)

    Raises:
        HTTPException 400 — transition invalide.
        HTTPException 403 — rôle insuffisant.
    """
    diagnostic = _get_ou_404(db, diagnostic_id)
    transitions_possibles = _TRANSITIONS_VALIDES.get(diagnostic.statut, [])

    if nouveau_statut not in transitions_possibles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transition '{diagnostic.statut.value}' → '{nouveau_statut.value}' "
                "non autorisée."
            ),
        )

    # Vérification des droits selon la transition
    if nouveau_statut in (StatutDiagnostic.valide, StatutDiagnostic.archive):
        if not demandeur.peut("valider"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Validation/archivage réservé aux pilotes et administrateurs.",
            )

    # Vérification de complétude avant soumission
    if nouveau_statut == StatutDiagnostic.soumis:
        nb_non_evalues = (
            db.query(DiagnosticClause)
            .filter(
                DiagnosticClause.diagnostic_id == diagnostic_id,
                DiagnosticClause.score.is_(None),
            )
            .count()
        )
        if nb_non_evalues > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{nb_non_evalues} clause(s) non évaluée(s). "
                    "Toutes les clauses doivent être évaluées avant soumission."
                ),
            )

    diagnostic.statut = nouveau_statut
    db.commit()
    db.refresh(diagnostic)

    logger.info(
        "Diagnostic %s → %s par %s",
        diagnostic.reference, nouveau_statut.value, demandeur.email,
    )

    # Génération auto risques/actions à la validation
    if nouveau_statut == StatutDiagnostic.valide:
        _generer_entites_depuis_ecarts(db, diagnostic, demandeur)

    return diagnostic


# ---------------------------------------------------------------------------
# §6 — Génération automatique risques/actions depuis écarts
# ---------------------------------------------------------------------------

def _generer_entites_depuis_ecarts(
    db: Session,
    diagnostic: DiagnosticISO,
    valideur: Utilisateur,
) -> None:
    """
    À la validation d'un diagnostic, génère automatiquement :
      - Un Risque pour chaque clause avec écart majeur
      - Une Action pour chaque clause avec écart majeur ou mineur

    Import différé pour éviter les imports circulaires.
    """
    from app.models.action import Action, StatutAction
    from app.models.risque import Risque, StatutRisque

    clauses_ecart = (
        db.query(DiagnosticClause)
        .filter(
            DiagnosticClause.diagnostic_id == diagnostic.id,
            DiagnosticClause.type_ecart.in_(["majeur", "mineur"]),
        )
        .all()
    )

    annee = datetime.now(tz=timezone.utc).year
    processus = db.query(Processus).filter(
        Processus.id == diagnostic.processus_id
    ).first()
    code_proc = processus.code if processus else "INCONNU"

    nb_risques = nb_actions = 0

    for dc in clauses_ecart:
        # Risque uniquement pour les écarts majeurs
        if dc.type_ecart == "majeur":
            nb_risques_existants = (
                db.query(Risque)
                .filter(Risque.reference.like(f"RSQ-{annee}-{code_proc}-%"))
                .count()
            )
            risque = Risque(
                reference=f"RSQ-{annee}-{code_proc}-{nb_risques_existants + nb_risques + 1:03d}",
                processus_id=diagnostic.processus_id,
                clause_origine_id=dc.clause_id,
                diagnostic_id=diagnostic.id,
                description=f"Risque issu de l'écart majeur — clause {dc.clause.code if dc.clause else dc.clause_id}",
                statut=StatutRisque.identifie,
                genere_automatiquement=True,
            )
            db.add(risque)
            nb_risques += 1

        # Action pour écarts majeurs et mineurs
        nb_actions_existantes = (
            db.query(Action)
            .filter(Action.reference.like(f"ACT-{annee}-{code_proc}-%"))
            .count()
        )
        action = Action(
            reference=f"ACT-{annee}-{code_proc}-{nb_actions_existantes + nb_actions + 1:03d}",
            processus_id=diagnostic.processus_id,
            clause_origine_id=dc.clause_id,
            diagnostic_id=diagnostic.id,
            description=dc.recommandation or f"Action corrective — clause {dc.clause.code if dc.clause else dc.clause_id}",
            statut=StatutAction.planifiee,
            genere_automatiquement=True,
        )
        db.add(action)
        nb_actions += 1

    db.commit()
    logger.info(
        "Génération auto depuis %s : %d risque(s), %d action(s)",
        diagnostic.reference, nb_risques, nb_actions,
    )


# ---------------------------------------------------------------------------
# §7 — Rapport de maturité
# ---------------------------------------------------------------------------

def get_rapport_maturite(db: Session, diagnostic_id: int) -> dict:
    """
    Construit le rapport de maturité complet d'un diagnostic validé.

    Retourne la synthèse par section ISO (§4 à §10) avec scores,
    niveaux, écarts et recommandations.
    """
    diagnostic = _get_ou_404(db, diagnostic_id)

    if diagnostic.statut not in (StatutDiagnostic.valide, StatutDiagnostic.archive):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le rapport n'est disponible que pour les diagnostics validés ou archivés.",
        )

    clauses_evaluees = (
        db.query(DiagnosticClause)
        .filter(DiagnosticClause.diagnostic_id == diagnostic_id)
        .all()
    )

    # Grouper par section (premier niveau du code : "4", "5", ..., "10")
    sections: dict[str, list] = {}
    for dc in clauses_evaluees:
        if not dc.clause:
            continue
        section = dc.clause.code.split(".")[0]
        sections.setdefault(section, []).append(dc)

    synthese_sections = []
    for section_code, clauses in sorted(sections.items()):
        scores = [dc.score for dc in clauses if dc.score is not None]
        score_section = round(sum(scores) / len(scores), 1) if scores else None
        synthese_sections.append({
            "section": section_code,
            "titre": f"§{section_code}",
            "score": score_section,
            "niveau": score_to_niveau(score_section) if score_section is not None else None,
            "nb_clauses": len(clauses),
            "nb_evalues": len(scores),
            "ecarts_majeurs": sum(1 for dc in clauses if dc.type_ecart == "majeur"),
            "ecarts_mineurs": sum(1 for dc in clauses if dc.type_ecart == "mineur"),
        })

    return {
        "reference": diagnostic.reference,
        "processus_code": diagnostic.processus.code if diagnostic.processus else None,
        "periode": diagnostic.periode,
        "score_global": diagnostic.score_global,
        "niveau_global": diagnostic.niveau_global,
        "statut": diagnostic.statut,
        "auditeur": diagnostic.auditeur.email if diagnostic.auditeur else None,
        "date_creation": diagnostic.date_diagnostic,
        "synthese_sections": synthese_sections,
        "total_ecarts_majeurs": sum(s["ecarts_majeurs"] for s in synthese_sections),
        "total_ecarts_mineurs": sum(s["ecarts_mineurs"] for s in synthese_sections),
    }