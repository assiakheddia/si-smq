"""
backend/app/core/iso_engine.py

Noyau ISO 9001 — règles métier pures, sans accès DB direct.
Toutes les fonctions sont stateless et testables unitairement.

Responsabilités :
  1. score_to_niveau()         → Float → NiveauMaturite
  2. score_to_type_ecart()     → Float → TypeEcart
  3. get_recommandation_auto() → (code_clause, score) → str
  4. calcul_score_global()     → [DiagnosticClause] → Float
  5. valider_processus_iso()   → vérifie les prérequis ISO avant diagnostic

Le DiagnosticService appelle ces fonctions — l'engine ne touche jamais
à la session SQLAlchemy directement.
"""

from app.models.diagnostic import NiveauMaturite, TypeEcart


# =============================================================================
# 1. SCORE → NIVEAU DE MATURITÉ
# =============================================================================

# Seuils ISO — modifiables ici uniquement (source de vérité unique)
_SEUILS_NIVEAU = [
    (75.0, NiveauMaturite.conforme),
    (50.0, NiveauMaturite.avance),
    (25.0, NiveauMaturite.partiel),
    (0.0,  NiveauMaturite.non_conforme),
]


def score_to_niveau(score: float) -> NiveauMaturite:
    """
    Convertit un score numérique (0–100) en niveau de maturité ISO.

    >>> score_to_niveau(80)  → NiveauMaturite.conforme
    >>> score_to_niveau(60)  → NiveauMaturite.avance
    >>> score_to_niveau(35)  → NiveauMaturite.partiel
    >>> score_to_niveau(10)  → NiveauMaturite.non_conforme
    """
    score = max(0.0, min(100.0, score))  # Clamp 0–100
    for seuil, niveau in _SEUILS_NIVEAU:
        if score >= seuil:
            return niveau
    return NiveauMaturite.non_conforme


# =============================================================================
# 2. SCORE → TYPE D'ÉCART
# =============================================================================

def score_to_type_ecart(score: float) -> TypeEcart:
    """
    Classifie automatiquement l'écart selon le score.
    Correspond à la classification 'majeur/mineur/observation' du diagramme conceptuel.

    - 0  – 25  → majeur      (blocant certification)
    - 25 – 50  → mineur      (à corriger, non blocant)
    - 50 – 75  → observation (point de vigilance)
    - 75 – 100 → conforme    (aucun écart)
    """
    score = max(0.0, min(100.0, score))
    if score >= 75.0:
        return TypeEcart.conforme
    elif score >= 50.0:
        return TypeEcart.observation
    elif score >= 25.0:
        return TypeEcart.mineur
    else:
        return TypeEcart.majeur


# =============================================================================
# 3. RECOMMANDATION AUTOMATIQUE PAR CLAUSE
# =============================================================================

