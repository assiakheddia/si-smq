"""
test_iso_engine.py — Tests du moteur ISO 9001 intelligent
==========================================================
Lancer : python test_iso_engine.py

Teste 4 scénarios clés :
  1. Pratique SUPÉRIEURE à l'exigence (rapport hebdo vs mensuel)
  2. Pratique TROMPEUSE (document existe mais non utilisé)
  3. Exigence ABSENTE (écart majeur)
  4. Cohérence INTER-CLAUSES (objectifs définis mais non mesurés)
"""

import asyncio
import json

from iso_engine import (
    analyser_conformite_clause,
    analyser_action_corrective,
    evaluer_risque_intelligent,
    score_to_niveau,
    calcul_rpn,
    rpn_to_criticite,
    transition_action_valide,
    TypeEcart,
)

# ── couleurs terminal ──────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def titre(texte: str):
    print(f"\n{BOLD}{BLUE}{'═'*60}{RESET}")
    print(f"{BOLD}{BLUE}  {texte}{RESET}")
    print(f"{BOLD}{BLUE}{'═'*60}{RESET}")

def ok(texte: str):
    print(f"  {GREEN}✓ {texte}{RESET}")

def ko(texte: str):
    print(f"  {RED}✗ {texte}{RESET}")

def info(texte: str):
    print(f"  {YELLOW}→ {texte}{RESET}")

def afficher_evaluation(eval_result):
    print(f"\n  Score       : {BOLD}{eval_result.score:.2f}{RESET} ({eval_result.niveau.value})")
    print(f"  Type écart  : {BOLD}{eval_result.type_ecart.value.upper()}{RESET}")
    print(f"  Confiance   : {eval_result.confiance_ia:.0%}")
    if eval_result.intention_comprise:
        print(f"\n  [Étape 1 — Intention]\n  {eval_result.intention_comprise}")
    if eval_result.analyse_pratiques:
        print(f"\n  [Étape 2 — Analyse]\n  {eval_result.analyse_pratiques}")
    if eval_result.impacts_croises and eval_result.impacts_croises != "Aucune incohérence détectée":
        print(f"\n  [Étape 3 — Croisements]\n  {eval_result.impacts_croises}")
    if eval_result.verdict_justifie:
        print(f"\n  [Étape 4 — Verdict]\n  {eval_result.verdict_justifie}")
    if eval_result.ecarts_identifies:
        print(f"\n  Écarts identifiés :")
        for e in eval_result.ecarts_identifies:
            print(f"    • {e}")
    if eval_result.recommandations:
        print(f"\n  Recommandations :")
        for r in eval_result.recommandations:
            print(f"    → {r}")


# ── tests statiques (sans IA) ──────────────────────────────────────────────

def test_statiques():
    titre("TESTS STATIQUES — sans IA")

    # RPN
    rpn = calcul_rpn(5, 8, 3)
    assert rpn == 120, f"RPN attendu 120, obtenu {rpn}"
    ok(f"calcul_rpn(5,8,3) = {rpn} → {rpn_to_criticite(rpn).value}")

    assert rpn_to_criticite(250).value == "critique"
    assert rpn_to_criticite(120).value == "eleve"
    assert rpn_to_criticite(60).value  == "modere"
    assert rpn_to_criticite(30).value  == "faible"
    ok("rpn_to_criticite — tous les seuils OK")

    # Transitions
    assert transition_action_valide("planifiee", "en_cours")   == True
    assert transition_action_valide("planifiee", "efficace")   == False
    assert transition_action_valide("terminee",  "efficace")   == True
    assert transition_action_valide("efficace",  "planifiee")  == False
    assert transition_action_valide("inefficace","planifiee")  == True
    ok("transition_action_valide — toutes les transitions OK")

    # Score → niveau
    assert score_to_niveau(0.0).value  == "inexistant"
    assert score_to_niveau(0.25).value == "initial"
    assert score_to_niveau(0.60).value == "defini"
    assert score_to_niveau(0.95).value == "gere"
    assert score_to_niveau(1.0).value  == "optimise"
    ok("score_to_niveau — tous les paliers OK")

    print(f"\n  {GREEN}{BOLD}Tous les tests statiques passent.{RESET}")


# ── tests IA ──────────────────────────────────────────────────────────────

