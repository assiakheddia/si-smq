"""
backend/app/data/processus_seed.py

Données initiales des deux processus métier issus des BPMN fournis.
À intégrer dans seeder.py → seed_processus().

Structure :
  - 2 processus racines
  - Sous-processus extraits des swimlanes BPMN

Note : pilote_id = None au seed (assigné manuellement via l'interface admin).
"""

PROCESSUS_SEED = [

    # =========================================================================
    # BPMN 1 — Gestion du Laboratoire (Finances / Équipes / Ressources)
    # =========================================================================
    {
        "code": "PROC-LABO",
        "nom": "Gestion du Laboratoire",
        "objectif": (
            "Assurer la gestion administrative, financière et humaine du laboratoire "
            "en conformité avec les exigences du Ministère et de l'ATRST."
        ),
        "type": "support",
        "frequence_cycle": "annuel",
        "declencheur": "Notification du budget annuel par le Ministère",
        "entrees": (
            "Notification budgétaire annuelle du Ministère, "
            "dossiers d'intégration des membres, "
            "carnets de recherche, "
            "demandes d'achat"
        ),
        "sorties": (
            "Liste officielle des membres du laboratoire, "
            "bilan KPI annuel, "
            "situation financière transmise au Directeur, "
            "rapport bilan soumis à l'ATRST"
        ),
        "ressources_cles": (
            "Budget alloué, Service des Marchés, "
            "Directeur du laboratoire, Comptable, ATRST"
        ),
        "parent_code": None,
        "sous_processus": [
            {
                "code": "PROC-LABO-BUDGET",
                "nom": "Gestion Budgétaire Annuelle",
                "objectif": "Réceptionner, analyser et consolider la notification budgétaire du Ministère.",
                "type": "support",
                "frequence_cycle": "annuel",
                "declencheur": "Réception de la notification budgétaire du Ministère",
                "entrees": "Notification budget annuel, besoins des équipes",
                "sorties": "Budget consolidé par poste, besoins validés",
                "ressources_cles": "Directeur, Comptable",
            },
            {
                "code": "PROC-LABO-INTEGRATION",
                "nom": "Intégration des Membres",
                "objectif": (
                    "Examiner et valider les demandes d'intégration, "
                    "mettre à jour la liste officielle des membres du laboratoire."
                ),
                "type": "support",
                "frequence_cycle": "ponctuel",
                "declencheur": "Dépôt d'un dossier d'intégration par un nouveau membre",
                "entrees": "Dossier d'intégration, liste actuelle des membres",
                "sorties": "Liste membres mise à jour, notification ATRST si changement majeur",
                "ressources_cles": "Directeur du laboratoire, Dossier d'intégration",
            },
            {
                "code": "PROC-LABO-ACHAT",
                "nom": "Gestion des Achats et Dépenses",
                "objectif": (
                    "Traiter les demandes d'achat dans le respect des seuils réglementaires "
                    "(appel d'offres obligatoire ou achat direct)."
                ),
                "type": "support",
                "frequence_cycle": "continu",
                "declencheur": "Expression d'un besoin d'achat par un chef d'équipe",
                "entrees": "Projet de recherche, carnet de recherche, demande d'achat",
                "sorties": (
                    "Bon de commande, situation financière au Directeur, "
                    "achat traité ou dossier refusé"
                ),
                "ressources_cles": (
                    "Service des Marchés, Directeur (signature), "
                    "seuils réglementaires appel d'offres"
                ),
            },
            {
                "code": "PROC-LABO-KPI",
                "nom": "Bilan et Suivi des KPI Annuels",
                "objectif": (
                    "Consolider les KPI annuels, élaborer le bilan du laboratoire "
                    "et le soumettre à l'ATRST avec les preuves."
                ),
                "type": "strategique",
                "frequence_cycle": "annuel",
                "declencheur": "Synchronisation des sous-processus en fin de cycle annuel",
                "entrees": (
                    "Rapports des sous-processus, rapport annuel, "
                    "bilan financier, KPI consolidés"
                ),
                "sorties": (
                    "Bilan annuel validé, rapport soumis à l'ATRST, "
                    "cycle annuel lancé ou accréditation renouvelée"
                ),
                "ressources_cles": "Directeur, ATRST, preuves des processus 3 à 4",
            },
        ],
    },

    # =========================================================================
    # BPMN 2 — Encadrement Doctoral
    # =========================================================================
    {
        "code": "PROC-DOC",
        "nom": "Encadrement Doctoral",
        "objectif": (
            "Assurer le suivi pédagogique et administratif des doctorants "
            "depuis l'inscription jusqu'à la soutenance."
        ),
        "type": "operationnel",
        "frequence_cycle": "semestriel",
        "declencheur": "Inscription d'un nouveau doctorant validée par la commission",
        "entrees": (
            "Dossier d'inscription du doctorant, "
            "PV de commission, "
            "sujet de thèse validé"
        ),
        "sorties": (
            "Rapports d'avancement semestriels, "
            "PV de soutenance, "
            "attestation de réussite / doctorat obtenu"
        ),
        "ressources_cles": (
            "Directeur de thèse, co-encadrant éventuel, "
            "commission doctorale, jury de soutenance"
        ),
        "parent_code": None,
        "sous_processus": [
            {
                "code": "PROC-DOC-INSCRIPTION",
                "nom": "Inscription et Affectation",
                "objectif": (
                    "Valider l'inscription du doctorant, "
                    "affecter un directeur de thèse et définir le sujet."
                ),
                "type": "operationnel",
                "frequence_cycle": "annuel",
                "declencheur": "Candidature du doctorant déposée",
                "entrees": "Dossier de candidature, liste des directeurs disponibles",
                "sorties": "Inscription validée, directeur de thèse affecté, sujet enregistré",
                "ressources_cles": "Commission doctorale, Directeur de thèse",
            },
            {
                "code": "PROC-DOC-AVANCEMENT",
                "nom": "Suivi de l'Avancement",
                "objectif": (
                    "Assurer le suivi semestriel de l'avancement des travaux "
                    "et valider les rapports d'étape."
                ),
                "type": "operationnel",
                "frequence_cycle": "semestriel",
                "declencheur": "Échéance semestrielle de rapport d'avancement",
                "entrees": "Rapport d'avancement du doctorant, historique des évaluations",
                "sorties": "Rapport validé ou retour pour correction, recommandations",
                "ressources_cles": "Directeur de thèse, co-encadrant",
            },
            {
                "code": "PROC-DOC-SOUTENANCE",
                "nom": "Préparation et Soutenance",
                "objectif": (
                    "Organiser la soutenance de thèse : constitution du jury, "
                    "dépôt du manuscrit, déroulement et délibération."
                ),
                "type": "operationnel",
                "frequence_cycle": "ponctuel",
                "declencheur": "Autorisation de soutenance accordée par la commission",
                "entrees": "Manuscrit final, composition du jury, PV d'autorisation",
                "sorties": "PV de soutenance, mention, attestation de doctorat",
                "ressources_cles": "Jury, Directeur de thèse, administration doctorale",
            },
        ],
    },
]