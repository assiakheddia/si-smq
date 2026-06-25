"""
services/diagnostic_smq_service.py — Orchestration du Moteur Analytique

Lance un DiagnosticSMQ : analyse le Processus section par section
(§4 à §10 ISO 9001) via moteur_analytique.analyser_section(), persiste
un Dysfonctionnement par section non conforme, et agrège le score global.

Référence générée : "DSMQ-2026-PROC-007-001"
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.diagnostic_smq import (
    DiagnosticSMQ,
    Dysfonctionnement,
    GraviteDysfonctionnement,
    SourceEvaluation,
    StatutDiagnosticSMQ,
)
from app.models.processus import Processus
from app.models.utilisateur import Utilisateur
from app.services.moteur_analytique import SECTIONS_ISO, analyser_section

logger = logging.getLogger(__name__)


def _generer_reference(db: Session, processus_code: str, annee: int) -> str:
    count = (
        db.query(DiagnosticSMQ)
        .filter(DiagnosticSMQ.reference.like(f"DSMQ-{annee}-{processus_code}-%"))
        .count()
    )
    return f"DSMQ-{annee}-{processus_code}-{count + 1:03d}"


def _get_processus_ou_404(db: Session, processus_id: int) -> Processus:
    processus = db.query(Processus).filter(Processus.id == processus_id).first()
    if not processus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus {processus_id} introuvable.",
        )
    return processus


def lancer_diagnostic(
    db: Session,
    processus_id: int,
    demandeur: Utilisateur,
) -> DiagnosticSMQ:
    """
    Lance le Moteur Analytique pour un Processus : analyse chaque section
    ISO 9001 indépendamment (anti-saturation), persiste les dysfonctionnements
    détectés, et calcule le score global du run.

    Ne lève jamais d'exception côté IA — chaque section bascule en repli
    local en cas d'échec (voir moteur_analytique.analyser_section).

    Raises:
        HTTPException 404 — processus introuvable.
    """
    processus = _get_processus_ou_404(db, processus_id)

    annee = datetime.now(tz=timezone.utc).year
    reference = _generer_reference(db, processus.code or f"P{processus.id}", annee)

    diagnostic = DiagnosticSMQ(
        reference=reference,
        processus_id=processus.id,
        declencheur_id=demandeur.id,
        statut=StatutDiagnosticSMQ.en_cours,
    )
    db.add(diagnostic)
    db.flush()

    # Anciens dysfonctionnements du processus remplacés par ce nouveau run
    db.query(Dysfonctionnement).filter(
        Dysfonctionnement.processus_id == processus.id
    ).delete()

    scores: list[float] = []
    sources: set[str] = set()

    for ordre, section in enumerate(SECTIONS_ISO):
        resultat = analyser_section(processus, section)
        scores.append(resultat.score)
        sources.add(resultat.source)

        if resultat.gravite == "conforme":
            continue  # pas de dysfonctionnement à enregistrer pour cette section

        dc = Dysfonctionnement(
            diagnostic_id=diagnostic.id,
            processus_id=processus.id,
            clause_iso_code=resultat.clause_iso_code,
            titre=resultat.titre,
            description=resultat.description,
            consequences=resultat.consequences,
            causes=resultat.causes,
            ameliorations=resultat.ameliorations,
            gravite=GraviteDysfonctionnement(resultat.gravite),
            source=SourceEvaluation(resultat.source),
            ordre=ordre,
        )
        db.add(dc)

    diagnostic.score_global = round(sum(scores) / len(scores), 1) if scores else None
    diagnostic.source_globale = (
        SourceEvaluation.ia if sources == {"ia"}
        else SourceEvaluation.local if sources == {"local"}
        else SourceEvaluation.mixte
    )
    diagnostic.statut = StatutDiagnosticSMQ.termine
    diagnostic.date_fin = datetime.now(tz=timezone.utc)

    db.commit()
    db.refresh(diagnostic)

    logger.info(
        "DiagnosticSMQ %s terminé pour processus %s (score=%s, source=%s) par %s",
        diagnostic.reference, processus.code, diagnostic.score_global,
        diagnostic.source_globale, demandeur.email,
    )
    return diagnostic


def lister_dysfonctionnements(db: Session, processus_id: int) -> list[Dysfonctionnement]:
    """Liste les dysfonctionnements du dernier run, ordonnés pour le carousel."""
    _get_processus_ou_404(db, processus_id)
    return (
        db.query(Dysfonctionnement)
        .filter(Dysfonctionnement.processus_id == processus_id)
        .order_by(Dysfonctionnement.ordre)
        .all()
    )
