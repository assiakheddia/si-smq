"""
test_fiche_processus.py — Test de l'adaptateur fiche processus → iso_engine
=============================================================================
Lancer : python test_fiche_processus.py

Teste le diagnostic d'une fiche processus complète via l'ISO Engine.
"""

import asyncio
import os
import json

from iso_engine import (
    analyser_fiche_processus,
    extraire_observations_depuis_fiche,
    extraire_preuves_depuis_fiche,
    clauses_prioritaires_depuis_fiche,
    TypeEcart,
    NiveauMaturite,
)

# ── couleurs terminal ──────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def titre(texte):
    print(f"\n{BOLD}{BLUE}{'═'*65}{RESET}")
    print(f"{BOLD}{BLUE}  {texte}{RESET}")
    print(f"{BOLD}{BLUE}{'═'*65}{RESET}")

def ok(texte):   print(f"  {GREEN}✓ {texte}{RESET}")
def ko(texte):   print(f"  {RED}✗ {texte}{RESET}")
def info(texte): print(f"  {YELLOW}→ {texte}{RESET}")


# ── unique fiche de test (Fiche Complète) ──────────────────────────────────

FICHE_COMPLETE = {
    "section_1_general": {
        "designation": "Processus Achats",
        "pilote": "Karim Benali",
        "objectif": "Garantir l'approvisionnement en matériaux conformes aux spécifications techniques dans les délais requis",
        "structures_concernees": "Direction Achats, Qualité, Production",
        "type": "Réalisation",
    },
    "section_2_elements_cles": {
        "delai_global": "5 days",
        "cout_estime": "Budget annuel : 12M DA",
        "entrees": [
            {"elements": "Bon de commande validé", "provenance_processus": "Processus Production"},
            {"elements": "Cahier des charges technique", "provenance_processus": "Processus Conception"},
        ],
        "sorties": [
            {"livrables": "Matériaux réceptionnés et contrôlés", "destination_processus": "Processus Production"},
            {"livrables": "Fiche de réception signée", "destination_processus": "Processus Qualité"},
        ],
        "clients": "Direction Production, Direction Qualité",
        "effectifs": "4 agents acheteurs, 1 responsable",
        "competences": "Négociation, droit des contrats, contrôle qualité fournisseur",
        "kpis": [
            {"nom": "Taux de livraison dans les délais", "cible": "95%", "frequence": "mensuel"},
            {"nom": "Taux de non-conformité fournisseur", "cible": "< 2%", "frequence": "mensuel"},
            {"nom": "Délai moyen de traitement commande", "cible": "3 jours", "frequence": "hebdomadaire"},
        ],
    },
    "section_3_contexte": {
        "processus_voisins": "Processus Production (client), Processus Qualité (contrôle), Processus Finance (paiement)",
        "enjeux": "Maîtrise des coûts, fiabilité des fournisseurs, conformité réglementaire des produits achetés",
        "moyens_alloues": "ERP SAP, véhicule de livraison, espace de stockage 500m²",
        "contraintes": "Délais clients serrés, fournisseurs locaux limités",
        "risques": [
            {"libelle": "Rupture de stock fournisseur principal", "criticite": "eleve"},
            {"libelle": "Non-conformité des matériaux livrés", "criticite": "critique"},
            {"libelle": "Retard de livraison", "criticite": "modere"},
        ],
    },
    "section_4_informations_documentees": {
        "documents": [
            {"titre": "Procédure d'achat PA-001", "format_support": "PDF", "approuve": True, "est_enregistrement": False},
            {"titre": "Critères d'évaluation fournisseurs", "format_support": "Excel", "approuve": True, "est_enregistrement": False},
            {"titre": "Bon de commande type", "format_support": "Word", "approuve": True, "est_enregistrement": True},
            {"titre": "Fiche de réception", "format_support": "PDF", "approuve": True, "est_enregistrement": True},
        ],
    },
    "section_5_dysfonctionnements": {
        "historique": [
            {
                "description": "Livraison de matériaux hors spécification en mars 2024",
                "consequences": "Arrêt production 2 jours, perte 800k DA",
                "causes": "Absence de contrôle à réception, fournisseur non qualifié",
                "ameliorations": "Mise en place check-list réception, qualification obligatoire des fournisseurs",
            },
        ],
    },
    "section_6_modelisation": {
        "taches_chronologiques": [
            "Réception besoin",
            "Consultation fournisseurs",
            "Analyse offres",
            "Validation commande",
            "Suivi livraison",
            "Contrôle réception",
            "Enregistrement",
        ],
    },
}


