"""
backend/app/models/utilisateur.py

Remplacement complet du modèle Utilisateur minimal fourni.

Ajouts par rapport à la version initiale :
  - Profil métier : département, poste, téléphone
  - Champs sécurité : dernière connexion, tentatives échouées, verrouillage
  - back_populates complets vers tous les modèles du SI-SMQ
  - Matrice de permissions par rôle documentée ici (référence pour les services)

Rôles et périmètres (alignés sur les espaces applicatifs du frontend) :
  direction        → accès total, supervision stratégique, gestion des utilisateurs,
                     lance l'audit externe une fois un diagnostic validé en interne
  preparateur       → pilote un ou plusieurs processus, saisit diagnostics/risques/actions/KPI
  auditeur_interne  → audits internes : évalue, valide les diagnostics (prêt pour audit externe),
                     lève des actions / non-conformités

Le rôle "auditeur_externe" a été retiré : l'application prépare les processus
à la certification ISO 9001 mais ne réalise plus l'audit de certification
externe lui-même — celui-ci est désormais simplement "lancé" par la Direction
une fois le diagnostic validé en interne (cf. StatutDiagnostic.audit_externe).
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

    Ressource              │direction│preparateur│auditeur_interne
    ───────────────────────┼─────────┼───────────┼────────────────
    Utilisateurs           │   CRUD  │     R     │       R
    Processus              │   CRUD  │     RU    │       R
    DiagnosticISO          │   CRUD  │    CRU    │      CRU
    DiagnosticClause       │   CRUD  │    CRU    │      CRU
    Risque                 │   CRUD  │    CRUD   │       CR
    Action                 │   CRUD  │    CRUD   │       CR
    Indicateur              │   CRUD  │    CRU    │       R
    MesureKPI               │   CRUD  │    CRUD   │       R
    Document                │   CRUD  │    CRUD   │       R
    ClauseISO                │   CRU   │     R     │       R

    Légende : C=Create R=Read U=Update D=Delete
    """
    preparateur      = "preparateur"
    auditeur_interne = "auditeur_interne"
    direction        = "direction"


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
    hashed_password = Column(String(255), nullable=True)  # Null pour les comptes Google OAuth
    google_id = Column(String(100), nullable=True, unique=True, index=True)

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
    role     = Column(SAEnum(RoleEnum), default=RoleEnum.preparateur, nullable=False)
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

    def peut(self, action: str, ressource: str | None = None) -> bool:
        """
        Vérification rapide de permission par rôle.
        Utilisé dans les services pour les gardes d'accès.

        Deux formes :
          - peut(action, ressource) : permission CRUD scopée à une ressource.
            Actions : "create" | "read" | "update" | "delete"
            Ressources : "processus" | "diagnostic" | "risque" | "action" |
                         "indicateur" | "mesure" | "document" | "utilisateur"
          - peut(capacite) : capacité transverse non scopée à une ressource
            (ex: "valider", "administrer") — utilisée pour les transitions
            de workflow (validation diagnostic/document/risque, archivage...).

        Exemple :
          user.peut("update", "diagnostic")  → True si preparateur, auditeur_interne ou direction
          user.peut("delete", "risque")      → True si direction uniquement
          user.peut("valider")               → True si preparateur, auditeur_interne ou direction
        """
        if ressource is None:
            _CAPACITES: dict[str, set[str]] = {
                "valider":    {RoleEnum.preparateur, RoleEnum.auditeur_interne, RoleEnum.direction},
                "administrer": {RoleEnum.direction},
            }
            return self.role in _CAPACITES.get(action, set())

        _PERMISSIONS: dict[str, dict[str, set[str]]] = {
            RoleEnum.direction: {
                "create": {"*"},
                "read":   {"*"},
                "update": {"*"},
                "delete": {"*"},
            },
            RoleEnum.preparateur: {
                "create": {"diagnostic", "risque", "action", "mesure", "document"},
                "read":   {"*"},
                "update": {"processus", "diagnostic", "risque", "action",
                           "indicateur", "mesure", "document"},
                "delete": {"risque", "action", "mesure", "document"},
            },
            RoleEnum.auditeur_interne: {
                "create": {"diagnostic", "action"},
                "read":   {"*"},
                "update": {"diagnostic", "action"},
                "delete": set(),
            },
        }

        role_perms = _PERMISSIONS.get(self.role, {})
        ressources_autorisees = role_perms.get(action, set())
        return "*" in ressources_autorisees or ressource in ressources_autorisees