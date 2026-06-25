"""
schemas/document.py — Schemas Pydantic pour la GED (Gestion Électronique des Documents)

Modèle cible : Document (métadonnées) + chemin MinIO
Référence générée par le service : "DOC-PROC-LABO-ACHAT-001"

Schemas exposés :
  - DocumentCreate         → upload d'un nouveau document (multipart handled at router level)
  - DocumentUpdate         → modification des métadonnées uniquement
  - DocumentResponse       → réponse liste (sans URL présignée)
  - DocumentResponseDetail → réponse détail (avec URL présignée MinIO)
  - DocumentChangerStatut  → transition workflow (brouillon → valide → archive)
  - DocumentListResponse   → liste paginée
"""

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enums (miroir des enums SQLAlchemy du modèle)
# ---------------------------------------------------------------------------

class StatutDocument(str, Enum):
    brouillon = "brouillon"
    en_revue  = "en_revue"
    approuve  = "approuve"
    obsolete  = "obsolete"
    archive   = "archive"


class TypeDocument(str, Enum):
    procedure          = "procedure"
    enregistrement     = "enregistrement"
    politique          = "politique"
    plan               = "plan"
    rapport            = "rapport"
    formulaire         = "formulaire"
    manuel             = "manuel"
    charte             = "charte"
    preuve_action      = "preuve_action"
    preuve_conformite  = "preuve_conformite"
    autre              = "autre"


# ---------------------------------------------------------------------------
# Validators réutilisables
# ---------------------------------------------------------------------------

_RE_CODE_PROCESSUS = re.compile(r"^PROC-[A-Z]+-[A-Z]+(-[A-Z]+)*$")


def _valider_code_processus(v: str | None) -> str | None:
    if v is None:
        return v
    v = v.strip().upper()
    if not _RE_CODE_PROCESSUS.match(v):
        raise ValueError(
            f"Code processus invalide : '{v}'. "
            "Format attendu : PROC-LABO-ACHAT, PROC-DOC-AVANCEMENT, etc."
        )
    return v


# ---------------------------------------------------------------------------
# §1 — DocumentCreate
# ---------------------------------------------------------------------------

class DocumentCreate(BaseModel):
    """
    Données envoyées lors de l'upload d'un document.
    Le fichier lui-même est traité en multipart au niveau du router ;
    ce schema couvre uniquement les métadonnées.
    """

    titre: Annotated[str, Field(
        min_length=3,
        max_length=255,
        description="Titre descriptif du document.",
        examples=["Procédure de gestion budgétaire annuelle v2"],
    )]

    type_document: TypeDocument = Field(
        description="Catégorie fonctionnelle du document.",
        examples=["procedure"],
    )

    description: Annotated[str | None, Field(
        default=None,
        max_length=2000,
        description="Résumé ou objet du document.",
    )]

    version: Annotated[str, Field(
        default="1.0",
        max_length=20,
        pattern=r"^\d+\.\d+$",
        description="Version sémantique simplifiée : MAJEUR.MINEUR.",
        examples=["1.0", "2.3"],
    )]

    processus_code: Annotated[str | None, Field(
        default=None,
        description=(
            "Code du processus propriétaire du document. "
            "FK SET NULL à la suppression du processus."
        ),
        examples=["PROC-LABO-ACHAT"],
    )]

    tags: Annotated[list[str], Field(
        default_factory=list,
        max_length=10,
        description="Mots-clés libres (max 10).",
        examples=[["budget", "achat", "ISO-9001"]],
    )]

    est_confidentiel: bool = Field(
        default=False,
        description="Si True, l'URL présignée MinIO a une durée de vie réduite (1h vs 24h).",
    )

    @field_validator("processus_code", mode="before")
    @classmethod
    def normaliser_code_processus(cls, v: str | None) -> str | None:
        return _valider_code_processus(v)

    @field_validator("tags", mode="before")
    @classmethod
    def normaliser_tags(cls, v: list) -> list[str]:
        if not isinstance(v, list):
            raise ValueError("tags doit être une liste.")
        tags = [str(t).strip().lower() for t in v if str(t).strip()]
        if len(tags) > 10:
            raise ValueError("Maximum 10 tags par document.")
        return tags

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "titre": "Procédure de gestion des achats v1",
                "type_document": "procedure",
                "description": "Décrit le circuit de validation des dépenses du laboratoire.",
                "version": "1.0",
                "processus_code": "PROC-LABO-ACHAT",
                "tags": ["achat", "dépense", "validation"],
                "est_confidentiel": False,
            }
        },
    )


