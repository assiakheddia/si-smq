"""
backend/app/models/processus.py

Modèle central du SI-SMQ.
Couvre les deux BPMN fournis :
  - Gestion Labo (finances, intégration membre, achat, bilan KPI)
  - Encadrement doctoral (inscription, avancement, soutenance)

Choix structurels :
  - Auto-référentiel (parent_id) pour les sous-processus
  - PartieInteressee dans une table séparée (Ministère, ATRST, jury...)
  - Cycle de révision explicite (annuel, semestriel...) extrait des BPMN
  - Entrées/Sorties en Text (liste libre) — assez pour ce sprint
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Text, Float,
    ForeignKey, Enum as SAEnum, Boolean, Table, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# =============================================================================
# ENUMS
# =============================================================================

class TypeProcessus(str, enum.Enum):
    strategique  = "strategique"   # Orientation, politique, direction
    operationnel = "operationnel"  # Réalisation directe de la mission
    support      = "support"       # Ressources, finances, RH, SI


class StatutProcessus(str, enum.Enum):
    non_demarre  = "non_demarre"
    en_cours     = "en_cours"
    conforme     = "conforme"
    non_conforme = "non_conforme"
    suspendu     = "suspendu"      # Processus temporairement inactif


class FrequenceCycle(str, enum.Enum):
    """
    Extraite des BPMN :
      - BPMN Gestion Labo    → cycle annuel explicite (budget, bilan KPI)
      - BPMN Encadrement     → cycle semestriel (rapports d'avancement)
    """
    mensuel     = "mensuel"
    trimestriel = "trimestriel"
    semestriel  = "semestriel"    # Encadrement doctoral
    annuel      = "annuel"        # Gestion labo / finances
    ponctuel    = "ponctuel"      # Déclenché par événement, pas de cycle fixe
    continu     = "continu"       # Processus permanent


class TypePartieInteressee(str, enum.Enum):
    """
    Parties identifiées dans les deux BPMN.
    """
    interne      = "interne"      # Équipe, chef d'équipe, directeur labo
    externe      = "externe"      # Ministère, ATRST
    tutelle      = "tutelle"      # Organisme de tutelle (MESRS...)
    client       = "client"       # Bénéficiaire direct du processus
    fournisseur  = "fournisseur"  # Prestataire externe, service achats
    regulateur   = "regulateur"   # Organisme de certification, auditeur


# =============================================================================
# TABLE D'ASSOCIATION  Processus ↔ PartieInteressee  (Many-to-Many)
# =============================================================================

processus_parties = Table(
    "processus_parties_interessees",
    Base.metadata,
    Column(
        "processus_id",
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "partie_id",
        Integer,
        ForeignKey("parties_interessees.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# =============================================================================
# PARTIE INTÉRESSÉE
# =============================================================================

class PartieInteressee(Base):
    """
    Acteur interne ou externe impliqué dans un ou plusieurs processus.

    Exemples tirés des BPMN :
      - Ministère (externe, régulateur) → notifié lors de changements majeurs
      - ATRST      (externe, tutelle)   → reçoit le bilan annuel
      - Direction  (interne)            → valide les achats, signe les bilans
      - Doctorant  (interne, client)    → bénéficiaire de l'encadrement
      - Jury       (externe)            → évalue la soutenance
    """

    __tablename__ = "parties_interessees"

    id   = Column(Integer, primary_key=True, index=True)
    nom  = Column(String(200), nullable=False)
    type = Column(SAEnum(TypePartieInteressee), nullable=False)

    description   = Column(Text, nullable=True)
    email_contact = Column(String(255), nullable=True)
    est_actif     = Column(Boolean, default=True, nullable=False)

    # Exigences et attentes (§ 4.2 ISO 9001)
    exigences = Column(Text, nullable=True)
    # Format libre : liste des attentes de cette partie vis-à-vis de l'organisme

    # Relation inverse
    processus = relationship(
        "Processus",
        secondary=processus_parties,
        back_populates="parties_interessees",
    )

    def __repr__(self) -> str:
        return f"<PartieInteressee {self.nom} ({self.type})>"


# =============================================================================
# PROCESSUS
# =============================================================================

class Processus(Base):
    """
    Unité de base de la cartographie qualité.

    Auto-référentielle pour les sous-processus :
      Processus parent  →  "Gestion du Laboratoire"
        └── Sous-processus  →  "Gestion des Achats"
        └── Sous-processus  →  "Intégration des Membres"
        └── Sous-processus  →  "Bilan KPI Annuel"

    Champs issus de l'analyse des deux BPMN :
      - pilote_id         : responsable du processus (chef d'équipe, directeur)
      - frequence_cycle   : annuel (labo), semestriel (doctoral)
      - entrees / sorties : données d'entrée et de sortie du processus BPMN
      - declencheur       : événement qui lance le processus
      - ressources_cles   : équipements, budget, personnel requis
    """

    __tablename__ = "processus"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id   = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=True, index=True)
    # ex: "PROC-001", "PROC-LABO-ACHAT", "PROC-DOC-AVANCEMENT"

    nom      = Column(String(255), nullable=False)
    objectif = Column(Text, nullable=True)
    # Finalité du processus — "Assurer le suivi budgétaire annuel du labo"

    description = Column(Text, nullable=True)

    # -------------------------------------------------------------------------
    # Classification ISO / Qualité
    # -------------------------------------------------------------------------
    type   = Column(SAEnum(TypeProcessus), nullable=True)
    statut = Column(
        SAEnum(StatutProcessus),
        default=StatutProcessus.non_demarre,
        nullable=False,
    )

    score_maturite = Column(Float, default=0.0, nullable=False)
    # 0.0 → 100.0 — calculé par iso_engine.py à partir des diagnostics

    # -------------------------------------------------------------------------
    # Hiérarchie (auto-référentielle)
    # -------------------------------------------------------------------------
    parent_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="SET NULL"),
        nullable=True,
    )
    # NULL = processus racine

    ordre = Column(Integer, default=0, nullable=False)
    # Ordre d'affichage dans la cartographie

    # -------------------------------------------------------------------------
    # Responsabilité
    # -------------------------------------------------------------------------
    pilote_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )
    # FK vers Utilisateur (pilote du processus — rôle "pilote")

    # -------------------------------------------------------------------------
    # Données BPMN — flux du processus
    # -------------------------------------------------------------------------
    entrees = Column(Text, nullable=True)
    # Données/documents d'entrée du processus
    # Ex BPMN Labo : "Notification budget annuel du Ministère, dossier intégration"
    # Ex BPMN Doctoral : "Dossier inscription doctorant, PV commission"

    sorties = Column(Text, nullable=True)
    # Ex BPMN Labo : "Liste membres à jour, bilan KPI, situation financière"
    # Ex BPMN Doctoral : "Rapport avancement, PV soutenance, attestation"

    declencheur = Column(String(255), nullable=True)
    # Événement déclencheur du processus
    # Ex : "Notification budgétaire annuelle du Ministère"
    # Ex : "Inscription du doctorant validée"

    ressources_cles = Column(Text, nullable=True)
    # Ressources nécessaires (RH, matériel, budget)
    # Ex : "Budget alloué, Service des Marchés, Directeur"

    # -------------------------------------------------------------------------
    # Cycle de révision (extrait des BPMN)
    # -------------------------------------------------------------------------
    frequence_cycle = Column(
        SAEnum(FrequenceCycle),
        default=FrequenceCycle.annuel,
        nullable=True,
    )
    # BPMN Labo    → annuel  (cycle annuel labo explicitement bouclé)
    # BPMN Doctoral → semestriel (rapports d'avancement tous les 6 mois)

    # -------------------------------------------------------------------------
    # Matrice RACI (§5.3 ISO 9001 — responsabilités)
    # -------------------------------------------------------------------------
    raci_roles = Column(JSON, nullable=True)
    # Liste de rôles, ex: ["Pilote", "Qualité", "Direction"]

    raci_activities = Column(JSON, nullable=True)
    # Liste d'activités, ex: ["Planification", "Mise en œuvre", "Contrôle", "Revue"]

    raci_cells = Column(JSON, nullable=True)
    # Dict "{activite_index}-{role_index}" -> "R"|"A"|"C"|"I"

    # -------------------------------------------------------------------------
    # Flags
    # -------------------------------------------------------------------------
    est_actif = Column(Boolean, default=True, nullable=False)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    parent = relationship(
        "Processus",
        back_populates="sous_processus",
        remote_side=[id],
        foreign_keys=[parent_id],
    )

    sous_processus = relationship(
        "Processus",
        back_populates="parent",
        foreign_keys=[parent_id],
        order_by="Processus.ordre",
        cascade="all, delete-orphan",
    )

    pilote = relationship(
        "Utilisateur",
        foreign_keys=[pilote_id],
        back_populates="processus_pilotes",
    )

    parties_interessees = relationship(
        "PartieInteressee",
        secondary=processus_parties,
        back_populates="processus",
    )

    # Câblé maintenant, implémenté dans les prochains modèles
    diagnostics = relationship(
        "DiagnosticISO",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    indicateurs = relationship(
        "Indicateur",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    risques = relationship(
        "Risque",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    actions = relationship(
        "Action",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    documents = relationship(
        "Document",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    diagnostics_smq = relationship(
        "DiagnosticSMQ",
        back_populates="processus",
        cascade="all, delete-orphan",
    )

    dysfonctionnements = relationship(
        "Dysfonctionnement",
        back_populates="processus",
        cascade="all, delete-orphan",
        order_by="Dysfonctionnement.ordre",
    )

    revisions = relationship(
        "ProcessusRevision",
        back_populates="processus",
        cascade="all, delete-orphan",
        order_by="ProcessusRevision.date_revision.desc()",
    )

    def __repr__(self) -> str:
        return f"<Processus [{self.code}] {self.nom} — {self.statut}>"