# Bibliothèque de recommandations par préfixe de clause + niveau d'écart
# Structure : { "code_clause_prefix": { TypeEcart: "recommandation" } }
_RECOMMANDATIONS: dict[str, dict[TypeEcart, str]] = {

    # ---- Section 4 — Contexte -----------------------------------------------
    "4.1": {
        TypeEcart.majeur:      "Réaliser une analyse SWOT documentée pour identifier les enjeux internes et externes. Valider en revue de direction.",
        TypeEcart.mineur:      "Formaliser et mettre à jour l'analyse du contexte. S'assurer qu'elle est revue à chaque changement majeur.",
        TypeEcart.observation: "Enrichir l'analyse contextuelle avec des données quantitatives (indicateurs sectoriels, benchmarks).",
        TypeEcart.conforme:    "Maintenir la mise à jour régulière de l'analyse de contexte (au moins annuelle).",
    },
    "4.2": {
        TypeEcart.majeur:      "Identifier et documenter toutes les parties intéressées pertinentes et leurs exigences (clients, tutelles, régulateurs).",
        TypeEcart.mineur:      "Compléter la liste des parties intéressées et vérifier la prise en compte de leurs exigences dans les processus.",
        TypeEcart.observation: "Prévoir une revue périodique des attentes des parties intéressées.",
        TypeEcart.conforme:    "Continuer à surveiller l'évolution des attentes des parties intéressées.",
    },
    "4.3": {
        TypeEcart.majeur:      "Définir et documenter le domaine d'application du SMQ avec les exclusions justifiées.",
        TypeEcart.mineur:      "Préciser les limites du SMQ et documenter formellement les exclusions de clauses.",
        TypeEcart.observation: "Vérifier que le domaine d'application est communiqué à toutes les parties concernées.",
        TypeEcart.conforme:    "Maintenir le domaine d'application à jour lors de chaque évolution organisationnelle.",
    },
    "4.4": {
        TypeEcart.majeur:      "Cartographier tous les processus du SMQ, définir leurs interactions, pilotes et indicateurs de performance.",
        TypeEcart.mineur:      "Compléter la cartographie des processus et formaliser les interactions entre processus.",
        TypeEcart.observation: "Améliorer la documentation des interactions entre processus.",
        TypeEcart.conforme:    "Maintenir la cartographie des processus à jour.",
    },

    # ---- Section 5 — Leadership ---------------------------------------------
    "5.1": {
        TypeEcart.majeur:      "La direction doit s'impliquer formellement dans le SMQ : signer la politique qualité, allouer des ressources dédiées, participer aux revues.",
        TypeEcart.mineur:      "Renforcer la visibilité de l'engagement de la direction via des communications régulières sur la qualité.",
        TypeEcart.observation: "Documenter les preuves de l'engagement de la direction (comptes-rendus de revue, allocations budgétaires).",
        TypeEcart.conforme:    "Maintenir et renforcer la culture qualité portée par la direction.",
    },
    "5.2": {
        TypeEcart.majeur:      "Rédiger, approuver et diffuser une politique qualité formelle alignée sur le contexte et les objectifs stratégiques.",
        TypeEcart.mineur:      "Réviser la politique qualité pour l'aligner sur le contexte actuel et la rediffuser.",
        TypeEcart.observation: "Vérifier que la politique qualité est comprise et appliquée à tous les niveaux.",
        TypeEcart.conforme:    "Réviser la politique qualité lors de chaque revue de direction.",
    },
    "5.3": {
        TypeEcart.majeur:      "Définir et documenter les rôles, responsabilités et autorités pour tous les postes clés du SMQ.",
        TypeEcart.mineur:      "Mettre à jour les fiches de poste et l'organigramme qualité.",
        TypeEcart.observation: "S'assurer que les responsabilités qualité sont communiquées et comprises.",
        TypeEcart.conforme:    "Revoir les responsabilités à chaque changement organisationnel.",
    },

    # ---- Section 6 — Planification ------------------------------------------
    "6.1": {
        TypeEcart.majeur:      "Mettre en place un registre des risques et opportunités avec évaluation probabilité × gravité et plans d'action associés.",
        TypeEcart.mineur:      "Compléter l'analyse des risques pour tous les processus et planifier les actions de traitement.",
        TypeEcart.observation: "Réviser et mettre à jour le registre des risques au moins semestriellement.",
        TypeEcart.conforme:    "Maintenir le suivi des risques et intégrer les résultats dans les revues de direction.",
    },
    "6.2": {
        TypeEcart.majeur:      "Définir des objectifs qualité SMART pour chaque processus, avec indicateurs de mesure et responsables.",
        TypeEcart.mineur:      "Rendre les objectifs qualité mesurables et planifier les actions pour les atteindre.",
        TypeEcart.observation: "Renforcer le suivi de l'atteinte des objectifs qualité.",
        TypeEcart.conforme:    "Revoir et ajuster les objectifs qualité lors de chaque revue de direction.",
    },
    "6.3": {
        TypeEcart.majeur:      "Établir une procédure de gestion des modifications du SMQ avec analyse d'impact avant tout changement.",
        TypeEcart.mineur:      "Documenter les modifications apportées au SMQ et en évaluer l'impact.",
        TypeEcart.observation: "Renforcer la traçabilité des modifications du SMQ.",
        TypeEcart.conforme:    "Maintenir le processus de gestion des modifications à jour.",
    },

    # ---- Section 7 — Support ------------------------------------------------
    "7.1": {
        TypeEcart.majeur:      "Identifier et documenter toutes les ressources nécessaires au SMQ (humaines, infrastructures, équipements, financières).",
        TypeEcart.mineur:      "Compléter le plan de ressources et s'assurer de l'adéquation avec les besoins des processus.",
        TypeEcart.observation: "Anticiper les besoins en ressources dans la planification annuelle.",
        TypeEcart.conforme:    "Réviser le plan de ressources à chaque cycle de planification.",
    },
    "7.2": {
        TypeEcart.majeur:      "Définir les compétences requises pour chaque poste, évaluer les écarts et mettre en place un plan de formation.",
        TypeEcart.mineur:      "Mettre à jour les matrices de compétences et planifier les formations manquantes.",
        TypeEcart.observation: "Renforcer le suivi des compétences et l'évaluation de l'efficacité des formations.",
        TypeEcart.conforme:    "Maintenir la matrice de compétences à jour et revoir le plan de formation annuellement.",
    },
    "7.3": {
        TypeEcart.majeur:      "Mettre en place un programme de sensibilisation à la politique qualité, aux objectifs et à l'importance de la contribution de chacun.",
        TypeEcart.mineur:      "Renforcer la communication interne sur les objectifs qualité et les résultats obtenus.",
        TypeEcart.observation: "Varier les supports de sensibilisation pour maintenir l'engagement.",
        TypeEcart.conforme:    "Maintenir la sensibilisation continue à la culture qualité.",
    },
    "7.4": {
        TypeEcart.majeur:      "Établir un plan de communication interne et externe couvrant : quoi, quand, à qui, comment communiquer sur le SMQ.",
        TypeEcart.mineur:      "Formaliser les canaux et fréquences de communication sur la qualité.",
        TypeEcart.observation: "Évaluer l'efficacité des communications et ajuster les canaux si nécessaire.",
        TypeEcart.conforme:    "Maintenir le plan de communication à jour.",
    },
    "7.5": {
        TypeEcart.majeur:      "Mettre en place une gestion documentaire complète : identification, création, approbation, diffusion, archivage et contrôle d'accès.",
        TypeEcart.mineur:      "Renforcer la maîtrise des documents : versioning, droits d'accès et procédure de mise à jour.",
        TypeEcart.observation: "Améliorer la traçabilité des modifications documentaires.",
        TypeEcart.conforme:    "Maintenir le système de gestion documentaire et former les nouveaux arrivants.",
    },

    # ---- Section 8 — Réalisation opérationnelle -----------------------------
    "8.1": {
        TypeEcart.majeur:      "Planifier et documenter la maîtrise de tous les processus opérationnels avec critères d'acceptation et indicateurs de contrôle.",
        TypeEcart.mineur:      "Renforcer la documentation des processus opérationnels et leurs critères de maîtrise.",
        TypeEcart.observation: "Améliorer la traçabilité des contrôles opérationnels.",
        TypeEcart.conforme:    "Maintenir et améliorer en continu la maîtrise opérationnelle.",
    },
    "8.2": {
        TypeEcart.majeur:      "Documenter les exigences clients et réglementaires, et établir une procédure de revue avant engagement.",
        TypeEcart.mineur:      "Renforcer la revue des exigences et la communication avec les clients.",
        TypeEcart.observation: "Améliorer le suivi des modifications d'exigences clients.",
        TypeEcart.conforme:    "Maintenir la veille sur les exigences réglementaires applicables.",
    },
    "8.4": {
        TypeEcart.majeur:      "Établir un processus de qualification et de surveillance des prestataires externes avec critères d'évaluation documentés.",
        TypeEcart.mineur:      "Renforcer la maîtrise des prestataires externes : évaluation périodique et exigences contractuelles.",
        TypeEcart.observation: "Améliorer le suivi des performances des prestataires.",
        TypeEcart.conforme:    "Maintenir la liste des prestataires qualifiés et revoir les évaluations annuellement.",
    },
    "8.5": {
        TypeEcart.majeur:      "Documenter et mettre en œuvre des conditions de maîtrise pour tous les processus de réalisation (procédures, modes opératoires, contrôles).",
        TypeEcart.mineur:      "Renforcer la traçabilité et la maîtrise des processus de réalisation.",
        TypeEcart.observation: "Améliorer la documentation des contrôles en cours de réalisation.",
        TypeEcart.conforme:    "Maintenir les conditions de maîtrise opérationnelle à jour.",
    },
    "8.7": {
        TypeEcart.majeur:      "Mettre en place une procédure de traitement des non-conformités : identification, isolation, traitement, enregistrement.",
        TypeEcart.mineur:      "Renforcer la systématisation du traitement et de l'enregistrement des non-conformités.",
        TypeEcart.observation: "Améliorer l'analyse des tendances des non-conformités.",
        TypeEcart.conforme:    "Maintenir le système de traitement des non-conformités et analyser les tendances.",
    },

    # ---- Section 9 — Évaluation des performances ----------------------------
    "9.1": {
        TypeEcart.majeur:      "Définir les indicateurs de performance pour chaque processus, mettre en place la collecte et l'analyse des données.",
        TypeEcart.mineur:      "Renforcer le suivi des indicateurs et l'analyse des résultats pour orienter les décisions.",
        TypeEcart.observation: "Améliorer la fréquence et la profondeur de l'analyse des performances.",
        TypeEcart.conforme:    "Maintenir le tableau de bord des performances et l'intégrer aux revues de direction.",
    },
    "9.2": {
        TypeEcart.majeur:      "Établir et mettre en œuvre un programme d'audit interne annuel couvrant tous les processus du SMQ.",
        TypeEcart.mineur:      "Régulariser la réalisation des audits internes selon le programme planifié.",
        TypeEcart.observation: "Améliorer la qualité des rapports d'audit et le suivi des actions correctives.",
        TypeEcart.conforme:    "Maintenir le programme d'audit et former de nouveaux auditeurs internes.",
    },
    "9.3": {
        TypeEcart.majeur:      "Organiser des revues de direction formelles à intervalles planifiés avec tous les éléments d'entrée requis par la norme.",
        TypeEcart.mineur:      "Renforcer le contenu et la fréquence des revues de direction.",
        TypeEcart.observation: "Améliorer le suivi des décisions prises en revue de direction.",
        TypeEcart.conforme:    "Maintenir la rigueur et la traçabilité des revues de direction.",
    },

    # ---- Section 10 — Amélioration ------------------------------------------
    "10.1": {
        TypeEcart.majeur:      "Identifier systématiquement les opportunités d'amélioration à partir des données de surveillance et des retours d'expérience.",
        TypeEcart.mineur:      "Formaliser le processus d'identification et de sélection des opportunités d'amélioration.",
        TypeEcart.observation: "Renforcer la culture de l'amélioration continue.",
        TypeEcart.conforme:    "Maintenir l'élan d'amélioration continue.",
    },
    "10.2": {
        TypeEcart.majeur:      "Mettre en place un système formel de traitement des non-conformités et d'actions correctives avec analyse des causes racines.",
        TypeEcart.mineur:      "Renforcer l'analyse des causes et le suivi de l'efficacité des actions correctives.",
        TypeEcart.observation: "Améliorer la capitalisation des retours d'expérience sur les actions correctives.",
        TypeEcart.conforme:    "Maintenir le système d'actions correctives et mesurer leur efficacité.",
    },
    "10.3": {
        TypeEcart.majeur:      "Intégrer l'amélioration continue comme démarche structurée (PDCA) avec objectifs, mesures et revue régulière.",
        TypeEcart.mineur:      "Renforcer le cycle PDCA et documenter les améliorations réalisées.",
        TypeEcart.observation: "Capitaliser les succès d'amélioration pour diffuser les bonnes pratiques.",
        TypeEcart.conforme:    "Maintenir la dynamique d'amélioration continue et la valoriser en revue de direction.",
    },
}