# ---------------------------------------------------------------------------
# §2 — DocumentUpdate
# ---------------------------------------------------------------------------

class DocumentUpdate(BaseModel):
    """
    Mise à jour partielle des métadonnées.
    Le chemin MinIO (minio_path) n'est jamais modifiable via ce schema :
    un nouveau fichier implique un nouvel upload (nouvelle référence).
    """

    titre: Annotated[str | None, Field(
        default=None,
        min_length=3,
        max_length=255,
    )]

    type_document: TypeDocument | None = None

    description: Annotated[str | None, Field(
        default=None,
        max_length=2000,
    )]

    version: Annotated[str | None, Field(
        default=None,
        max_length=20,
        pattern=r"^\d+\.\d+$",
    )]

    processus_code: Annotated[str | None, Field(
        default=None,
        description="Réassigner à un autre processus, ou null pour détacher.",
    )]

    tags: list[str] | None = None

    est_confidentiel: bool | None = None

    @field_validator("processus_code", mode="before")
    @classmethod
    def normaliser_code_processus(cls, v: str | None) -> str | None:
        return _valider_code_processus(v)

    @field_validator("tags", mode="before")
    @classmethod
    def normaliser_tags(cls, v: list | None) -> list[str] | None:
        if v is None:
            return None
        tags = [str(t).strip().lower() for t in v if str(t).strip()]
        if len(tags) > 10:
            raise ValueError("Maximum 10 tags par document.")
        return tags

    @model_validator(mode="after")
    def au_moins_un_champ(self) -> DocumentUpdate:
        champs = [
            self.titre, self.type_document, self.description,
            self.version, self.processus_code, self.tags,
            self.est_confidentiel,
        ]
        if all(c is None for c in champs):
            raise ValueError("Au moins un champ doit être fourni pour la mise à jour.")
        return self

    model_config = ConfigDict(str_strip_whitespace=True)


# ---------------------------------------------------------------------------
# §3 — DocumentChangerStatut
# ---------------------------------------------------------------------------

class DocumentChangerStatut(BaseModel):
    """
    Transition de statut workflow :
      brouillon → valide    (validation par pilote/admin)
      valide    → archive   (archivage)
      archive   → valide    (désarchivage, rôle admin uniquement)

    La logique de garde est dans document_service.py.
    """

    statut: StatutDocument = Field(
        description="Nouveau statut cible.",
        examples=["valide"],
    )

    commentaire: Annotated[str | None, Field(
        default=None,
        max_length=500,
        description="Motif de la transition (obligatoire pour l'archivage).",
    )]

    @model_validator(mode="after")
    def commentaire_requis_archivage(self) -> DocumentChangerStatut:
        if self.statut == StatutDocument.archive and not self.commentaire:
            raise ValueError("Un commentaire est obligatoire pour archiver un document.")
        return self


# ---------------------------------------------------------------------------
# §4 — Schemas de réponse
# ---------------------------------------------------------------------------

