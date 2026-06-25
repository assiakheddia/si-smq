"""
backend/app/models/processus_revision.py

Historique réel des versions d'un Processus — une ligne par création ou
modification, journalisée automatiquement par processus_service.py
(jamais saisie manuellement).
"""

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class StatutRevision(str, enum.Enum):
    approuve = "approuve"   # version courante (la plus récente)
    archive  = "archive"    # versions précédentes


class ProcessusRevision(Base):
    __tablename__ = "processus_revisions"

    id = Column(Integer, primary_key=True, index=True)

    processus_id = Column(
        Integer,
        ForeignKey("processus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    version = Column(String(20), nullable=False)
    # ex: "1.0", "1.1", "2.0" — incrémenté à chaque modification

    auteur_id = Column(
        Integer,
        ForeignKey("utilisateurs.id", ondelete="SET NULL"),
        nullable=True,
    )

    description = Column(Text, nullable=True)
    # Résumé des champs modifiés, ex: "Mise à jour : objectif, ressources_cles"

    statut = Column(
        SAEnum(StatutRevision),
        default=StatutRevision.approuve,
        nullable=False,
    )

    date_revision = Column(DateTime, default=datetime.utcnow, nullable=False)

    # -------------------------------------------------------------------------
    # Relations
    # -------------------------------------------------------------------------
    processus = relationship(
        "Processus",
        back_populates="revisions",
    )

    auteur = relationship(
        "Utilisateur",
        foreign_keys=[auteur_id],
    )

    def __repr__(self) -> str:
        return f"<ProcessusRevision processus={self.processus_id} v{self.version} ({self.statut})>"