# Recommandation générique par niveau (fallback si clause non couverte)
_RECOMMANDATIONS_GENERIQUES: dict[TypeEcart, str] = {
    TypeEcart.majeur:      "Écart majeur identifié. Mettre en place des actions correctives prioritaires et documenter les preuves de conformité.",
    TypeEcart.mineur:      "Écart mineur identifié. Planifier les actions correctives dans les prochains cycles.",
    TypeEcart.observation: "Point de vigilance. Surveiller l'évolution et anticiper les actions préventives.",
    TypeEcart.conforme:    "Clause conforme. Maintenir les pratiques en place et les documenter.",
}


def get_recommandation_auto(code_clause: str, score: float) -> str:
    """
    Retourne la recommandation automatique pour une clause et un score donnés.

    Recherche par préfixe décroissant :
      "7.1.5.2" → essaie "7.1.5.2", "7.1.5", "7.1", "7" → premier match
    Cela permet de couvrir les sous-clauses détaillées avec la règle de leur parent.
    """
    type_ecart = score_to_type_ecart(score)

    # Recherche par préfixe décroissant
    parts = code_clause.split(".")
    for i in range(len(parts), 0, -1):
        prefix = ".".join(parts[:i])
        if prefix in _RECOMMANDATIONS:
            return _RECOMMANDATIONS[prefix].get(
                type_ecart,
                _RECOMMANDATIONS_GENERIQUES[type_ecart],
            )

    return _RECOMMANDATIONS_GENERIQUES[type_ecart]


