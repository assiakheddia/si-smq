"""
backend/app/data/parties_interessees_seed.py

Parties intéressées identifiées dans les deux processus de labo et d'encadrement doctoral, avec leurs exigences spécifiques.
"""

PARTIES_INTERESSEES_SEED = [
    # --- BPMN Gestion Labo ---
    {
        "nom": "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique",
        "type": "tutelle",
        "description": "Organisme de tutelle qui émet la notification budgétaire annuelle.",
        "exigences": (
            "Respect du cadre budgétaire alloué. "
            "Notification obligatoire en cas de changement majeur dans la composition du laboratoire."
        ),
    },
    {
        "nom": "ATRST",
        "type": "regulateur",
        "description": (
            "Agence Thématique de Recherche en Sciences et Technologie. "
            "Reçoit le bilan annuel du laboratoire avec les preuves des processus."
        ),
        "exigences": (
            "Soumission annuelle du bilan avec preuves (processus 3 & 4). "
            "Évaluation du niveau de performance scientifique pour renouvellement d'accréditation."
        ),
    },
    {
        "nom": "Service des Marchés",
        "type": "interne",
        "description": (
            "Service administratif interne chargé de traiter les achats "
            "supérieurs au seuil d'appel d'offres obligatoire."
        ),
        "exigences": "Conformité aux procédures réglementaires d'achat public.",
    },
    {
        "nom": "Direction du Laboratoire",
        "type": "interne",
        "description": "Directeur du laboratoire — pilote principal des processus de gestion.",
        "exigences": "Validation des achats, signature des bilans, supervision globale.",
    },
    {
        "nom": "Chef d'Équipe de Recherche",
        "type": "interne",
        "description": "Responsable d'une équipe, exprime les besoins et suit l'exécution du budget.",
        "exigences": "Suivi de l'exécution du projet de recherche et des ressources affectées.",
    },

    # --- BPMN Encadrement Doctoral ---
    {
        "nom": "Doctorant",
        "type": "client",
        "description": "Bénéficiaire principal du processus d'encadrement doctoral.",
        "exigences": (
            "Suivi régulier, rapports d'avancement validés à chaque semestre, "
            "accès aux ressources nécessaires à la recherche."
        ),
    },
    {
        "nom": "Directeur de Thèse",
        "type": "interne",
        "description": "Responsable scientifique et pédagogique de l'encadrement du doctorant.",
        "exigences": "Disponibilité, suivi régulier, validation des rapports d'avancement.",
    },
    {
        "nom": "Commission Doctorale",
        "type": "interne",
        "description": "Commission qui valide les inscriptions, autorise les soutenances et supervise le parcours.",
        "exigences": "Respect des délais réglementaires, conformité des dossiers.",
    },
    {
        "nom": "Jury de Soutenance",
        "type": "externe",
        "description": "Jury composé d'experts internes et externes chargé d'évaluer la thèse.",
        "exigences": "Indépendance, expertise du domaine, respect du calendrier de soutenance.",
    },
]