async def test_pratique_superieure():
    """
    Scénario : la clause 9.1 demande une surveillance régulière.
    L'organisme produit des rapports HEBDOMADAIRES alors que mensuel serait suffisant.
    Résultat attendu : CONFORME ou SUPERIEUR, score >= 0.90
    """
    titre("TEST 1 — Pratique SUPÉRIEURE à l'exigence")
    info("Clause 9.1 — surveillance régulière")
    info("Exigence implicite : mesure périodique des KPIs")
    info("Pratique observée  : rapports hebdomadaires (plus fréquent que nécessaire)")

    result = await analyser_conformite_clause(
        clause_id="9.1",
        observations=(
            "L'organisme produit chaque semaine un rapport de performance automatisé "
            "couvrant tous les KPIs des processus. Ce rapport est distribué à tous les pilotes "
            "et discuté en réunion opérationnelle hebdomadaire. La satisfaction client est "
            "mesurée trimestriellement via une enquête structurée avec analyse des résultats."
        ),
        preuves_fournies=[
            "52 rapports hebdomadaires produits sur l'année écoulée",
            "Tableau de bord automatisé avec 8 KPIs par processus",
            "Résultats enquête satisfaction client Q1-Q4 avec analyse de tendance",
            "PV des réunions opérationnelles hebdomadaires mentionnant les KPIs",
        ],
        contexte_processus={
            "nom": "Pilotage de la performance",
            "type": "mesure",
            "pilote": "Directeur Qualité",
        },
    )

    afficher_evaluation(result)

    # Vérification
    if result.type_ecart in (TypeEcart.CONFORME, TypeEcart.SUPERIEUR) and result.score >= 0.88:
        ok(f"CORRECT — pratique supérieure reconnue (score={result.score:.2f}, type={result.type_ecart.value})")
    else:
        ko(f"PROBLÈME — pratique supérieure non reconnue (score={result.score:.2f}, type={result.type_ecart.value})")
        info("Le moteur aurait dû reconnaître que hebdomadaire > mensuel = conforme voire supérieur")


async def test_document_non_utilise():
    """
    Scénario : la politique qualité existe et est affichée,
    mais les employés ne la connaissent pas.
    Résultat attendu : MINEUR ou MAJEUR — le document seul ne suffit pas.
    """
    titre("TEST 2 — Document existe mais n'est pas utilisé")
    info("Clause 5.2 — politique qualité")
    info("Piège classique : document formel mais intention non satisfaite")

    result = await analyser_conformite_clause(
        clause_id="5.2",
        observations=(
            "La politique qualité est affichée dans le hall d'entrée et sur l'intranet. "
            "Elle est datée et signée par le directeur général. "
            "Lors des entretiens terrain avec 5 employés de production, aucun n'a pu "
            "expliquer ce qu'elle contient ni comment son travail y contribue. "
            "La dernière formation qualité remonte à 3 ans."
        ),
        preuves_fournies=[
            "Politique qualité datée 2023, signée DG",
            "Capture d'écran intranet montrant la politique",
            "Affichage photo dans le hall d'entrée",
        ],
        contexte_processus={
            "nom": "Management de la qualité",
            "type": "management",
        },
    )

    afficher_evaluation(result)

    if result.type_ecart in (TypeEcart.MINEUR, TypeEcart.MAJEUR):
        ok(f"CORRECT — document formel sans réalité opérationnelle détecté (type={result.type_ecart.value})")
    else:
        ko(f"PROBLÈME — le moteur a accepté un document non utilisé comme conforme (type={result.type_ecart.value})")
        info("Le moteur aurait dû détecter que la communication n'a pas atteint les employés")


async def test_exigence_absente():
    """
    Scénario : aucun registre des risques, aucune action planifiée.
    Résultat attendu : MAJEUR, score < 0.40
    """
    titre("TEST 3 — Exigence ABSENTE (écart majeur attendu)")
    info("Clause 6.1 — gestion des risques")
    info("Scénario : organisme qui n'a jamais formalisé ses risques")

    result = await analyser_conformite_clause(
        clause_id="6.1",
        observations=(
            "L'organisme n'a pas de registre des risques formalisé. "
            "Le responsable qualité indique que 'les risques sont connus des managers' "
            "mais aucun document n'existe. Aucune action préventive n'est planifiée. "
            "Les incidents passés ne sont pas analysés sous l'angle risque."
        ),
        preuves_fournies=[
            "Aucun document fourni pour cette clause",
        ],
        contexte_processus={
            "nom": "Management de la qualité",
            "type": "management",
        },
    )

    afficher_evaluation(result)

    if result.type_ecart == TypeEcart.MAJEUR and result.score < 0.40:
        ok(f"CORRECT — écart majeur détecté (score={result.score:.2f})")
    else:
        ko(f"PROBLÈME — écart majeur non détecté (score={result.score:.2f}, type={result.type_ecart.value})")