# ── affichage des résultats avec gestion d'erreur ROUGE ────────────────────

def afficher_resultats(resultats: dict, nom_fiche: str):
    if not resultats:
        print(f"\n{RED}{BOLD}✗ CRITICAL ERROR : Le serveur d'IA n'a renvoyé aucune donnée.{RESET}")
        return []

    print(f"\n  {BOLD}Clauses analysées pour '{nom_fiche}' :{RESET}")

    scores = []
    for clause_id, eval_r in sorted(resultats.items()):
        # Si le résultat contient un indicateur de crash ou une erreur système
        if hasattr(eval_r, 'type_ecart') and eval_r.type_ecart.value.upper() in ["CRITIQUE", "ERREUR", "ERROR"]:
            print(f"\n  {RED}{BOLD}§{clause_id:<6} [SERVEUR IA DOWN / RATE LIMIT EXCEEDED]{RESET}")
            if hasattr(eval_r, 'ecarts_identifies'):
                for e in eval_r.ecarts_identifies:
                    print(f"    {RED}{BOLD}⚠ {e}{RESET}")
            continue

        couleur = GREEN if eval_r.score >= 0.75 else (YELLOW if eval_r.score >= 0.50 else RED)
        barre = "█" * int(eval_r.score * 10) + "░" * (10 - int(eval_r.score * 10))
        
        print(
            f"\n  {BOLD}§{clause_id:<6} {barre} {couleur}{eval_r.score:.2f}{RESET} "
            f"[{eval_r.type_ecart.value.upper():<12}] {eval_r.niveau.value}"
        )

        # Écarts
        if eval_r.ecarts_identifies:
            for e in eval_r.ecarts_identifies:
                print(f"    {YELLOW}⚠ {e}{RESET}")

        # Recommandations
        if eval_r.recommandations:
            for r in eval_r.recommandations:
                print(f"    {GREEN}→ {r}{RESET}")

        scores.append(eval_r.score)

    if scores:
        moyenne = sum(scores) / len(scores)
        couleur = GREEN if moyenne >= 0.75 else (YELLOW if moyenne >= 0.50 else RED)
        print(f"\n  {BOLD}Score moyen : {couleur}{moyenne:.2f}{RESET}")

    return scores


# ── test unique ────────────────────────────────────────────────────────────

async def test_fiche_complete():
    titre("TEST UNIQUE — Diagnostic Fiche Processus Complète")
    info("Analyse du Processus Achats via le moteur d'IA")

    try:
        resultats = await analyser_fiche_processus(FICHE_COMPLETE)
        
        # Détection d'un dictionnaire d'erreur ou d'un fallback renvoyé par l'engine
        if not resultats or "erreur" in str(resultats).lower() or "429" in str(resultats):
            raise ConnectionError("Le serveur d'IA est surchargé (Rate Limit 429) ou injoignable.")

        scores = afficher_resultats(resultats, "Processus Achats")

        if "6.1" in resultats and resultats["6.1"].score >= 0.70:
            ok("§6.1 validé avec succès par l'IA.")
        if "9.1" in resultats and resultats["9.1"].score >= 0.70:
            ok("§9.1 validé avec succès par l'IA.")

    except Exception as e:
        print(f"\n{RED}{BOLD}═"*65)
        print(f"❌ ERREUR SERVEUR IA : LE DIAGNOSTIC A ÉCHOUÉ")
        print(f"Détail du problème : {e}")
        print(f"═"*65 + f"{RESET}\n")


# ── main ──────────────────────────────────────────────────────────────────

async def main():
    print(f"\n{BOLD}SI-SMQ : MOTEUR DE DIAGNOSTIC ISO 9001{RESET}\n")

    # Vérification de la clé API
    api_key = os.environ.get("GROQ_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print(f"{RED}{BOLD}❌ CONFIGURATION MANQUANTE : Aucune clé API trouvée.{RESET}")
        print(f"Utilise : {YELLOW}$env:GROQ_API_KEY='gsk_...'{RESET} avant de lancer le script.")
        return

    print(f"{YELLOW}Envoi de la fiche à l'IA... (Patienter 5-10 secondes){RESET}")
    await test_fiche_complete()

    print(f"\n{BOLD}{BLUE}═"*65)
    print(f"  Fin de la session de test.")
    print(f"═"*65 + f"{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())