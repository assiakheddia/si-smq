"""
schemas/rapport.py — Génération de rapport PDF personnalisé.

Le rapport peut couvrir tous les processus actifs ("tous") ou une
sélection explicite de processus ("selection", via leurs codes).
Les "elements" correspondent aux blocs sélectionnables dans le
report builder du frontend (header, summary, kpis, charts, ...).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

ELEMENTS_VALIDES = {
    "header", "summary", "kpis", "charts", "reports_list",
    "audit_details", "non_conformities", "actions", "iso_compliance", "footer",
}


class RapportGenerationRequest(BaseModel):
    nom: str = Field(min_length=1, max_length=255)

    elements: list[str] = Field(
        default_factory=list,
        description="Identifiants des blocs à inclure dans le rapport.",
    )

    portee: Literal["tous", "selection"] = Field(
        default="tous",
        description="'tous' = tous les processus actifs, 'selection' = processus_codes.",
    )

    processus_codes: list[str] | None = Field(
        default=None,
        description="Codes des processus à inclure, requis si portee='selection'.",
    )

    @model_validator(mode="after")
    def valider(self) -> "RapportGenerationRequest":
        inconnus = set(self.elements) - ELEMENTS_VALIDES
        if inconnus:
            raise ValueError(f"Élément(s) de rapport inconnu(s) : {sorted(inconnus)}")
        if self.portee == "selection" and not self.processus_codes:
            raise ValueError(
                "processus_codes est requis lorsque portee='selection'."
            )
        return self
