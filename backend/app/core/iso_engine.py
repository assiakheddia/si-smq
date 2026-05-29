"""
iso_engine.py — Noyau ISO 9001:2015 Intelligent v2
===================================================

Architecture de raisonnement en 4 niveaux :

  Niveau 1 — Statique      : règles déterministes pures (RPN, transitions, seuils)
  Niveau 2 — Intent        : comprendre l'INTENTION derrière chaque exigence ISO,
                             pas sa lettre — "rapport mensuel" = surveillance régulière,
                             donc hebdomadaire est CONFORME voire supérieur
  Niveau 3 — Cross-clause  : mémoire inter-clauses — un KPI sans objectif = §6.2
                             non conforme même si §9.1 semble OK
  Niveau 4 — Calibrage     : distinguer lettre/intention, absence/inadéquation,
                             supérieur/équivalent/insuffisant

Philosophie : ISO 9001 est basé sur des PRINCIPES, pas des règles rigides.
Le moteur raisonne comme un auditeur humain expérimenté.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache
from typing import Any
import os
from urllib import response
import httpx

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. RÉFÉRENTIEL ISO 9001:2015 — intention explicite pour chaque exigence
# ---------------------------------------------------------------------------
# Chaque exigence porte :
#   - "lettre"       : ce que le texte dit littéralement
#   - "intention"    : POURQUOI cette exigence existe
#   - "satisfait_si" : exemples de pratiques équivalentes ou supérieures
#   - "insuffisant_si" : pratiques qui semblent conformes mais ne le sont pas
#
# C'est ce mapping lettre<->intention qui rend le moteur intelligent.

ISO_CLAUSES: dict[str, dict] = {
    "4.1": {
        "titre": "Compréhension de l'organisme et de son contexte",
        "section": 4,
        "intention_globale": (
            "S'assurer que l'organisme connaît son environnement et que cette connaissance "
            "est VIVANTE — pas un document produit une fois et oublié. "
            "L'auditeur cherche des preuves que l'analyse est régulièrement revue ET qu'elle influence les décisions."
        ),
        "exigences": [
            {
                "id": "4.1.a",
                "lettre": "Identifier les enjeux internes et externes pertinents",
                "intention": (
                    "L'organisme doit CONNAÎTRE son environnement : concurrence, réglementation, culture interne. "
                    "L'objectif est de ne pas être surpris par des facteurs prévisibles. "
                    "N'importe quel outil d'analyse satisfait cette intention."
                ),
                "satisfait_si": [
                    "SWOT formalisé et daté, même simple",
                    "PESTEL ou équivalent mis à jour annuellement",
                    "Compte-rendu de séminaire de direction couvrant ces enjeux",
                ],
                "insuffisant_si": [
                    "Document SWOT produit pour l'audit et jamais utilisé depuis",
                    "Analyse copiée d'un exercice précédent sans révision",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "4.1.b",
                "lettre": "Surveiller et revoir ces informations",
                "intention": (
                    "La surveillance n'implique pas une fréquence fixe. Mensuel, trimestriel, annuel — "
                    "tout est acceptable SI la fréquence est justifiée. "
                    "Une startup en croissance devrait revoir plus souvent qu'une administration stable."
                ),
                "satisfait_si": [
                    "Revue annuelle documentée dans un PV de direction",
                    "Revue déclenchée par événement (changement réglementaire)",
                ],
                "insuffisant_si": [
                    "Aucune preuve de révision depuis la création du document",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Analyse SWOT/PESTEL ou équivalent", "PV de revue mentionnant le contexte"],
        "poids": 0.8,
        "clauses_liees": ["4.2", "6.1", "9.3"],
    },
    "4.2": {
        "titre": "Compréhension des besoins et attentes des parties intéressées",
        "section": 4,
        "intention_globale": (
            "L'organisme doit savoir QUI peut affecter ou être affecté par ses activités qualité, "
            "et ce que ces parties attendent. L'exhaustivité n'est pas requise — la PERTINENCE oui. "
            "10 parties bien analysées valent mieux que 50 listées superficiellement."
        ),
        "exigences": [
            {
                "id": "4.2.a",
                "lettre": "Identifier les parties intéressées pertinentes",
                "intention": (
                    "Identifier signifie nommer ET justifier la pertinence. "
                    "Un client évident non listé est un écart. Une entité listée sans lien avec la qualité "
                    "n'est pas un problème — c'est superflu mais pas non-conforme."
                ),
                "satisfait_si": [
                    "Registre des PI avec nom, type, niveau d'influence",
                    "Matrice des PI intégrée au plan qualité",
                ],
                "insuffisant_si": [
                    "Clients et fournisseurs absents de la liste",
                    "Liste générée sans analyse réelle",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "4.2.b",
                "lettre": "Déterminer leurs exigences pertinentes",
                "intention": (
                    "Connaître ce que chaque partie intéressée ATTEND en matière de qualité. "
                    "Une enquête client annuelle satisfait cette exigence pour les clients."
                ),
                "satisfait_si": [
                    "Matrice besoins/attentes par PI documentée",
                    "Contrats clients analysés pour extraction des exigences",
                    "Veille réglementaire formalisée",
                ],
                "insuffisant_si": [
                    "Exigences listées sans source identifiable",
                    "Aucune exigence réglementaire malgré secteur réglementé",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Registre des parties intéressées", "Matrice besoins/attentes"],
        "poids": 0.8,
        "clauses_liees": ["4.1", "6.1", "8.2"],
    },
    "4.4": {
        "titre": "Système de management de la qualité et ses processus",
        "section": 4,
        "intention_globale": (
            "L'organisme doit PILOTER ses processus — pas seulement les décrire. "
            "Une cartographie belle mais sans pilotes, sans indicateurs, sans interactions définies "
            "est un document mort. L'auditeur cherche des preuves d'utilisation opérationnelle."
        ),
        "exigences": [
            {
                "id": "4.4.a",
                "lettre": "Déterminer les processus nécessaires et leurs interactions",
                "intention": (
                    "La cartographie doit refléter la RÉALITÉ opérationnelle. "
                    "Format libre : BPMN, schéma maison — ce qui compte c'est que les équipes "
                    "s'y reconnaissent et qu'on voit les flux entre processus."
                ),
                "satisfait_si": [
                    "Cartographie des processus avec interactions matérialisées",
                    "Fiches processus individuelles avec entrées/sorties",
                ],
                "insuffisant_si": [
                    "Cartographie sans interactions entre processus",
                    "Cartographie non reconnue par les équipes terrain",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "4.4.b",
                "lettre": "Attribuer les responsabilités et autorités pour ces processus",
                "intention": (
                    "Chaque processus doit avoir UN pilote identifiable — "
                    "quelqu'un qui répond de la performance du processus devant la direction."
                ),
                "satisfait_si": [
                    "Fiche processus avec nom du pilote",
                    "RACI formalisé mentionnant un responsable par processus",
                ],
                "insuffisant_si": [
                    "Processus sans pilote nommé",
                    "Pilote nommé mais sans autorité réelle",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "4.4.c",
                "lettre": "Gérer les risques et opportunités affectant les processus",
                "intention": (
                    "Cette exigence est LIÉE à §6.1. Si §6.1 est satisfait et les risques sont tracés "
                    "par processus, cette sous-exigence est couverte automatiquement."
                ),
                "satisfait_si": [
                    "Registre des risques organisé par processus",
                    "Fiches processus incluant section risques/opportunités",
                ],
                "insuffisant_si": [
                    "Registre des risques global sans lien avec les processus",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Cartographie des processus", "Fiches processus avec pilotes", "KPIs par processus"],
        "poids": 1.0,
        "clauses_liees": ["5.3", "6.1", "9.1"],
    },
    "5.1": {
        "titre": "Leadership et engagement de la direction",
        "section": 5,
        "intention_globale": (
            "La direction doit MONTRER son engagement — pas le déclarer. "
            "L'auditeur cherche des actes concrets : temps consacré, décisions prises, ressources allouées. "
            "Un beau discours sans budget qualité ni participation aux revues = non-conforme."
        ),
        "exigences": [
            {
                "id": "5.1.a",
                "lettre": "Démontrer le leadership et l'engagement envers le SMQ",
                "intention": (
                    "Preuves comportementales de la direction : présence aux revues, "
                    "signature des objectifs, communication active sur la qualité. "
                    "Délégation totale à un responsable qualité sans implication direction = écart majeur."
                ),
                "satisfait_si": [
                    "Direction présente aux revues de direction (PV attestant présence)",
                    "Politique qualité signée par le dirigeant",
                    "Budget qualité approuvé par la direction",
                ],
                "insuffisant_si": [
                    "Responsable qualité seul signataire de tous les documents",
                    "Direction absente des revues de direction",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["PV de revue de direction avec présence direction", "Politique qualité signée direction"],
        "poids": 0.9,
        "clauses_liees": ["5.2", "9.3"],
    },
    "5.2": {
        "titre": "Politique qualité",
        "section": 5,
        "intention_globale": (
            "La politique qualité doit être UN ENGAGEMENT RÉEL de la direction, "
            "compris par tous et visible dans les pratiques. "
            "Un document affiché dans le couloir mais inconnu des employés = insuffisant."
        ),
        "exigences": [
            {
                "id": "5.2.a",
                "lettre": "Établir une politique qualité cohérente avec le contexte et la stratégie",
                "intention": (
                    "La politique doit être DATÉE, SIGNÉE, et refléter réellement la stratégie actuelle. "
                    "Si le contexte a changé (fusion, nouveau marché) et la politique n'a pas été revue = écart."
                ),
                "satisfait_si": [
                    "Politique datée et signée, cohérente avec les objectifs stratégiques actuels",
                    "Politique revue lors du dernier changement stratégique majeur",
                ],
                "insuffisant_si": [
                    "Politique générique sans lien avec le secteur",
                    "Copie conforme d'une politique d'un autre organisme",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "5.2.b",
                "lettre": "Communiquée, comprise et appliquée au sein de l'organisme",
                "intention": (
                    "La communication n'exige pas que chaque employé récite la politique mot pour mot. "
                    "Elle exige que chacun comprenne SON rôle dans la qualité."
                ),
                "satisfait_si": [
                    "Formation initiale incluant la politique qualité",
                    "Employés capables d'expliquer comment leur travail contribue à la qualité",
                ],
                "insuffisant_si": [
                    "Employés incapables d'identifier la politique qualité",
                    "Communication uniquement à la hiérarchie sans descente terrain",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Politique qualité datée et signée", "Preuves de communication"],
        "poids": 0.8,
        "clauses_liees": ["5.1", "6.2"],
    },
    "5.3": {
        "titre": "Rôles, responsabilités et autorités",
        "section": 5,
        "intention_globale": (
            "Chaque personne doit savoir CE QU'ELLE DOIT FAIRE pour la qualité. "
            "L'auditeur vérifie que la responsabilité qualité est connue des intéressés, "
            "pas seulement écrite dans un document RH."
        ),
        "exigences": [
            {
                "id": "5.3.a",
                "lettre": "Attribuer et communiquer les responsabilités et autorités",
                "intention": (
                    "Format libre : fiches de poste, RACI, organigramme annoté. "
                    "Ce qui compte : la personne connaît ses responsabilités qualité "
                    "ET dispose de l'AUTORITÉ pour les exercer."
                ),
                "satisfait_si": [
                    "Fiches de poste incluant responsabilités qualité",
                    "RACI formalisé et connu des acteurs",
                ],
                "insuffisant_si": [
                    "RACI existant mais non connu des équipes",
                    "Responsabilité attribuée sans autorité correspondante",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Organigramme", "Fiches de poste avec responsabilités qualité", "RACI"],
        "poids": 0.8,
        "clauses_liees": ["4.4", "5.1"],
    },
    "6.1": {
        "titre": "Actions face aux risques et opportunités",
        "section": 6,
        "intention_globale": (
            "La 'pensée basée sur les risques' est le CŒUR de ISO 9001:2015. "
            "L'organisme doit ANTICIPER, pas seulement réagir. "
            "Un registre des risques statique jamais utilisé = écart majeur. "
            "Un tableau Excel simple mais mis à jour régulièrement = parfaitement conforme."
        ),
        "exigences": [
            {
                "id": "6.1.a",
                "lettre": "Identifier les risques et opportunités",
                "intention": (
                    "Les risques doivent couvrir les processus, les objectifs qualité ET le contexte. "
                    "Les opportunités sont souvent oubliées — absence = écart mineur seulement. "
                    "Outil libre : AMDEC, matrice, tableau, brainstorming documenté."
                ),
                "satisfait_si": [
                    "Registre des risques avec les risques majeurs identifiés",
                    "AMDEC processus réalisée",
                    "Plan de continuité couvrant les risques majeurs",
                ],
                "insuffisant_si": [
                    "Registre vide ou avec un seul risque générique",
                    "Risques identifiés sans lien avec les processus qualité",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "6.1.b",
                "lettre": "Planifier des actions et en évaluer l'efficacité",
                "intention": (
                    "Chaque risque significatif doit avoir UNE ACTION planifiée "
                    "avec un responsable et une échéance. "
                    "L'évaluation d'efficacité peut être simple : le risque s'est-il matérialisé ?"
                ),
                "satisfait_si": [
                    "Plan d'actions lié au registre des risques avec responsable et délai",
                    "Suivi de l'efficacité dans les revues de direction",
                ],
                "insuffisant_si": [
                    "Risques identifiés sans aucune action planifiée",
                    "Actions planifiées mais jamais suivies",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Registre des risques et opportunités", "Plan d'actions associé"],
        "poids": 1.0,
        "clauses_liees": ["4.1", "4.2", "6.2", "9.1", "10.2"],
    },
    "6.2": {
        "titre": "Objectifs qualité et planification",
        "section": 6,
        "intention_globale": (
            "Les objectifs qualité doivent être MESURABLES et SUIVIS — pas des vœux pieux. "
            "Un objectif 'améliorer la satisfaction client' sans indicateur = non-conforme. "
            "'Atteindre 90% de satisfaction client au T3' = conforme."
        ),
        "exigences": [
            {
                "id": "6.2.a",
                "lettre": "Établir des objectifs qualité mesurables cohérents avec la politique",
                "intention": (
                    "MESURABLE = il existe un chiffre, un taux, un délai. "
                    "3 objectifs bien suivis valent mieux que 20 oubliés."
                ),
                "satisfait_si": [
                    "Objectifs SMART documentés avec indicateur chiffré",
                    "Tableau de bord avec cibles et résultats actuels",
                ],
                "insuffisant_si": [
                    "Objectifs qualitatifs sans indicateur associé",
                    "Objectifs définis mais sans aucune mesure réalisée",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "6.2.b",
                "lettre": "Planifier comment atteindre les objectifs",
                "intention": "Responsable + échéance = minimum requis pour chaque objectif.",
                "satisfait_si": [
                    "Plan d'objectifs avec colonnes responsable et échéance",
                ],
                "insuffisant_si": [
                    "Objectifs sans responsable ni échéance",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Tableau de bord des objectifs qualité chiffrés", "Plan d'atteinte des objectifs"],
        "poids": 0.9,
        "clauses_liees": ["5.2", "6.1", "9.1"],
    },
    "7.1": {
        "titre": "Ressources",
        "section": 7,
        "intention_globale": (
            "L'organisme doit avoir les moyens de ses ambitions qualité. "
            "Infrastructures défaillantes documentées mais non traitées = écart. "
            "Savoir-faire critique porté par une seule personne sans documentation = risque §6.1."
        ),
        "exigences": [
            {
                "id": "7.1.a",
                "lettre": "Fournir les ressources humaines, infrastructure, environnement nécessaires",
                "intention": "Ressources identifiées, pourvues, et maintenues opérationnelles.",
                "satisfait_si": [
                    "Plan de ressources annuel documenté",
                    "Registre des équipements avec plan de maintenance",
                ],
                "insuffisant_si": [
                    "Équipements critiques sans maintenance planifiée",
                ],
                "bloquant_si_absent": False,
            },
            {
                "id": "7.1.b",
                "lettre": "Gérer les connaissances organisationnelles",
                "intention": (
                    "Capitaliser sur ce que l'organisme sait faire pour ne pas le perdre. "
                    "Format très libre : procédures, tutorats, base documentaire, wiki."
                ),
                "satisfait_si": [
                    "Procédures documentées pour les activités critiques",
                    "Plan de tutorat/succession pour postes clés",
                ],
                "insuffisant_si": [
                    "Savoir-faire critique porté par une seule personne sans documentation",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Plan de ressources", "Registre des équipements", "Base documentaire"],
        "poids": 0.8,
        "clauses_liees": ["7.2", "6.1"],
    },
    "7.2": {
        "titre": "Compétences",
        "section": 7,
        "intention_globale": (
            "Les personnes affectant la qualité doivent être COMPÉTENTES — "
            "pas seulement diplômées. L'expérience, la formation interne, le compagnonnage "
            "sont des preuves de compétence valables."
        ),
        "exigences": [
            {
                "id": "7.2.a",
                "lettre": "Déterminer les compétences nécessaires et s'assurer que les personnes les possèdent",
                "intention": (
                    "Pour chaque poste impactant la qualité : liste des compétences requises + évaluation. "
                    "Compétence = savoir + savoir-faire + savoir-être démontré."
                ),
                "satisfait_si": [
                    "Matrice de compétences avec niveau requis vs niveau actuel",
                    "Habilitations/certifications pour postes réglementés",
                ],
                "insuffisant_si": [
                    "Compétences listées mais jamais évaluées",
                    "Postes critiques occupés sans vérification des compétences",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "7.2.b",
                "lettre": "Prendre des actions pour acquérir les compétences manquantes et vérifier l'efficacité",
                "intention": (
                    "Former ET vérifier que la formation a été efficace. "
                    "L'évaluation post-formation peut être simple : quiz, observation, résultat mesurable."
                ),
                "satisfait_si": [
                    "Plan de formation lié aux écarts identifiés",
                    "Évaluation post-formation documentée",
                ],
                "insuffisant_si": [
                    "Formations réalisées sans évaluation d'efficacité",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Matrice de compétences", "Plan de formation", "Évaluations post-formation"],
        "poids": 0.8,
        "clauses_liees": ["7.1", "7.3"],
    },
    "7.5": {
        "titre": "Informations documentées",
        "section": 7,
        "intention_globale": (
            "ISO 9001:2015 n'impose pas une liste fixe de documents — c'est intentionnel. "
            "L'organisme documente CE QUI EST NÉCESSAIRE pour ses processus. "
            "Trop documenter peut aussi être un écart (charge inutile qui décourage l'utilisation)."
        ),
        "exigences": [
            {
                "id": "7.5.a",
                "lettre": "Créer, mettre à jour et maîtriser les informations documentées",
                "intention": (
                    "Maîtriser = contrôler qui peut modifier, où c'est stocké, quelle version est en vigueur. "
                    "Format libre : SharePoint, Drive, dossier partagé. "
                    "Ce qui compte : la version applicable est accessible et les obsolètes sont retirées."
                ),
                "satisfait_si": [
                    "Système de gestion documentaire avec contrôle de version",
                    "Index des documents avec date de révision",
                ],
                "insuffisant_si": [
                    "Plusieurs versions d'un même document en circulation simultanée",
                    "Documents critiques sans date de révision",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Règle de maîtrise documentaire", "Liste des documents avec versions"],
        "poids": 0.9,
        "clauses_liees": ["4.4", "8.1"],
    },
    "8.1": {
        "titre": "Planification et maîtrise opérationnelles",
        "section": 8,
        "intention_globale": (
            "Les activités qui produisent le produit/service doivent être MAÎTRISÉES — "
            "c'est-à-dire réalisées de façon à obtenir un résultat prévisible et conforme. "
            "La maîtrise peut être une procédure, un mode opératoire, une check-list, "
            "ou même un professionnel expérimenté dont la compétence est démontrée (§7.2)."
        ),
        "exigences": [
            {
                "id": "8.1.a",
                "lettre": "Planifier et maîtriser les processus avec des critères définis",
                "intention": (
                    "Chaque processus opérationnel doit avoir des CRITÈRES définis : "
                    "comment sait-on que le résultat est acceptable ?"
                ),
                "satisfait_si": [
                    "Procédures opérationnelles avec critères d'acceptation",
                    "Plans qualité projet avec jalons de contrôle",
                    "Check-lists utilisées en pratique",
                ],
                "insuffisant_si": [
                    "Aucun critère d'acceptation défini pour les processus critiques",
                    "Procédures existantes mais non utilisées sur le terrain",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Procédures opérationnelles", "Critères d'acceptation", "Plans qualité"],
        "poids": 0.9,
        "clauses_liees": ["4.4", "8.5", "8.6"],
    },
    "9.1": {
        "titre": "Surveillance, mesure, analyse et évaluation",
        "section": 9,
        "intention_globale": (
            "Sans mesure, pas d'amélioration possible. L'organisme doit avoir des DONNÉES "
            "sur la performance de ses processus et la satisfaction de ses clients. "
            "La fréquence de mesure doit être cohérente avec le rythme des activités : "
            "hebdomadaire pour une chaîne de production, annuelle pour une activité saisonnière — les deux sont conformes."
        ),
        "exigences": [
            {
                "id": "9.1.a",
                "lettre": "Déterminer quoi surveiller, quand, comment analyser",
                "intention": (
                    "L'organisme choisit SES indicateurs — ISO ne prescrit pas lesquels. "
                    "Mais chaque processus clé doit avoir AU MOINS UN indicateur mesuré."
                ),
                "satisfait_si": [
                    "Tableau de bord avec indicateurs mesurés à fréquence définie",
                    "KPIs par processus avec cibles et résultats actuels",
                ],
                "insuffisant_si": [
                    "Indicateurs définis mais non mesurés",
                    "Mesures sans analyse (chiffres sans interprétation)",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "9.1.b",
                "lettre": "Surveiller la perception des clients",
                "intention": (
                    "Savoir CE QUE LES CLIENTS PENSENT — pas ce que l'organisme suppose. "
                    "Format libre : enquête, interviews, analyse des réclamations, NPS. "
                    "Une mesure par cycle de revue de direction minimum."
                ),
                "satisfait_si": [
                    "Enquête satisfaction client avec analyse",
                    "Taux de réclamations suivi et analysé",
                    "Analyse des avis si pertinent pour le secteur",
                ],
                "insuffisant_si": [
                    "Aucune mesure de satisfaction depuis plus d'un an",
                    "Réclamations reçues mais non analysées",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Tableau de bord KPI", "Résultats satisfaction client", "Analyses de tendances"],
        "poids": 1.0,
        "clauses_liees": ["6.2", "9.3", "10.1"],
    },
    "9.2": {
        "titre": "Audit interne",
        "section": 9,
        "intention_globale": (
            "Les audits internes sont l'outil d'auto-évaluation de l'organisme. "
            "Ils doivent être OBJECTIFS (auditeur différent du responsable du domaine) "
            "et COUVRIR l'ensemble du SMQ sur un cycle raisonnable."
        ),
        "exigences": [
            {
                "id": "9.2.a",
                "lettre": "Réaliser des audits internes à intervalles planifiés",
                "intention": (
                    "PLANIFIÉS = programme d'audit existant AVANT les audits. "
                    "La fréquence dépend de la criticité des processus — pas de minimum ISO."
                ),
                "satisfait_si": [
                    "Programme d'audit annuel couvrant tous les processus",
                    "Audits réalisés selon le programme avec rapports",
                ],
                "insuffisant_si": [
                    "Aucun programme (audits uniquement réactifs)",
                    "Auditeur auditant son propre domaine",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "9.2.b",
                "lettre": "Prendre des actions correctives sans délai injustifié",
                "intention": (
                    "Les écarts d'audit doivent déboucher sur des ACTIONS. "
                    "Un écart majeur non traité 6 mois après = écart majeur en lui-même."
                ),
                "satisfait_si": [
                    "Plan d'actions correctives lié aux rapports d'audit",
                    "Suivi de clôture avec vérification d'efficacité",
                ],
                "insuffisant_si": [
                    "Rapports d'audit sans plan d'actions",
                    "Actions définies mais jamais clôturées",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["Programme d'audit", "Rapports d'audit", "Plans d'actions post-audit"],
        "poids": 0.9,
        "clauses_liees": ["10.2", "9.3"],
    },
    "9.3": {
        "titre": "Revue de direction",
        "section": 9,
        "intention_globale": (
            "La revue de direction est LA réunion où la direction évalue si le SMQ fonctionne "
            "et décide des améliorations. Elle doit couvrir les éléments d'entrée requis "
            "et produire des DÉCISIONS concrètes. Une réunion sans décisions documentées = revue incomplète."
        ),
        "exigences": [
            {
                "id": "9.3.a",
                "lettre": "Réaliser des revues couvrant tous les éléments d'entrée requis",
                "intention": (
                    "Éléments obligatoires : état des actions précédentes, performance qualité (KPIs, réclamations), "
                    "résultats audits, satisfaction client, risques/opportunités. "
                    "Un PV montrant que TOUS ces points ont été abordés = conforme."
                ),
                "satisfait_si": [
                    "PV de revue avec ordre du jour couvrant tous les éléments requis",
                    "Tableau de bord présenté en revue",
                ],
                "insuffisant_si": [
                    "Revue sans présentation des résultats KPIs",
                    "PV signé uniquement par le responsable qualité sans présence direction",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "9.3.b",
                "lettre": "Produire des décisions et actions comme éléments de sortie",
                "intention": (
                    "La revue doit déboucher sur DES DÉCISIONS documentées. "
                    "Une revue sans aucune action décidée = organisme en pilotage automatique = écart."
                ),
                "satisfait_si": [
                    "Actions décidées en revue, tracées dans un plan d'actions",
                    "Suivi des actions de la revue précédente en début de revue",
                ],
                "insuffisant_si": [
                    "PV de revue sans aucune action décidée",
                    "Actions décidées mais non tracées ni suivies",
                ],
                "bloquant_si_absent": True,
            },
        ],
        "preuves_attendues": ["PV de revue de direction complet", "Tableau de bord présenté", "Plan d'actions issu de la revue"],
        "poids": 0.9,
        "clauses_liees": ["5.1", "9.1", "10.3"],
    },
    "10.2": {
        "titre": "Non-conformité et action corrective",
        "section": 10,
        "intention_globale": (
            "Quand quelque chose ne va pas, l'organisme doit RÉAGIR et APPRENDRE. "
            "ISO 9001 demande d'aller à la CAUSE RACINE — pas juste corriger le symptôme. "
            "Un organisme qui traite les NC rapidement mais toujours les mêmes = cause racine non traitée = écart."
        ),
        "exigences": [
            {
                "id": "10.2.a",
                "lettre": "Réagir, analyser les causes racines, mettre en œuvre des actions correctives",
                "intention": (
                    "3 niveaux obligatoires : (1) correction immédiate, "
                    "(2) analyse causale (POURQUOI), "
                    "(3) action corrective pour éviter la récurrence."
                ),
                "satisfait_si": [
                    "Fiche NC avec correction + analyse causale + action corrective",
                    "Méthode causale appliquée (5M, 5 pourquoi, etc.)",
                ],
                "insuffisant_si": [
                    "NC traitées sans analyse causale (symptôme uniquement)",
                    "Mêmes NC récurrentes sans traitement de la cause racine",
                ],
                "bloquant_si_absent": True,
            },
            {
                "id": "10.2.b",
                "lettre": "Vérifier l'efficacité des actions correctives",
                "intention": (
                    "APRÈS mise en œuvre : vérifier que le problème ne s'est pas reproduit. "
                    "La vérification peut être un suivi indicateur, un re-audit, ou une observation terrain."
                ),
                "satisfait_si": [
                    "Critères d'efficacité définis dans la fiche NC",
                    "Taux de récurrence des NC mesuré et en diminution",
                ],
                "insuffisant_si": [
                    "Aucune vérification d'efficacité réalisée",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Registre des non-conformités", "Fiches NC avec analyse causale"],
        "poids": 1.0,
        "clauses_liees": ["8.7", "9.2", "10.3"],
    },
    "10.3": {
        "titre": "Amélioration continue",
        "section": 10,
        "intention_globale": (
            "L'amélioration continue est l'ADN de ISO 9001. "
            "L'auditeur cherche une DYNAMIQUE — est-ce que les choses s'améliorent vraiment ? "
            "Des indicateurs en progression, des NC en diminution = preuve vivante. "
            "Un plan d'amélioration sur papier sans résultats = insuffisant."
        ),
        "exigences": [
            {
                "id": "10.3.a",
                "lettre": "Améliorer en permanence la pertinence, l'adéquation et l'efficacité du SMQ",
                "intention": (
                    "PERMANENCE = pas un projet ponctuel, une culture. "
                    "Les preuves sont dans les tendances des indicateurs, les actions réalisées."
                ),
                "satisfait_si": [
                    "Indicateurs de performance en progression sur 2+ cycles",
                    "Actions d'amélioration réalisées et bénéfices mesurés",
                ],
                "insuffisant_si": [
                    "Indicateurs stagnants ou dégradés sans plan de correction",
                    "SMQ figé depuis sa mise en place sans évolution",
                ],
                "bloquant_si_absent": False,
            },
        ],
        "preuves_attendues": ["Tendances KPIs sur 2+ périodes", "Bilan des actions d'amélioration"],
        "poids": 0.8,
        "clauses_liees": ["9.1", "9.3", "10.2"],
    },
}


# ---------------------------------------------------------------------------
# 2. ENUMS & DATACLASSES
# ---------------------------------------------------------------------------

class NiveauMaturite(str, Enum):
    INEXISTANT    = "inexistant"
    INITIAL       = "initial"
    REPRODUCTIBLE = "reproductible"
    DEFINI        = "defini"
    GERE          = "gere"
    OPTIMISE      = "optimise"


class TypeEcart(str, Enum):
    MAJEUR      = "majeur"
    MINEUR      = "mineur"
    OBSERVATION = "observation"
    CONFORME    = "conforme"
    SUPERIEUR   = "superieur"   # Pratique dépasse l'exigence


class CriticiteRisque(str, Enum):
    CRITIQUE = "critique"
    ELEVE    = "eleve"
    MODERE   = "modere"
    FAIBLE   = "faible"


@dataclass
class EvaluationClause:
    clause_id: str
    score: float
    niveau: NiveauMaturite
    type_ecart: TypeEcart
    ecarts_identifies: list[str]
    recommandations: list[str]
    preuves_manquantes: list[str]
    # Raisonnement explicite en 4 étapes — traçabilité de la décision IA
    intention_comprise: str = ""    # Étape 1 : ce que l'auditeur a compris de l'intention
    analyse_pratiques: str = ""     # Étape 2 : comment les pratiques réelles satisfont l'intention
    impacts_croises: str = ""       # Étape 3 : incohérences inter-clauses détectées
    verdict_justifie: str = ""      # Étape 4 : pourquoi ce score précisément
    confiance_ia: float = 1.0
    clauses_impactees: list[str] = field(default_factory=list)


@dataclass
class RapportConformite:
    score_global: float
    niveau_global: NiveauMaturite
    scores_par_section: dict[str, float]
    clauses_bloquantes: list[str]
    pret_certification: bool
    synthese: str = ""
    recommandations_prioritaires: list[str] = field(default_factory=list)
    points_forts: list[str] = field(default_factory=list)
    alertes_croisees: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 3. MOTEUR STATIQUE — déterministe, sans IA
# ---------------------------------------------------------------------------

def score_to_niveau(score: float) -> NiveauMaturite:
    if score < 0.10: return NiveauMaturite.INEXISTANT
    if score < 0.30: return NiveauMaturite.INITIAL
    if score < 0.55: return NiveauMaturite.REPRODUCTIBLE
    if score < 0.75: return NiveauMaturite.DEFINI
    if score < 1: return NiveauMaturite.GERE
    return NiveauMaturite.OPTIMISE


def score_to_type_ecart(score: float) -> TypeEcart:
    if score < 0.40: return TypeEcart.MAJEUR
    if score < 0.70: return TypeEcart.MINEUR
    if score < 0.90: return TypeEcart.OBSERVATION
    return TypeEcart.CONFORME


def calcul_rpn(probabilite: int, gravite: int, detectabilite: int) -> int:
    if not all(1 <= v <= 10 for v in (probabilite, gravite, detectabilite)):
        raise ValueError("Chaque dimension RPN doit être entre 1 et 10")
    return probabilite * gravite * detectabilite


def rpn_to_criticite(rpn: int) -> CriticiteRisque:
    if rpn >= 200: return CriticiteRisque.CRITIQUE
    if rpn >= 100: return CriticiteRisque.ELEVE
    if rpn >= 50:  return CriticiteRisque.MODERE
    return CriticiteRisque.FAIBLE


def risque_necessite_action(rpn: int) -> bool:
    return rpn >= 50


_TRANSITIONS_ACTION: dict[str, list[str]] = {
    "planifiee":  ["en_cours", "annulee"],
    "en_cours":   ["terminee", "en_attente", "annulee"],
    "en_attente": ["en_cours", "annulee"],
    "terminee":   ["efficace", "inefficace"],
    "efficace":   [],
    "inefficace": ["planifiee"],
    "annulee":    [],
}

def transition_action_valide(statut_actuel: str, nouveau_statut: str) -> bool:
    return nouveau_statut in _TRANSITIONS_ACTION.get(statut_actuel, [])


def get_clause(clause_id: str) -> dict:
    clause = ISO_CLAUSES.get(clause_id)
    if not clause:
        raise ValueError(f"Clause ISO inconnue : {clause_id}")
    return clause


def get_clauses_section(section: int) -> dict[str, dict]:
    return {cid: c for cid, c in ISO_CLAUSES.items() if c["section"] == section}


def score_global_pondere(scores: dict[str, float]) -> float:
    total_poids, total_score = 0.0, 0.0
    for clause_id, score in scores.items():
        clause = ISO_CLAUSES.get(clause_id)
        if clause:
            poids = clause["poids"]
            total_score += score * poids
            total_poids += poids
    return round(total_score / total_poids, 3) if total_poids else 0.0


# ---------------------------------------------------------------------------
# 4. CLIENT IA — système prompt d'auditeur avec philosophie explicite
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT_AUDITEUR = """Tu es un auditeur ISO 9001:2015 expert avec 20 ans d'expérience en certification.

