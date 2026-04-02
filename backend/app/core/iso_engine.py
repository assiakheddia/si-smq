"""
backend/app/core/iso_engine.py

ISOEngine : Moteur de calcul pour la conformité ISO 9001:2015.

Responsabilités :
  1. Calcul du niveau de conformité depuis le score
  2. Agrégation des scores des clauses feuilles aux clauses parents
  3. Calcul de la maturité du processus
  4. Génération de recommandations contextualisées
  5. Validation des données d'audit

Architecture :
  - Pas d'état persistant — chaque appel est idempotent
  - Travaille sur les données via la Session SQLAlchemy
  - Trigge les recalculs en cascade
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.diagnostic import DiagnosticISO, NiveauConformite, StatutDiagnostic
from app.models.clause_iso import ClauseISO
from app.models.processus import Processus
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# RECOMMANDATIONS CONTEXTUALISÉES
# =============================================================================

RECOMMANDATIONS_PAR_NIVEAU: Dict[NiveauConformite, str] = {
    NiveauConformite.non_conforme: (
        "⚠️ Action immédiate requise. Mettre en place la conformité fondamentale à cette exigence. "
        "Identifier les écarts critiques et développer un plan d'action structuré."
    ),
    NiveauConformite.partiel: (
        "⚠️ Enjeu significatif. La conformité est partiellement mise en œuvre. "
        "Complémenter la documentation, formaliser les procédures et renforcer les contrôles."
    ),
    NiveauConformite.avance: (
        "📊 Bonne trajectoire. La plupart des exigences sont mises en œuvre. "
        "Consolider les acquis, documenter les bonnes pratiques et affermir la vérification."
    ),
    NiveauConformite.conforme: (
        "✅ Conforme. Cette exigence est maîtrisée et vérifiée régulièrement. "
        "Maintenir le suivi et anticiper les évolutions réglementaires."
    ),
}


# =============================================================================
# CALCULS DE CONFORMITÉ
# =============================================================================

class ISOEngine:
    """
    Moteur de calcul ISO 9001:2015.
    Méthodes statiques — pas d'état interne.
    """

    # =========================================================================
    # Niveau → Score
    # =========================================================================

    @staticmethod
    def score_to_niveau(score: float) -> NiveauConformite:
        """
        Convertir un score (0-100) en niveau de conformité.

        Échelle :
          0-25%   → non_conforme
          25-50%  → partiel
          50-75%  → avance
          75-100% → conforme
        """
        if score < 0 or score > 100:
            raise ValueError(f"Score invalide : {score}. Doit être entre 0 et 100.")

        if score >= 75:
            return NiveauConformite.conforme
        elif score >= 50:
            return NiveauConformite.avance
        elif score >= 25:
            return NiveauConformite.partiel
        else:
            return NiveauConformite.non_conforme

    # =========================================================================
    # Recommandations
    # =========================================================================

    @staticmethod
    def generer_recommandation(
        niveau: NiveauConformite,
        clause: ClauseISO,
        description_ecart: Optional[str] = None,
    ) -> str:
        """
        Générer une recommandation contextualisée pour un diagnostic.

        Args:
            niveau: Niveau de conformité calculé
            clause: Clause ISO concernée
            description_ecart: Description des écarts identifiés

        Returns:
            Texte de recommandation structuré
        """
        base_rec = RECOMMANDATIONS_PAR_NIVEAU.get(
            niveau, "Évaluation en cours — recommandation à affiner."
        )

        # Ajouter le contexte de la clause
        contexte = f"\n\n**Exigence ISO :** {clause.code} — {clause.titre}"
        if description_ecart:
            contexte += f"\n**Écarts identifiés :** {description_ecart}"

        return base_rec + contexte

    # =========================================================================
    # Agrégation de scores parent ← enfants
    # =========================================================================

    @staticmethod
    def recalculer_score_clause_parent(db: Session, clause_parent: ClauseISO) -> None:
        """
        Recalculer le score d'une clause non-feuille depuis ses enfants.

        Logique :
          - Si la clause a des enfants applicables : moyenne des scores des enfants
          - Si pas d'enfants : score reste inchangé (0 par défaut)

        Cette méthode est appelée en cascade quand un diagnostic feuille change.

        Args:
            db: Session SQLAlchemy
            clause_parent: Clause parent à recalculer (doit avoir des enfants)
        """
        if clause_parent.est_feuille:
            logger.debug(f"Clause {clause_parent.code} est une feuille — rien à agréger.")
            return

        # Récupérer les enfants applicables
        enfants_applicables = db.query(ClauseISO).filter(
            and_(
                ClauseISO.parent_id == clause_parent.id,
                ClauseISO.est_applicable == True,
            )
        ).all()

        if not enfants_applicables:
            logger.debug(f"Clause {clause_parent.code} n'a pas d'enfants applicables.")
            return

        # Calculer le score moyen des enfants
        # (en production, on pourrait pondérer certaines clauses)
        scores_enfants = []
        for enfant in enfants_applicables:
            if enfant.est_feuille:
                # Récupérer le score le plus récent de ce diagnostic
                diag_enfant = (
                    db.query(DiagnosticISO)
                    .filter(
                        DiagnosticISO.clause_iso_id == enfant.id,
                        DiagnosticISO.statut.in_([StatutDiagnostic.valide, StatutDiagnostic.en_amelioration]),
                    )
                    .order_by(DiagnosticISO.date_validation.desc())
                    .first()
                )
                if diag_enfant and diag_enfant.score is not None:
                    scores_enfants.append(diag_enfant.score)
            else:
                # Clause intermédiaire — ignorer (elle sera calculée récursivement)
                pass

        if scores_enfants:
            score_moyen = sum(scores_enfants) / len(scores_enfants)
            logger.info(
                f"Clause {clause_parent.code} : score moyen des enfants = {score_moyen:.1f}"
            )
        else:
            logger.debug(f"Clause {clause_parent.code} : aucun diagnostic d'enfant applicable.")

    @staticmethod
    def propager_recalcul_parents(db: Session, clause: ClauseISO) -> None:
        """
        Propager le recalcul vers tous les parents d'une clause.

        Args:
            db: Session SQLAlchemy
            clause: Clause dont les parents doivent être recalculés
        """
        courant = clause
        visited = set()

        while courant and courant.parent_id not in visited:
            visited.add(courant.id)
            if courant.parent:
                ISOEngine.recalculer_score_clause_parent(db, courant.parent)
                courant = courant.parent
            else:
                break

    # =========================================================================
    # Score de maturité du processus
    # =========================================================================

    @staticmethod
    def calculer_maturite_processus(db: Session, processus: Processus) -> float:
        """
        Calculer le score de maturité d'un processus.

        Logique :
          - Moyenne des scores de tous les diagnostics valides du processus
          - Si aucun diagnostic : 0

        Args:
            db: Session SQLAlchemy
            processus: Processus à évaluer

        Returns:
            Score de maturité (0-100)
        """
        diagnostics = db.query(DiagnosticISO).filter(
            and_(
                DiagnosticISO.processus_id == processus.id,
                DiagnosticISO.statut.in_([StatutDiagnostic.valide, StatutDiagnostic.en_amelioration]),
            )
        ).all()

        if not diagnostics:
            logger.debug(f"Aucun diagnostic valide pour {processus.code} — maturité = 0")
            return 0.0

        scores = [d.score for d in diagnostics if d.score is not None]
        if not scores:
            return 0.0

        maturite = sum(scores) / len(scores)
        logger.info(f"Processus {processus.code} : maturité = {maturite:.1f}")

        # Mettre à jour le score_maturite du processus
        processus.score_maturite = maturite
        db.commit()

        return maturite

    # =========================================================================
    # Validation de diagnostic
    # =========================================================================

    @staticmethod
    def valider_diagnostic(
        db: Session, diagnostic: DiagnosticISO, auditeur_id: Optional[int] = None
    ) -> None:
        """
        Valider un diagnostic (passer de brouillon à valide).

        Actions :
          1. Vérifier les champs requis
          2. Recalculer le niveau depuis le score
          3. Générer la recommandation si absente
          4. Marquer comme validé
          5. Propager le recalcul aux parents

        Args:
            db: Session SQLAlchemy
            diagnostic: Diagnostic à valider
            auditeur_id: ID de l'auditeur qui valide (optionnel)

        Raises:
            ValueError: Si les données du diagnostic sont incohérentes
        """
        # Vérifications
        if diagnostic.score is None or diagnostic.score < 0 or diagnostic.score > 100:
            raise ValueError(
                f"Score invalide pour le diagnostic {diagnostic.id} : {diagnostic.score}"
            )

        if not diagnostic.clause.est_feuille:
            raise ValueError(
                f"Impossible d'attacher un diagnostic à une clause non-feuille {diagnostic.clause.code}"
            )

        # Recalculer le niveau
        diagnostic.niveau = ISOEngine.score_to_niveau(diagnostic.score)

        # Générer recommandation si absente
        if not diagnostic.recommandation:
            diagnostic.recommandation = ISOEngine.generer_recommandation(
                diagnostic.niveau, diagnostic.clause, diagnostic.description_ecart
            )

        # Marquer comme validé
        diagnostic.statut = StatutDiagnostic.valide
        from datetime import datetime
        diagnostic.date_validation = datetime.utcnow()
        
        if auditeur_id:
            diagnostic.auditeur_id = auditeur_id

        db.add(diagnostic)
        db.flush()

        # Propager le recalcul au parent de la clause
        if diagnostic.clause.parent:
            ISOEngine.propager_recalcul_parents(db, diagnostic.clause)

        # Recalculer la maturité du processus
        ISOEngine.calculer_maturite_processus(db, diagnostic.processus)

        db.commit()
        logger.info(
            f"Diagnostic validé : {diagnostic.clause.code} × {diagnostic.processus.code} "
            f"→ {diagnostic.niveau.value} (score {diagnostic.score:.1f})"
        )

    # =========================================================================
    # Synthèse de conformité
    # =========================================================================

    @staticmethod
    def synthese_conformite_processus(db: Session, processus: Processus) -> Dict:
        """
        Générer une synthèse de conformité pour un processus.

        Retourne :
          - Maturité globale (%)
          - Répartition par niveau (non_conforme, partiel, avance, conforme)
          - Points critiques (clauses non conformes)
          - Trajectoire (historique des scores)

        Args:
            db: Session SQLAlchemy
            processus: Processus à analyser

        Returns:
            Dict avec synthèse de conformité
        """
        diagnostics = db.query(DiagnosticISO).filter(
            and_(
                DiagnosticISO.processus_id == processus.id,
                DiagnosticISO.statut.in_([StatutDiagnostic.valide, StatutDiagnostic.en_amelioration]),
            )
        ).all()

        if not diagnostics:
            return {
                "processus_code": processus.code,
                "maturite": 0.0,
                "nb_diagnostics": 0,
                "repartition": {
                    "non_conforme": 0,
                    "partiel": 0,
                    "avance": 0,
                    "conforme": 0,
                },
                "points_critiques": [],
            }

        # Compter par niveau
        repartition = {
            "non_conforme": len([d for d in diagnostics if d.niveau == NiveauConformite.non_conforme]),
            "partiel": len([d for d in diagnostics if d.niveau == NiveauConformite.partiel]),
            "avance": len([d for d in diagnostics if d.niveau == NiveauConformite.avance]),
            "conforme": len([d for d in diagnostics if d.niveau == NiveauConformite.conforme]),
        }

        # Points critiques
        points_critiques = [
            {
                "clause_code": d.clause.code,
                "clause_titre": d.clause.titre,
                "score": d.score,
                "niveau": d.niveau.value,
                "description_ecart": d.description_ecart,
            }
            for d in diagnostics
            if d.niveau == NiveauConformite.non_conforme
        ]

        maturite = processus.score_maturite or 0.0

        return {
            "processus_code": processus.code,
            "processus_nom": processus.nom,
            "maturite": maturite,
            "nb_diagnostics": len(diagnostics),
            "repartition": repartition,
            "points_critiques": points_critiques,
        }
