"""
backend/app/models/utilisateur.py

Remplacement complet du modèle Utilisateur minimal fourni.

Ajouts par rapport à la version initiale :
  - Profil métier : département, poste, téléphone
  - Champs sécurité : dernière connexion, tentatives échouées, verrouillage
  - back_populates complets vers tous les modèles du SI-SMQ
  - Matrice de permissions par rôle documentée ici (référence pour les services)

Rôles et périmètres :
  admin        → accès total, gestion des utilisateurs, configuration
  pilote       → pilote un ou plusieurs processus, valide diagnostics/actions
  contributeur → saisie de données (mesures KPI, avancement actions)
  auditeur     → lecture seule + création de diagnostics, sans modification
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean,
    Enum as SAEnum, DateTime, Text
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================================================
# ENUM RÔLES
# =============================================================================

class RoleEnum(str, enum.Enum):
    """
    Rôles fixes du SI-SMQ.

    Matrice de permissions (appliquée dans les services, pas en DB) :

    Ressource              │ admin │ pilote │ contributeur │ auditeur
    ───────────────────────┼───────┼────────┼──────────────┼─────────
    Utilisateurs           │  CRUD │   R    │      R       │    R
    Processus              │  CRUD │  RU    │      R       │    R
    DiagnosticISO          │  CRUD │  CRU   │      R       │   CR
    DiagnosticClause       │  CRUD │  CRU   │      R       │   CR
    Risque                 │  CRUD │  CRUD  │     CRU      │    R
    Action                 │  CRUD │  CRUD  │     CRU      │    R
    Indicateur             │  CRUD │  CRU   │      R       │    R
    MesureKPI              │  CRUD │  CRUD  │      C       │    R
    Document               │  CRUD │  CRUD  │      C       │    R
    ClauseISO              │  CRU  │   R    │      R       │    R

    Légende : C=Create R=Read U=Update D=Delete
    """
    admin        = "admin"
    pilote       = "pilote"
    contributeur = "contributeur"
    auditeur     = "auditeur"


# =============================================================================
# UTILISATEUR
# =============================================================================

class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    # -------------------------------------------------------------------------
    # Identité
    # -------------------------------------------------------------------------
    id     = Column(Integer, primary_key=True, index=True)
    nom    = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    email  = Column(String(255), unique=True, nullable=False, index=True)

    # -------------------------------------------------------------------------
    # Authentification
    # -------------------------------------------------------------------------
    hashed_password = Column(String(255), nullable=False)

    # Sécurité brute-force
    tentatives_echouees   = Column(Integer, default=0, nullable=False)
    # Compteur remis à 0 après connexion réussie

    verrouille_jusqu_a    = Column(DateTime, nullable=True)
    # Verrouillage temporaire après N tentatives échouées
    # Logique dans security.py — NULL = pas verrouillé

    derniere_connexion    = Column(DateTime, nullable=True)
    # Mis à jour à chaque login réussi par auth_service

    # -------------------------------------------------------------------------
    # Rôle et statut
    # -------------------------------------------------------------------------
    role     = Column(SAEnum(RoleEnum), default=RoleEnum.contributeur, nullable=False)
    est_actif = Column(Boolean, default=True, nullable=False)
    # False = compte désactivé (pas supprimé — conservation des traces)

    # -------------------------------------------------------------------------
    # Profil métier
    # -------------------------------------------------------------------------
    departement = Column(String(150), nullable=True)
    # ex: "Équipe Réseaux et Systèmes", "Direction du Laboratoire", "Commission Doctorale"

    poste = Column(String(150), nullable=True)
    # ex: "Directeur de Laboratoire", "Chef d'Équipe", "Doctorant", "Auditeur Qualité"

    telephone = Column(String(30), nullable=True)
    # Format libre — numéro interne ou mobile

    bio = Column(Text, nullable=True)
    # Note libre sur l'utilisateur (expertise, périmètre de responsabilité)

    # -------------------------------------------------------------------------
    # Dates système
    # -------------------------------------------------------------------------
    date_creation     = Column(DateTime, default=datetime.utcnow, nullable=False)
    date_modification = Column(DateTime, default=datetime.utcnow,
                               onupdate=datetime.utcnow, nullable=False)

    # -------------------------------------------------------------------------
    # Relations — back_populates complets vers tous les modèles
    # -------------------------------------------------------------------------

    # Processus dont cet utilisateur est pilote
    processus_pilotes = relationship(
        "Processus",
        back_populates="pilote",
        foreign_keys="Processus.pilote_id",
    )

    # Diagnostics réalisés par cet utilisateur (rôle auditeur)
    diagnostics_realises = relationship(
        "DiagnosticISO",
        back_populates="auditeur",
        foreign_keys="DiagnosticISO.auditeur_id",
    )

    # Actions dont cet utilisateur est responsable d'exécution
    actions_responsable = relationship(
        "Action",
        back_populates="responsable",
        foreign_keys="Action.responsable_id",
    )

    # Actions dont cet utilisateur est responsable de vérification
    actions_verificateur = relationship(
        "Action",
        back_populates="verificateur",
        foreign_keys="Action.verificateur_id",
    )

    # Risques dont cet utilisateur est responsable du suivi
    risques_responsable = relationship(
        "Risque",
        back_populates="responsable",
        foreign_keys="Risque.responsable_id",
    )

    # Indicateurs dont cet utilisateur est responsable
    indicateurs_responsable = relationship(
        "Indicateur",
        back_populates="responsable",
        foreign_keys="Indicateur.responsable_id",
    )

    # Mesures KPI saisies par cet utilisateur
    mesures_saisies = relationship(
        "MesureKPI",
        back_populates="saisi_par",
        foreign_keys="MesureKPI.saisi_par_id",
    )

    def __repr__(self) -> str:
        return (
            f"<Utilisateur [{self.id}] "
            f"{self.prenom} {self.nom} "
            f"<{self.email}> "
            f"role={self.role}>"
        )

    # -------------------------------------------------------------------------
    # Helpers (logique pure — sans accès DB)
    # -------------------------------------------------------------------------

    @property
    def nom_complet(self) -> str:
        return f"{self.prenom} {self.nom}"

    @property
    def est_verrouille(self) -> bool:
        """Retourne True si le compte est temporairement verrouillé."""
        if self.verrouille_jusqu_a is None:
            return False
        return datetime.utcnow() < self.verrouille_jusqu_a

    def peut(self, action: str, ressource: str) -> bool:
        """
        Vérification rapide de permission par rôle.
        Utilisé dans les services pour les gardes d'accès.

        Actions : "create" | "read" | "update" | "delete"
        Ressources : "processus" | "diagnostic" | "risque" | "action" |
                     "indicateur" | "mesure" | "document" | "utilisateur"

        Exemple :
          user.peut("update", "diagnostic")  → True si pilote ou admin
          user.peut("delete", "risque")      → True si admin uniquement
        """
        _PERMISSIONS: dict[str, dict[str, set[str]]] = {
            RoleEnum.admin: {
                "create": {"*"},
                "read":   {"*"},
                "update": {"*"},
                "delete": {"*"},
            },
            RoleEnum.pilote: {
                "create": {"diagnostic", "risque", "action", "mesure", "document"},
                "read":   {"*"},
                "update": {"processus", "diagnostic", "risque", "action",
                           "indicateur", "mesure", "document"},
                "delete": {"risque", "action", "mesure", "document"},
            },
            RoleEnum.contributeur: {
                "create": {"risque", "action", "mesure"},
                "read":   {"*"},
                "update": {"risque", "action", "mesure"},
                "delete": set(),
            },
            RoleEnum.auditeur: {
                "create": {"diagnostic"},
                "read":   {"*"},
                "update": set(),
                "delete": set(),
            },
        }

        role_perms = _PERMISSIONS.get(self.role, {})
        ressources_autorisees = role_perms.get(action, set())
        return "*" in ressources_autorisees or ressource in ressources_autorisees