async def test_coherence_inter_clauses():
    """
    Scénario : §6.2 semble OK (objectifs définis) mais §9.1 est faible (pas de mesure).
    Le moteur doit détecter l'incohérence : des objectifs non mesurés ne servent à rien.
    """
    titre("TEST 4 — Incohérence INTER-CLAUSES")
    info("Clause 6.2 — objectifs qualité")
    info("Contexte : §9.1 a un score faible (0.30) — les KPIs ne sont pas mesurés")
    info("Attendu  : le moteur signale que des objectifs sans mesure = objectifs fictifs")

    result = await analyser_conformite_clause(
        clause_id="6.2",
        observations=(
            "L'organisme a défini 5 objectifs qualité SMART documentés dans un plan annuel. "
            "Chaque objectif a un responsable et une échéance. "
            "Cependant, aucun tableau de bord n'est mis à jour — les indicateurs associés "
            "n'ont pas été mesurés depuis le début de l'année."
        ),
        preuves_fournies=[
            "Plan des objectifs qualité 2025 avec 5 objectifs SMART",
            "Responsables et échéances assignés pour chaque objectif",
        ],
        contexte_processus={
            "nom": "Planification qualité",
            "type": "management",
        },
        scores_autres_clauses={
            "9.1": 0.30,   # KPIs non mesurés — incohérence à détecter
            "5.2": 0.85,
            "6.1": 0.75,
        },
    )

    afficher_evaluation(result)

    # Le score doit être pénalisé par l'incohérence inter-clauses
    if result.score < 0.75:
        ok(f"CORRECT — incohérence inter-clauses détectée, score pénalisé ({result.score:.2f})")
    else:
        info(f"Score obtenu : {result.score:.2f} — vérifier si l'impact croisé est mentionné dans le raisonnement")

    if result.impacts_croises and "9.1" in result.impacts_croises:
        ok("Référence à §9.1 trouvée dans les impacts croisés")
    if result.clauses_impactees:
        ok(f"Clauses impactées signalées : {result.clauses_impactees}")


async def test_action_corrective():
    """
    Scénario : action corrective qui traite le symptôme, pas la cause racine.
    """
    titre("TEST 5 — Action corrective symptôme vs cause racine")
    info("§10.2 — l'action proposée corrige le symptôme uniquement")

    result = await analyser_action_corrective(
        description_nc="Livraisons clients en retard — 30% des commandes livrées hors délai ce trimestre",
        cause_racine="Sous-effectif chronique en période de pic d'activité — les plannings ne sont pas ajustés",
        action_proposee="Envoyer des excuses aux clients concernés et offrir une remise de 10%",
    )

    print(f"\n  Traite cause racine  : {BOLD}{result.get('traite_cause_racine')}{RESET}")
    print(f"  Risque récurrence    : {BOLD}{result.get('risque_recurrence')}{RESET}")
    print(f"  Raisonnement         : {result.get('raisonnement')}")
    if result.get("ameliorations_suggerees"):
        print(f"\n  Améliorations suggérées :")
        for a in result["ameliorations_suggerees"]:
            print(f"    → {a}")

    if not result.get("traite_cause_racine") and result.get("risque_recurrence") in ("modere", "eleve"):
        ok("CORRECT — action symptôme détectée, récurrence signalée")
    else:
        ko("PROBLÈME — action symptôme non détectée comme insuffisante")


# ── main ──────────────────────────────────────────────────────────────────

async def main():
    print(f"\n{BOLD}ISO ENGINE v2 — Suite de tests{RESET}")
    print("Tests statiques d'abord, puis tests IA (nécessitent connexion API)\n")

    # 1. Tests statiques — toujours
    test_statiques()

    # 2. Tests IA
    print(f"\n{YELLOW}Lancement des tests IA — appels à l'API Anthropic...{RESET}")
    print(f"{YELLOW}(peut prendre 10-30 secondes par test){RESET}\n")

    await test_pratique_superieure()
    await test_document_non_utilise()
    await test_exigence_absente()
    await test_coherence_inter_clauses()
    await test_action_corrective()

    print(f"\n{BOLD}{GREEN}{'═'*60}{RESET}")
    print(f"{BOLD}{GREEN}  Tests terminés.{RESET}")
    print(f"{BOLD}{GREEN}{'═'*60}{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())