# =============================================================================
# 4. CALCUL DU SCORE GLOBAL (agrégation pondérée)
# =============================================================================

def calcul_score_global(clauses_evaluees: list) -> float:
    """
    Calcule le score global d'un DiagnosticISO depuis ses DiagnosticClause.

    Formule : Σ(score_i × poids_i) / Σ(poids_i)
    Seules les clauses applicables (est_applicable=True) sont incluses.

    Retourne 0.0 si aucune clause applicable n'est évaluée.

    Paramètre : liste de DiagnosticClause (ou tout objet avec .score, .poids, .est_applicable)
    """
    applicables = [c for c in clauses_evaluees if c.est_applicable]

    if not applicables:
        return 0.0

    total_pondere = sum(c.score * c.poids for c in applicables)
    total_poids   = sum(c.poids for c in applicables)

    if total_poids == 0:
        return 0.0

    return round(total_pondere / total_poids, 2)


# =============================================================================
# 5. VALIDATION DES PRÉREQUIS ISO AVANT DIAGNOSTIC
# =============================================================================

# =============================================================================
# 6. CALCUL RPN ET CRITICITÉ (AMDEC)
# =============================================================================

# Seuils RPN → NiveauCriticite (source de vérité unique)
# RPN max théorique = 5 × 5 × 5 = 125
_SEUILS_RPN = [
    (81.0,  "critique"),   # Traitement urgent obligatoire
    (51.0,  "eleve"),      # Plan d'atténuation requis
    (21.0,  "modere"),     # Surveillance renforcée
    (1.0,   "faible"),     # Acceptable, surveillance standard
]


