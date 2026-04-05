"""
backend/app/models/document.py

Gestion Électronique des Documents (GED) — §7.5 ISO 9001:2015.

Modèle minimaliste : métadonnées + chemin MinIO.
Pas de versioning en DB — MinIO gère le stockage objet.

Liens possibles (tous optionnels sauf processus_id) :
  - processus_id        → document de processus (procédure, mode opératoire)
  - clause_iso_id       → preuve de conformité à une clause ISO
  - action_id           → preuve d'exécution d'une action corrective

Un document peut être lié à 1, 2 ou 3 entités simultanément.
Exemple : procédure d'achat (Processus PROC-LABO-ACHAT)
          qui prouve la conformité à la clause 8.4
          et résulte de l'action corrective ACT-2025-001.

Structure MinIO :
  Bucket : si-smq-documents
  Clé    : {type_document}/{processus_code}/{annee}/{uuid_fichier}.{ext}
  ex: procedures/PROC-LABO-ACHAT/2025/a1b2c3d4.pdf
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Float,
    ForeignKey, Enum as SAEnum, Boolean, DateTime
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================================================
# ENUMS
# =============================================================================

class TypeDocument(str, enum.Enum):
    """
    Catégories documentaires ISO 9001:2015 — §7.5.1.
    Couvre les deux BPMN (labo + doctoral).
    """
    procedure           = "procedure"           # Mode opératoire d'un processus
    enregistrement      = "enregistrement"      # Preuve d'une activité réalisée
    politique           = "politique"           # Politique qualité §5.2
    plan                = "plan"                # Plan qualité, plan d'audit
    rapport             = "rapport"             # Rapport d'audit, bilan annuel
    formulaire          = "formulaire"          # Formulaire de saisie standardisé
    manuel              = "manuel"              # Manuel qualité (si applicable)
    charte              = "charte"              # Charte, règlement intérieur
    preuve_action       = "preuve_action"       # Preuve d'exécution d'action corrective
    preuve_conformite   = "preuve_conformite"   # Preuve de conformité clause ISO
    autre               = "autre"               # Autre type non catégorisé


class StatutDocument(str, enum.Enum):
    """
    Cycle de vie documentaire — §7.5.2 et §7.5.3.
    """
    brouillon   = "brouillon"   # En cours de rédaction
    en_revue    = "en_revue"    # Soumis pour relecture/approbation
    approuve    = "approuve"    # Approuvé et applicable
    obsolete    = "obsolete"    # Remplacé ou retiré — conservé pour traçabilité
    archive     = "archive"     # Archivé définitivement


class FormatFichier(str, enum.Enum):
    """Formats acceptés dans la GED."""
    pdf     = "pdf"
    docx    = "docx"
    xlsx    = "xlsx"
    pptx    = "pptx"
    png     = "png"
    jpg     = "jpg"
    txt     = "txt"
    csv     = "csv"
    autre   = "autre"


# =============================================================================
# DOCUMENT
# =============================================================================

class Document(Base):
    """
    Document qualité du SMQ.

    Stockage fichier : MinIO (compatible S3).
    La DB ne stocke que les métadonnées + le chemin MinIO.

    Approbation §7.5.2 :
      approuve_par_id → utilisateur ayant approuvé le document
      date_approbation → date d'approbation
      Ces champs sont NULL tant que statut != "approuve"

    Contrôle d'accès §7.5.3 :
      est_confidentiel → si True, visible uniquement par admin et pilote
      Appliqué dans document_service.py, pas en DB.
    """

    __tablename__ = "documents"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id        = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "DOC-PROC-LABO-ACHAT-001", "DOC-POL-QUALITE-2025"
    # Généré par document_service — format : DOC-{type_court}-{processus_code}-{seq}

    titre       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    type   = Column(SAEnum(TypeDocument), nullable=False, default=TypeDocument.enregistrement)
    statut = Column(SAEnum(StatutDocument), nullable=False, default=StatutDocument.brouillon)
    format = Column(SAEnum(FormatFichier), nullable=True)

    # -------------------------------------------------------------------------
    # Stockage MinIO
    # -------------------------------------------------------------------------
    chemin_minio = Column(String(500), nullable=True)
    # Clé objet dans le bucket MinIO
    # ex: "procedures/PROC-LABO-ACHAT/2025/a1b2c3d4.pdf"
    # NULL = document enregistré sans fichier (métadonnées seules)

    nom_fichier_original = Column(String(255), nullable=True)
    # Nom du fichier tel qu'uploadé par l'utilisateur
    # ex: "Procedure_Achat_v2.pdf"

    taille_octets = Column(Float, nullable=True)
    # Taille en octets — utile pour affichage et quotas

    # -------------------------------------------------------------------------
    # Version (simple — sans table dédiée)
    # -------------------------------------------------------------------------
    version = Column(String(20), nullable=False, default="1.0")
    # Format libre : "1.0", "2.1", "v3" — géré manuellement

    # -------------------------------------------------------------------------
    # Liens entités (tous optionnels)
    # -------------------------------------------------------------------------
    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Document rattaché à un processus (procédure, mode opératoire...)
    # SET NULL : si processus supprimé, document conservé

    clause_iso_id = Column(
        Integer,
        ForeignKey("clauses_iso.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Preuve de conformité à une clause ISO spécifique
    # ex: procédure de maîtrise documentaire → clause 7.5.3

    action_id = Column(
        Integer,
        ForeignKey("actions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Preuve d'exécution d'une action corrective
    # ex: rapport de formation → action "Former les pilotes à l'audit interne"

    # -------------------------------------------------------------------------
    # Responsabilité
    # -------------------------------------------------------------------------
    auteur_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Rédacteur du document

    approuve_par_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Approbateur — §7.5.2 : "revue et approbation pour pertinence et adéquation"
    # NULL tant que statut != "approuve"

    # -------------------------------------------------------------------------
    # Dates
    # -------------------------------------------------------------------------
    date_creation    = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    date_approbation = Column(DateTime, nullable=True)
    # Renseignée quand statut → "approuve"

    date_expiration  = Column(DateTime, nullable=True)
    # Date de révision obligatoire — pour les documents à durée limitée
    # ex: politique qualité à revoir annuellement

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_confidentiel = Column(Boolean, default=False, nullable=False)
    # §7.5.3 : maîtrise de la distribution et de l'accès
    # True → visible uniquement par admin et pilote (appliqué dans le service)

    est_obligatoire_iso = Column(Boolean, default=False, nullable=False)
    # True → document requis explicitement par la norme ISO 9001:2015
    # ex: politique qualité (§5.2), objectifs qualité (§6.2), résultats d'audit (§9.2)
    # Utilisé par le tableau de bord pour signaler les documents manquants

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="documents",
        foreign_keys=[processus_id],
    )

    clause_iso = relationship(
        "ClauseISO",
        foreign_keys=[clause_iso_id],
    )

    action = relationship(
        "Action",
        foreign_keys=[action_id],
    )

    auteur = relationship(
        "Utilisateur",
        foreign_keys=[auteur_id],
    )

    approuve_par = relationship(
        "Utilisateur",
        foreign_keys=[approuve_par_id],
    )

    def __repr__(self) -> str:
        return (
            f"<Document [{self.reference}] "
            f"'{self.titre}' "
            f"v{self.version} "
            f"statut={self.statut}>"
        )