Ta philosophie d'audit — règles absolues de raisonnement :

RÈGLE 1 — INTENTION > LETTRE
ISO 9001:2015 est basé sur des principes, pas des règles rigides. Tu évalues si l'INTENTION
est satisfaite, pas si la lettre est respectée à la virgule.
Exemple : "rapport mensuel exigé, rapports hebdomadaires fournis" → CONFORME voire SUPÉRIEUR.
La fréquence plus élevée satisfait mieux l'intention de surveillance régulière.

RÈGLE 2 — PRATIQUE SUPÉRIEURE = SCORE MAXIMUM
Si une pratique DÉPASSE l'exigence, le score est 1.0 et le type est "superieur".
Tu ne pénalises jamais une organisation qui fait mieux que ce qui est demandé.

RÈGLE 3 — FORME ≠ FOND
Un document qui existe mais n'est pas utilisé = NON CONFORME.
Une pratique informelle mais systématique et prouvable = CONFORME.
Tu cherches des preuves de réalité opérationnelle, pas de conformité documentaire superficielle.

RÈGLE 4 — RAISONNEMENT EXPLICITE OBLIGATOIRE
Tu dois expliquer POURQUOI tu donnes ce score, en montrant ton raisonnement étape par étape.
Un auditeur qui ne justifie pas = auditeur non crédible.