def calcul_rpn(probabilite: int, gravite: int, detectabilite: int) -> float:
    """
    Calcule le RPN (Risk Priority Number) style AMDEC.

    Paramètres : chacun sur une échelle 1–5.
      probabilite   : vraisemblance d'occurrence
      gravite       : impact sur la qualité / certification
      detectabilite : difficulté de détection (1=facile, 5=difficile)

    Retourne un float entre 1.0 et 125.0.

    >>> calcul_rpn(5, 5, 5) → 125.0   (risque critique maximal)
    >>> calcul_rpn(1, 1, 1) → 1.0     (risque négligeable)
    >>> calcul_rpn(3, 4, 2) → 24.0    (risque modéré)
    """
    # Clamp chaque dimension entre 1 et 5
    p = max(1, min(5, probabilite))
    g = max(1, min(5, gravite))
    d = max(1, min(5, detectabilite))
    return float(p * g * d)


def rpn_to_criticite(rpn: float) -> str:
    """
    Convertit un RPN en niveau de criticité.

    Seuils :
      81 – 125 → critique   (blocant, traitement immédiat)
      51 –  80 → eleve      (plan d'atténuation obligatoire)
      21 –  50 → modere     (surveillance renforcée)
       1 –  20 → faible     (acceptable, surveillance standard)
    """
    for seuil, niveau in _SEUILS_RPN:
        if rpn >= seuil:
            return niveau
    return "faible"