class UploadeurBref(BaseModel):
    """Projection minimale de l'utilisateur ayant créé le document."""

    id: int
    nom: str
    prenom: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    """
    Réponse liste — sans URL présignée MinIO (génération coûteuse).
    L'URL est disponible dans DocumentResponseDetail.
    """

    id: int
    reference: str = Field(
        description="Référence générée : DOC-PROC-LABO-ACHAT-001.",
        examples=["DOC-PROC-LABO-ACHAT-001"],
    )
    titre: str
    type: TypeDocument
    statut: StatutDocument
    version: str
    processus_code: str | None
    tags: list[str] = Field(default_factory=list)
    est_confidentiel: bool
    taille_octets: int | None = Field(
        default=None,
        description="Taille du fichier en octets (renseignée après upload MinIO).",
    )
    mime_type: str | None = Field(
        default=None,
        description="Type MIME détecté à l'upload.",
        examples=["application/pdf"],
    )
    auteur: UploadeurBref | None = None
    date_creation: datetime
    date_modification: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "reference": "DOC-PROC-LABO-ACHAT-001",
                "titre": "Procédure de gestion des achats v1",
                "type_document": "procedure",
                "statut": "valide",
                "version": "1.0",
                "processus_code": "PROC-LABO-ACHAT",
                "tags": ["achat", "dépense"],
                "est_confidentiel": False,
                "taille_octets": 204800,
                "mime_type": "application/pdf",
                "uploadeur": {
                    "id": 1,
                    "nom": "Administrateur",
                    "prenom": "SI-SMQ",
                    "email": "admin@si-smq.local",
                },
                "date_creation": "2025-01-15T09:00:00",
                "date_modification": "2025-01-15T09:00:00",
            }
        },
    )


class DocumentResponseDetail(DocumentResponse):
    """
    Réponse détail — enrichie avec :
      - URL présignée MinIO (durée selon est_confidentiel : 1h ou 24h)
      - Description complète
      - Chemin MinIO interne (visible admin uniquement, filtré au niveau service)
    """

    description: str | None = None

    url_telechargement: str | None = Field(
        default=None,
        description=(
            "URL présignée MinIO pour téléchargement direct. "
            "Durée de validité : 1h si confidentiel, 24h sinon. "
            "Null si le fichier n'est pas encore uploadé."
        ),
        examples=["https://minio.si-smq.local/documents/DOC-PROC-LABO-ACHAT-001.pdf?X-Amz-..."],
    )

    minio_path: str | None = Field(
        default=None,
        description="Chemin interne MinIO — exposé aux admins uniquement (filtré au service).",
        examples=["documents/2025/PROC-LABO-ACHAT/DOC-PROC-LABO-ACHAT-001.pdf"],
    )

    historique_statuts: list[dict] = Field(
        default_factory=list,
        description="Journal des transitions de statut [{statut, date, auteur, commentaire}].",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "reference": "DOC-PROC-LABO-ACHAT-001",
                "titre": "Procédure de gestion des achats v1",
                "type_document": "procedure",
                "statut": "valide",
                "version": "1.0",
                "processus_code": "PROC-LABO-ACHAT",
                "tags": ["achat", "dépense"],
                "est_confidentiel": False,
                "taille_octets": 204800,
                "mime_type": "application/pdf",
                "description": "Décrit le circuit de validation des dépenses du laboratoire.",
                "url_telechargement": "https://minio.si-smq.local/...",
                "minio_path": None,
                "historique_statuts": [
                    {
                        "statut": "brouillon",
                        "date": "2025-01-15T09:00:00",
                        "auteur": "admin@si-smq.local",
                        "commentaire": None,
                    },
                    {
                        "statut": "valide",
                        "date": "2025-01-16T10:30:00",
                        "auteur": "pilote@si-smq.local",
                        "commentaire": "Validé après relecture.",
                    },
                ],
                "uploadeur": {
                    "id": 1,
                    "nom": "Administrateur",
                    "prenom": "SI-SMQ",
                    "email": "admin@si-smq.local",
                },
                "date_creation": "2025-01-15T09:00:00",
                "date_modification": "2025-01-16T10:30:00",
            }
        },
    )


# ---------------------------------------------------------------------------
# §5 — DocumentListResponse
# ---------------------------------------------------------------------------

class DocumentListResponse(BaseModel):
    """Liste paginée de documents avec filtres actifs retournés pour le front."""

    items: list[DocumentResponse]
    total: int = Field(description="Nombre total de documents correspondant aux filtres.")
    page: int = Field(ge=1, default=1)
    taille_page: int = Field(ge=1, le=100, default=20)
    pages_total: int

    # Filtres actifs (retournés pour cohérence UI)
    filtre_statut: StatutDocument | None = None
    filtre_type: TypeDocument | None = None
    filtre_processus_code: str | None = None
    filtre_tag: str | None = None

    model_config = ConfigDict(from_attributes=True)