RÈGLE 5 — CALIBRAGE DES ÉCARTS
- MAJEUR uniquement si l'exigence est absente OU la pratique est sans rapport avec l'intention.
- MINEUR si l'intention est partiellement satisfaite avec des lacunes significatives.
- OBSERVATION si l'intention est satisfaite mais des améliorations sont possibles.
- Ne pas "surclasser" les écarts pour paraître sévère.

Règle de réponse : UNIQUEMENT du JSON valide. Aucun texte avant ou après. Langue : français professionnel."""


async def _appel_gemini(prompt: str, max_tokens: int = 8192) -> dict:
    """Appelle l'API de Groq (remplace Gemini pour éviter le blocage de région)."""
    
    # 🚨 1. VA SUR console.groq.com POUR CRÉER UNE CLÉ
    # 🚨 2. COLLE TA CLÉ GROQ ICI (elle doit commencer par "gsk_")
    api_key = "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"
    
    if not api_key or api_key.startswith("AIza"):
        print("🚨 ATTENTION: Tu as laissé la clé Google ! Il faut une clé Groq (gsk_...)")
        return {"error": "Clé API invalide"}

    # L'URL et les headers spécifiques à Groq (format OpenAI)
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Le payload adapté pour Groq
    # Le payload adapté pour Groq
    payload = {
        "model": "llama-3.3-70b-versatile",  # <--- MODIFIE JUSTE CETTE LIGNE
        "messages": [
            {
                "role": "system", 
                "content": "Tu es un auditeur expert ISO 9001. Tu dois obligatoirement répondre avec un objet JSON valide."
            },
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": max_tokens
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            # Affichage pour t'aider à débugger
            print(f"🚀 Status code Groq : {response.status_code}")
            
            response.raise_for_status()
            res_json = response.json()

            # L'extraction du texte est un peu différente avec Groq/OpenAI
            texte = res_json["choices"][0]["message"]["content"].strip()

            # Nettoyage markdown de sécurité
            if texte.startswith("```"):
                texte = texte.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            return json.loads(texte)

    except json.JSONDecodeError as e:
        print(f"\n🚨 ERREUR JSON : Le modèle n'a pas renvoyé un JSON valide ({e})\n")
        return {"error": f"JSON invalide : {e}"}
        
    except httpx.HTTPStatusError as e:
        print(f"\n🚨 ERREUR API GROQ : {e.response.status_code} - {e.response.text}\n")
        return {"error": f"Erreur API Groq: {e.response.status_code}"}
        
    except Exception as e:
        print(f"\n🚨 AUTRE ERREUR : {str(e)}\n")
        return {"error": str(e)}
    
    
class ISOEngineError(Exception):
    pass


# ---------------------------------------------------------------------------
# 5. ANALYSE INTELLIGENTE — raisonnement en 4 étapes
# ---------------------------------------------------------------------------

async def analyser_conformite_clause(
    clause_id: str,
    observations: str,
    preuves_fournies: list[str],
    contexte_processus: dict | None = None,
    scores_autres_clauses: dict[str, float] | None = None,
) -> EvaluationClause:
    """
    Analyse une clause ISO 9001 avec raisonnement en 4 étapes :

    Étape 1 — INTENTION  : Quelle est la vraie intention de cette clause ?
    Étape 2 — PRATIQUES  : Les pratiques observées satisfont-elles cette intention ?
                           (pratique différente mais équivalente/supérieure = conforme)
    Étape 3 — CROSS      : Y a-t-il des impacts sur les clauses liées ?
    Étape 4 — VERDICT    : Score calibré avec justification explicite

    Le moteur ne pénalise JAMAIS une pratique qui dépasse l'exigence.
    """
    clause = get_clause(clause_id)
    liees = clause.get("clauses_liees", [])

    # Contexte cross-clause
    contexte_croises = {}
    if scores_autres_clauses:
        for cid in liees:
            if cid in scores_autres_clauses:
                c = ISO_CLAUSES.get(cid, {})
                contexte_croises[cid] = {
                    "titre": c.get("titre", ""),
                    "score": scores_autres_clauses[cid],
                    "niveau": score_to_niveau(scores_autres_clauses[cid]).value,
                }

    prompt = f"""Analyse la conformité à la clause ISO 9001:2015 {clause_id} — {clause['titre']}.

═══════════════════════════════════════════
RÉFÉRENTIEL DE LA CLAUSE
═══════════════════════════════════════════

INTENTION GLOBALE (ce que cette clause cherche vraiment à garantir) :
{clause['intention_globale']}

EXIGENCES DÉTAILLÉES (lettre ET intention de chaque sous-exigence, avec exemples concrets) :
{json.dumps(clause['exigences'], ensure_ascii=False, indent=2)}

═══════════════════════════════════════════
RÉALITÉ DE L'ORGANISME
═══════════════════════════════════════════

OBSERVATIONS TERRAIN :
{observations}

PREUVES DOCUMENTAIRES FOURNIES :
{json.dumps(preuves_fournies, ensure_ascii=False, indent=2)}

CONTEXTE DU PROCESSUS AUDITÉ :
{json.dumps(contexte_processus or {{}}, ensure_ascii=False, indent=2)}

═══════════════════════════════════════════
CONTEXTE INTER-CLAUSES
═══════════════════════════════════════════

Scores des clauses directement liées à {clause_id} :
{json.dumps(contexte_croises, ensure_ascii=False, indent=2) if contexte_croises else "Non disponibles."}

═══════════════════════════════════════════
RAISONNEMENT OBLIGATOIRE EN 4 ÉTAPES
═══════════════════════════════════════════

ÉTAPE 1 — INTENTION : Reformule dans tes propres mots ce que cette clause cherche VRAIMENT
à garantir. Pas la lettre — l'objectif final pour la qualité de l'organisme.

ÉTAPE 2 — ANALYSE DES PRATIQUES : Pour chaque sous-exigence de la clause, analyse si la
pratique observée satisfait l'INTENTION (même si le format est différent de ce qui est écrit).
Applique IMPÉRATIVEMENT ces règles :
• Si la pratique observée DÉPASSE l'exigence (ex: fréquence plus élevée, documentation plus
  complète, contrôles plus nombreux) → score élevé, type "superieur", aucun écart.
• Si la pratique est ÉQUIVALENTE à l'exigence dans un format différent → conforme.
• Si la pratique traite le SYMPTÔME mais pas l'intention → non-conforme malgré l'apparence.
• Si la pratique est ABSENTE → écart majeur si la sous-exigence est bloquante.

ÉTAPE 3 — IMPACTS CROISÉS : En regardant les scores des clauses liées, y a-t-il des
incohérences ? (Ex: §6.2 conforme mais §9.1 insuffisant → les objectifs définis ne sont pas
mesurés → cela affaiblit §6.2 aussi). Signale uniquement les incohérences réelles.

ÉTAPE 4 — VERDICT CALIBRÉ : Donne un score entre 0.0 et 1.0 et justifie-le en 2 phrases.
Barème de calibrage :
• 0.00–0.39 : exigence absente OU pratique sans lien avec l'intention → MAJEUR
• 0.40–0.69 : intention partiellement satisfaite, lacunes significatives → MINEUR
• 0.70–0.89 : intention satisfaite, des améliorations sont possibles → OBSERVATION
• 0.90–0.99 : intention pleinement satisfaite → CONFORME
• 1.00       : pratique dépasse l'exigence → SUPERIEUR

Réponds avec ce JSON exact, sans texte autour :
{{
  "etape1_intention": "<reformulation de l'intention réelle — 2 phrases max>",
  "etape2_analyse": "<analyse pratique vs intention pour chaque sous-exigence — sois précis>",
  "etape3_impacts_croises": "<alertes inter-clauses OU 'Aucune incohérence détectée'>",
  "etape4_verdict": "<justification du score en 2 phrases>",
  "score": <float 0.0-1.0>,
  "type_ecart": "<majeur|mineur|observation|conforme|superieur>",
  "ecarts_identifies": [
    "<écart précis — commencer par un verbe: Absence de / Non-documentation de / Insuffisance de ...>"
  ],
  "recommandations": [
    "<action concrète — format: VERBE + OBJET + DÉLAI + RESPONSABLE SUGGÉRÉ>"
  ],
  "preuves_manquantes": [
    "<preuve spécifique dont l'absence justifie un écart>"
  ],
  "clauses_impactees": ["<clause_id si impact réel détecté>"],
  "confiance": <float 0.0-1.0>
}}"""

    try:
        result = await _appel_gemini(prompt, max_tokens=2000)
        score = float(result.get("score", 0.5))

        return EvaluationClause(
            clause_id=clause_id,
            score=score,
            niveau=score_to_niveau(score),
            type_ecart=TypeEcart(result.get("type_ecart", "mineur")),
            ecarts_identifies=result.get("ecarts_identifies", []),
            recommandations=result.get("recommandations", []),
            preuves_manquantes=result.get("preuves_manquantes", []),
            intention_comprise=result.get("etape1_intention", ""),
            analyse_pratiques=result.get("etape2_analyse", ""),
            impacts_croises=result.get("etape3_impacts_croises", ""),
            verdict_justifie=result.get("etape4_verdict", ""),
            confiance_ia=float(result.get("confiance", 1.0)),
            clauses_impactees=result.get("clauses_impactees", []),
        )

    except ISOEngineError:
        # Fallback déterministe si l'IA est indisponible
        return EvaluationClause(
            clause_id=clause_id,
            score=0.5,
            niveau=NiveauMaturite.REPRODUCTIBLE,
            type_ecart=TypeEcart.MINEUR,
            ecarts_identifies=["Analyse IA indisponible — évaluation manuelle requise"],
            recommandations=["Relancer l'analyse quand le service IA est disponible"],
            preuves_manquantes=[],
            verdict_justifie="Score par défaut 0.5 — analyse IA non disponible",
            confiance_ia=0.0,
        )


async def generer_rapport_conformite(
    scores_par_clause: dict[str, float],
    evaluations_detail: list[EvaluationClause],
    contexte_organisme: dict,
) -> RapportConformite:
    """
    Rapport de conformité global avec :
    - Score global pondéré (déterministe)
    - Détection des incohérences inter-clauses (IA)
    - Points forts — ce que l'organisme fait bien (IA)
    - Top 5 recommandations prioritaires calibrées (IA)
    """
    score_global = score_global_pondere(scores_par_clause)
    niveau_global = score_to_niveau(score_global)

    scores_par_section: dict[str, float] = {}
    for section_num in range(4, 11):
        clauses_section = get_clauses_section(section_num)
        scores_section = {cid: scores_par_clause.get(cid, 0.0) for cid in clauses_section}
        if scores_section:
            scores_par_section[f"§{section_num}"] = round(
                sum(scores_section.values()) / len(scores_section), 3
            )

    clauses_bloquantes = [
        cid for cid, score in scores_par_clause.items()
        if score_to_type_ecart(score) == TypeEcart.MAJEUR
    ]
    clauses_superieures = [
        cid for cid, score in scores_par_clause.items()
        if score >= 1.0
    ]
    pret_certification = len(clauses_bloquantes) == 0 and score_global >= 0.75

    resume_evaluations = [
        {
            "clause": e.clause_id,
            "score": e.score,
            "type_ecart": e.type_ecart.value,
            "ecarts": e.ecarts_identifies[:2],
            "clauses_impactees": e.clauses_impactees,
            "verdict": e.verdict_justifie,
        }
        for e in evaluations_detail
    ]

    prompt = f"""Produis la synthèse d'un rapport d'audit ISO 9001:2015.

RÉSULTATS :
- Score global pondéré : {score_global:.1%}
- Niveau de maturité : {niveau_global.value}
- Prêt pour certification : {"OUI" if pret_certification else "NON"}
- Clauses bloquantes : {clauses_bloquantes or "Aucune"}
- Clauses avec pratiques supérieures aux exigences : {clauses_superieures or "Aucune"}

SCORES PAR SECTION :
{json.dumps(scores_par_section, ensure_ascii=False, indent=2)}

DÉTAIL DES ÉVALUATIONS :
{json.dumps(resume_evaluations, ensure_ascii=False, indent=2)}

CONTEXTE DE L'ORGANISME :
{json.dumps(contexte_organisme, ensure_ascii=False, indent=2)}

Important : mentionne explicitement les pratiques supérieures comme points forts.
Identifie les incohérences inter-clauses (ex: objectifs définis mais non mesurés).

Réponds avec ce JSON exact :
{{
  "synthese": "<4-5 phrases : bilan global, points saillants, posture de certification>",
  "points_forts": [
    "<point fort concret — ce que l'organisme fait bien ou dépasse l'exigence>",
    "<point fort 2>",
    "<point fort 3>"
  ],
  "recommandations_prioritaires": [
    "<action 1 la plus critique — VERBE + OBJET + DÉLAI>",
    "<action 2>",
    "<action 3>",
    "<action 4>",
    "<action 5>"
  ],
  "alertes_croisees": [
    "<incohérence inter-clauses détectée — ex: §6.2 conforme mais §9.1 insuffisant>"
  ]
}}"""

    try:
        result = await _appel_gemini(prompt, max_tokens=1200)
        synthese = result.get("synthese", "")
        points_forts = result.get("points_forts", [])
        recommandations = result.get("recommandations_prioritaires", [])
        alertes = result.get("alertes_croisees", [])
    except ISOEngineError:
        synthese = (
            f"Score global : {score_global:.1%} — niveau {niveau_global.value}. "
            f"{len(clauses_bloquantes)} clause(s) bloquante(s). "
            f"Certification {'envisageable' if pret_certification else 'non recommandée à ce stade'}."
        )
        points_forts = []
        recommandations = [f"Traiter en priorité la clause {cid}" for cid in clauses_bloquantes[:5]]
        alertes = []

    return RapportConformite(
        score_global=score_global,
        niveau_global=niveau_global,
        scores_par_section=scores_par_section,
        clauses_bloquantes=clauses_bloquantes,
        pret_certification=pret_certification,
        synthese=synthese,
        recommandations_prioritaires=recommandations,
        points_forts=points_forts,
        alertes_croisees=alertes,
    )


# ---------------------------------------------------------------------------
# 6. FONCTIONS ADDITIONNELLES
# ---------------------------------------------------------------------------

async def evaluer_risque_intelligent(
    description_risque: str,
    contexte_processus: dict,
    probabilite: int,
    gravite: int,
    detectabilite: int,
) -> dict:
    rpn = calcul_rpn(probabilite, gravite, detectabilite)
    criticite = rpn_to_criticite(rpn)

    prompt = f"""Analyse ce risque qualité dans le cadre ISO 9001:2015 §6.1.

DESCRIPTION : {description_risque}
PROCESSUS : {json.dumps(contexte_processus, ensure_ascii=False)}
RPN : {rpn} (P={probabilite} × G={gravite} × D={detectabilite}) → Criticité : {criticite.value}

Réponds avec ce JSON exact :
{{
  "plan_traitement": "<plan recommandé — 2 phrases avec actions concrètes>",
  "clauses_iso_concernees": ["<clause_id>"],
  "action_immediate_requise": <true|false>,
  "mesures_prevention": ["<mesure concrète et actionnable>"],
  "indicateur_suivi": "<KPI à mesurer pour surveiller ce risque>",
  "opportunite_associee": "<opportunité que ce risque révèle, si applicable>"
}}"""

    try:
        result = await _appel_gemini(prompt, max_tokens=600)
    except ISOEngineError:
        result = {
            "plan_traitement": "Analyser les causes racines et mettre en place des actions correctives.",
            "clauses_iso_concernees": ["6.1", "10.2"],
            "action_immediate_requise": criticite in (CriticiteRisque.CRITIQUE, CriticiteRisque.ELEVE),
            "mesures_prevention": [],
            "indicateur_suivi": "Taux d'occurrence du risque",
            "opportunite_associee": "",
        }

    return {"rpn": rpn, "criticite": criticite.value, "necessite_action": risque_necessite_action(rpn), **result}


async def analyser_action_corrective(
    description_nc: str,
    cause_racine: str,
    action_proposee: str,
) -> dict:
    """
    Vérifie si l'action corrective traite la cause racine ou seulement le symptôme.
    Erreur classique §10.2 que le moteur doit détecter.
    """
    prompt = f"""Évalue cette action corrective selon ISO 9001:2015 §10.2.

NON-CONFORMITÉ : {description_nc}
CAUSE RACINE IDENTIFIÉE : {cause_racine}
ACTION CORRECTIVE PROPOSÉE : {action_proposee}

Raisonne ainsi :
1. L'action s'attaque-t-elle à la CAUSE RACINE ou au symptôme visible ?
2. Si cette action est mise en œuvre, le problème peut-il se reproduire ? Pourquoi ?
3. Quels critères permettront de vérifier l'efficacité ?

Réponds avec ce JSON exact :
{{
  "traite_cause_racine": <true|false>,
  "risque_recurrence": "<faible|modere|eleve>",
  "raisonnement": "<explication en 2-3 phrases>",
  "ameliorations_suggerees": ["<amélioration si l'action est insuffisante>"],
  "criteres_efficacite": ["<critère mesurable — ex: taux NC < 5% sur 3 mois>"],
  "delai_verification_jours": <entier>
}}"""

    try:
        return await _appel_gemini(prompt, max_tokens=700)
    except ISOEngineError:
        return {
            "traite_cause_racine": True,
            "risque_recurrence": "modere",
            "raisonnement": "Analyse IA indisponible.",
            "ameliorations_suggerees": [],
            "criteres_efficacite": [],
            "delai_verification_jours": 30,
        }


async def suggerer_kpi_processus(
    nom_processus: str,
    description: str,
    clauses_applicables: list[str],
    kpis_existants: list[dict],
) -> list[dict]:
    prompt = f"""Propose des KPIs manquants pour ce processus ISO 9001.

PROCESSUS : {nom_processus} — {description}
CLAUSES ISO APPLICABLES : {clauses_applicables}
KPIs DÉJÀ DÉFINIS : {json.dumps(kpis_existants, ensure_ascii=False)}

Propose 3 à 5 KPIs non encore couverts, chacun lié à une exigence ISO précise.

Réponds avec ce JSON exact :
{{
  "kpis": [
    {{
      "nom": "<nom court>",
      "description": "<ce que ça mesure et pourquoi>",
      "formule": "<formule précise>",
      "unite": "<%, nombre, jours, ratio>",
      "frequence": "<mensuel|trimestriel|annuel>",
      "cible": "<valeur cible recommandée>",
      "seuil_alerte": "<valeur déclenchant une alerte>",
      "clause_iso": "<clause principale couverte>",
      "donnees_source": "<où trouver les données>"
    }}
  ]
}}"""

    try:
        result = await _appel_gemini(prompt, max_tokens=1200)
        return result.get("kpis", [])
    except ISOEngineError:
        return []


# ---------------------------------------------------------------------------
# 7. UTILITAIRES
# ---------------------------------------------------------------------------

def clauses_applicables_par_type_processus(type_processus: str) -> list[str]:
    mapping = {
        "management":   ["4.1", "4.2", "5.1", "5.2", "5.3", "6.1", "6.2", "9.3", "10.1"],
        "realisation":  ["8.1", "10.2"],
        "support":      ["7.1", "7.2", "7.5"],
        "mesure":       ["9.1", "9.2", "6.2"],
        "amelioration": ["10.2", "10.3", "9.1"],
    }
    return mapping.get(type_processus, list(ISO_CLAUSES.keys()))


def verifier_completude_diagnostic(evaluations: list[dict]) -> dict:
    clauses_evaluees = {e["clause_id"] for e in evaluations}
    toutes_clauses   = set(ISO_CLAUSES.keys())
    manquantes       = toutes_clauses - clauses_evaluees
    return {
        "taux_completude": round(len(clauses_evaluees) / len(toutes_clauses), 3),
        "clauses_manquantes": sorted(manquantes),
        "complet": len(manquantes) == 0,
    }


def calculer_alertes_kpi(
    valeur_actuelle: float,
    valeur_cible: float,
    seuil_alerte: float,
    sens: str = "superieur",
) -> dict:
    ecart_pct = (
        ((valeur_actuelle - valeur_cible) / valeur_cible * 100)
        if valeur_cible != 0 else 0.0
    )
    en_alerte = (
        valeur_actuelle < seuil_alerte if sens == "superieur"
        else valeur_actuelle > seuil_alerte
    )
    return {
        "en_alerte": en_alerte,
        "ecart_cible_pct": round(ecart_pct, 2),
        "statut": "alerte" if en_alerte else ("objectif_atteint" if ecart_pct >= 0 else "en_dessous"),
    }


@lru_cache(maxsize=256)
def get_intention_clause(clause_id: str) -> str:
    return get_clause(clause_id).get("intention_globale", "")


@lru_cache(maxsize=256)
def get_exigences_clause(clause_id: str) -> tuple:
    return tuple(e["id"] for e in get_clause(clause_id).get("exigences", []))
