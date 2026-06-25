"""
services/moteur_analytique.py — Moteur Analytique ISO 9001 (IA)

Analyse une section ISO 9001 (§4 à §10) à la fois — jamais la fiche
Processus en entier — pour rester sous les limites de contexte/tokens
de l'IA et permettre un repli localisé (une section en échec n'affecte
pas les autres).

Stratégie de résilience :
  1. Si ANTHROPIC_API_KEY est vide → repli local immédiat, aucun appel réseau.
  2. Sinon, appel à Claude avec un timeout court ; toute exception (HTTP,
     timeout, quota, JSON invalide, etc.) est capturée silencieusement et
     bascule sur l'évaluation locale (jamais d'erreur remontée à
     l'utilisateur final).

Le repli local n'est pas un message générique : il inspecte les
champs réellement renseignés sur le Processus pour cette section
(objectif, ressources, KPIs, risques...) afin de produire un constat
exploitable même sans IA.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.core.config import get_settings
from app.models.processus import Processus

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Sections ISO 9001:2015 analysées — une à la fois (anti-saturation)
# ---------------------------------------------------------------------------

SECTIONS_ISO = [
    {"code": "4",  "titre": "Contexte de l'organisme"},
    {"code": "5",  "titre": "Leadership"},
    {"code": "6",  "titre": "Planification"},
    {"code": "7",  "titre": "Support"},
    {"code": "8",  "titre": "Réalisation des activités opérationnelles"},
    {"code": "9",  "titre": "Évaluation des performances"},
    {"code": "10", "titre": "Amélioration"},
]


@dataclass
class SectionResult:
    clause_iso_code: str
    titre: str
    description: str
    consequences: str
    causes: str
    ameliorations: str
    gravite: str  # mineur | moyen | majeur | critique | conforme
    score: float  # 0-100
    source: str  # ia | local


# ---------------------------------------------------------------------------
# §1 — Contexte fourni à l'IA, extrait de la fiche Processus
# ---------------------------------------------------------------------------

def _construire_contexte(processus: Processus) -> dict:
    return {
        "code": processus.code,
        "nom": processus.nom,
        "objectif": processus.objectif or "",
        "description": processus.description or "",
        "entrees": processus.entrees or "",
        "sorties": processus.sorties or "",
        "ressources_cles": processus.ressources_cles or "",
        "pilote": processus.pilote.nom_complet if processus.pilote else None,
        "kpis": [
            {"nom": i.nom, "valeur_actuelle": i.valeur_actuelle, "valeur_cible": i.valeur_cible}
            for i in (processus.indicateurs or []) if i.est_actif
        ],
        "risques": [
            {"titre": r.titre, "criticite": r.criticite.value if r.criticite else None}
            for r in (processus.risques or []) if r.est_actif
        ],
        "nb_documents": len(processus.documents or []),
    }


# ---------------------------------------------------------------------------
# §2 — Appel IA (Anthropic Claude)
# ---------------------------------------------------------------------------

_PROMPT_SYSTEME = (
    "Tu es un auditeur qualité ISO 9001:2015 expérimenté. Pour la section "
    "donnée, évalue le processus décrit et identifie le dysfonctionnement "
    "majeur le plus pertinent au regard des exigences de cette section. "
    "Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, "
    "avec exactement ces clés : titre (string courte), description (string), "
    "consequences (string), causes (string), ameliorations (string, une "
    "amélioration par ligne séparée par \\n), gravite (une valeur parmi : "
    "mineur, moyen, majeur, critique, conforme), score (entier 0-100, 100 = "
    "totalement conforme à cette section)."
)


def _appeler_claude(section: dict, contexte: dict) -> SectionResult:
    import anthropic

    client = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        timeout=float(settings.LLM_TIMEOUT_SECONDS),
    )

    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1024,
        system=_PROMPT_SYSTEME,
        messages=[{
            "role": "user",
            "content": (
                f"Section ISO 9001 à évaluer : §{section['code']} — {section['titre']}\n\n"
                f"Données du processus (JSON) :\n{json.dumps(contexte, ensure_ascii=False)}"
            ),
        }],
    )

    texte = next(b.text for b in response.content if b.type == "text").strip()
    if texte.startswith("```"):
        texte = texte.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(texte)

    return SectionResult(
        clause_iso_code=section["code"],
        titre=str(data["titre"]),
        description=str(data.get("description", "")),
        consequences=str(data.get("consequences", "")),
        causes=str(data.get("causes", "")),
        ameliorations=str(data.get("ameliorations", "")),
        gravite=str(data.get("gravite", "moyen")),
        score=float(data.get("score", 50)),
        source="ia",
    )


# ---------------------------------------------------------------------------
# §3 — Repli local (algorithmique) — jamais d'exception, toujours un résultat
# ---------------------------------------------------------------------------

# Champs de la fiche jugés indispensables pour chaque section, et le constat
# à produire s'ils sont vides. Volontairement simple : c'est un filet de
# sécurité, pas un substitut à l'analyse IA.
_CHAMPS_REQUIS_PAR_SECTION: dict[str, list[tuple[str, str]]] = {
    "4": [("objectif", "Objectif du processus non renseigné"),
          ("description", "Contexte/enjeux du processus non documentés")],
    "5": [("pilote", "Aucun pilote désigné pour ce processus")],
    "6": [("risques", "Aucun risque identifié et tracé pour ce processus")],
    "7": [("ressources_cles", "Ressources clés (matériel, RH, budget) non renseignées")],
    "8": [("entrees", "Flux d'entrées non documentés"),
          ("sorties", "Flux de sorties non documentés")],
    "9": [("kpis", "Aucun indicateur de performance suivi pour ce processus")],
    "10": [("nb_documents", "Aucune preuve documentaire associée au processus")],
}


def _evaluation_locale(section: dict, contexte: dict) -> SectionResult:
    champs = _CHAMPS_REQUIS_PAR_SECTION.get(section["code"], [])
    manquants = [
        constat for champ, constat in champs
        if not contexte.get(champ)
    ]

    if not manquants:
        return SectionResult(
            clause_iso_code=section["code"],
            titre=f"§{section['code']} {section['titre']} — éléments de base présents",
            description="Analyse automatique locale : les champs clés attendus sont renseignés.",
            consequences="",
            causes="",
            ameliorations="",
            gravite="conforme",
            score=70.0,
            source="local",
        )

    return SectionResult(
        clause_iso_code=section["code"],
        titre=f"§{section['code']} {section['titre']} — lacune documentaire",
        description=" ; ".join(manquants),
        consequences=(
            "Non-conformité potentielle lors d'un audit de certification ISO 9001 "
            f"sur la section §{section['code']}."
        ),
        causes="Information non saisie ou non à jour dans la fiche processus.",
        ameliorations="Compléter la fiche processus avec les éléments manquants\nDésigner un responsable de la mise à jour",
        gravite="majeur" if len(manquants) > 1 else "mineur",
        score=max(0.0, 100.0 - 30.0 * len(manquants)),
        source="local",
    )


# ---------------------------------------------------------------------------
# §4 — Point d'entrée : analyse d'une section avec repli automatique
# ---------------------------------------------------------------------------

def analyser_section(processus: Processus, section: dict) -> SectionResult:
    """
    Analyse une section ISO pour un Processus donné.

    Ne lève jamais d'exception : toute erreur IA bascule silencieusement
    sur l'évaluation locale (voir module docstring).
    """
    contexte = _construire_contexte(processus)

    if not settings.ANTHROPIC_API_KEY:
        return _evaluation_locale(section, contexte)

    try:
        return _appeler_claude(section, contexte)
    except Exception as exc:  # noqa: BLE001 — bascule volontaire et générique
        logger.warning(
            "Moteur Analytique : échec IA pour §%s sur processus %s (%s) — repli local.",
            section["code"], processus.code, exc,
        )
        return _evaluation_locale(section, contexte)