def evaluer_risque(probabilite: int, gravite: int, detectabilite: int) -> dict:
    """
    Évalue un risque complet : RPN + criticité en un seul appel.
    Utilisé par le RisqueService avant chaque sauvegarde.

    Retourne :
      {
        "rpn": 24.0,
        "criticite": "modere",
        "prioritaire": False   # True si critique ou eleve
      }
    """
    rpn = calcul_rpn(probabilite, gravite, detectabilite)
    criticite = rpn_to_criticite(rpn)
    return {
        "rpn": rpn,
        "criticite": criticite,
        "prioritaire": criticite in ("critique", "eleve"),
    }


def risque_necessite_action(rpn: float) -> bool:
    """
    Retourne True si le RPN exige la création d'une Action corrective.
    Seuil : RPN ≥ 21 (modéré ou au-dessus).
    Utilisé par DiagnosticService pour la création automatique d'actions.
    """
    return rpn >= 21.0


def valider_processus_iso(processus) -> list[str]:
    """
    Vérifie que les prérequis ISO 9001 sont satisfaits avant de créer un diagnostic.
    Retourne une liste d'avertissements (vide = tout est OK).

    Prérequis vérifiés :
      - Processus a un pilote assigné           (§ 5.3)
      - Processus a un objectif documenté       (§ 4.4)
      - Processus a des entrées/sorties définies (§ 4.4)
      - Processus a un code de référence        (traçabilité)
    """
    avertissements = []

    if not processus.pilote_id:
        avertissements.append(
            f"[§5.3] Le processus '{processus.nom}' n'a pas de pilote assigné. "
            "Un responsable est requis avant le diagnostic."
        )

    if not processus.objectif:
        avertissements.append(
            f"[§4.4] Le processus '{processus.nom}' n'a pas d'objectif documenté."
        )

    if not processus.entrees or not processus.sorties:
        avertissements.append(
            f"[§4.4] Le processus '{processus.nom}' n'a pas d'entrées/sorties définies."
        )

    if not processus.code:
        avertissements.append(
            f"Le processus '{processus.nom}' n'a pas de code de référence (traçabilité)."
        )

    return avertissements


# =============================================================================
# 7. ÉVALUATION DES ALERTES KPI
# =============================================================================

def evaluer_alerte_kpi(
    valeur: float,
    seuil_attention: float | None,
    seuil_alerte: float | None,
    sens: str,
) -> str:
    """
    Calcule le statut d'alerte d'une mesure KPI selon ses seuils et son sens.

    Sens "hausse"  (ex: taux conformité — plus c'est haut, mieux c'est) :
      valeur < seuil_alerte    → alerte    (rouge)
      valeur < seuil_attention → attention (orange)
      sinon                    → normal    (vert)

    Sens "baisse"  (ex: nb risques critiques — plus c'est bas, mieux c'est) :
      valeur > seuil_alerte    → alerte
      valeur > seuil_attention → attention
      sinon                    → normal

    Sens "cible"   (ex: délai moyen — doit rester proche d'une valeur cible) :
      Utilise seuil_alerte comme écart maximal absolu acceptable.
      |valeur - seuil_attention| > seuil_alerte → alerte
      |valeur - seuil_attention| > 0            → attention
      (seuil_attention = valeur cible dans ce mode)

    Retourne : "normal" | "attention" | "alerte"
    """
    if sens == "hausse":
        if seuil_alerte is not None and valeur < seuil_alerte:
            return "alerte"
        if seuil_attention is not None and valeur < seuil_attention:
            return "attention"

    elif sens == "baisse":
        if seuil_alerte is not None and valeur > seuil_alerte:
            return "alerte"
        if seuil_attention is not None and valeur > seuil_attention:
            return "attention"

    elif sens == "cible":
        if seuil_attention is not None and seuil_alerte is not None:
            ecart = abs(valeur - seuil_attention)
            if ecart > seuil_alerte:
                return "alerte"
            if ecart > 0:
                return "attention"

    return "normal"


def calcul_evolution(
    valeur: float,
    valeur_precedente: float | None,
) -> dict:
    """
    Calcule l'évolution entre deux mesures consécutives.
    Appelé par kpi_service.enregistrer_mesure() avant chaque sauvegarde.

    Retourne :
      {
        "valeur_precedente": 72.5,
        "evolution":         5.5,     # valeur - valeur_precedente
        "evolution_pct":     7.59,    # % d'évolution (arrondi 2 décimales)
      }
    Tous les champs sont None si valeur_precedente est None (première mesure).
    """
    if valeur_precedente is None:
        return {
            "valeur_precedente": None,
            "evolution": None,
            "evolution_pct": None,
        }

    evolution = round(valeur - valeur_precedente, 4)

    if valeur_precedente == 0:
        evolution_pct = None  # Division par zéro — indéfini
    else:
        evolution_pct = round((evolution / abs(valeur_precedente)) * 100, 2)

    return {
        "valeur_precedente": valeur_precedente,
        "evolution": evolution,
        "evolution_pct": evolution_pct,
    }


def kpi_est_en_bonne_sante(statut_alerte: str) -> bool:
    """Retourne True si le KPI est dans la zone verte."""
    return statut_alerte == "normal"


# =============================================================================
# 8. WORKFLOW DES ACTIONS CORRECTIVES
# =============================================================================

# Transitions valides : statut_actuel → {statuts_suivants autorisés}
_TRANSITIONS_ACTION: dict[str, set[str]] = {
    "planifiee":       {"en_cours", "annulee"},
    "en_cours":        {"en_verification", "annulee"},
    "en_verification": {"close", "en_cours"},   # Retour si vérification échoue
    "close":           set(),                    # Terminal
    "annulee":         set(),                    # Terminal
}

# Avancement forcé par statut (None = libre)
_AVANCEMENT_FORCE: dict[str, int | None] = {
    "planifiee":       0,
    "en_cours":        None,
    "en_verification": 100,
    "close":           100,
    "annulee":         None,
}


def transition_action_valide(statut_actuel: str, nouveau_statut: str) -> bool:
    """
    Vérifie si la transition de statut est autorisée.

    >>> transition_action_valide("planifiee", "en_cours")  → True
    >>> transition_action_valide("planifiee", "close")     → False
    >>> transition_action_valide("close", "en_cours")      → False
    """
    return nouveau_statut in _TRANSITIONS_ACTION.get(statut_actuel, set())


def get_avancement_force(nouveau_statut: str) -> int | None:
    """
    Retourne l'avancement forcé pour un statut.
    None = avancement libre (1–99 pour en_cours).

    >>> get_avancement_force("planifiee")       → 0
    >>> get_avancement_force("en_verification") → 100
    >>> get_avancement_force("en_cours")        → None
    """
    return _AVANCEMENT_FORCE.get(nouveau_statut)


def priorite_depuis_criticite(criticite: str) -> str:
    """
    Déduit la priorité d'une action depuis la criticité de son risque source.
    Appelé par risque_service lors de la création automatique d'actions.
    """
    return {
        "critique": "critique",
        "eleve":    "haute",
        "modere":   "normale",
        "faible":   "faible",
    }.get(criticite, "normale")


def priorite_depuis_ecart(type_ecart: str) -> str:
    """
    Déduit la priorité d'une action depuis le type d'écart ISO source.
    Appelé par diagnostic_service lors de la création automatique d'actions.
    """
    return {
        "majeur":      "critique",
        "mineur":      "haute",
        "observation": "normale",
        "conforme":    "faible",
    }.get(type_ecart, "normale")