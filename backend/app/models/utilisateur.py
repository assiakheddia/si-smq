from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.core.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    pilote = "pilote"
    contributeur = "contributeur"
    auditeur = "auditeur"

class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.contributeur)
    est_actif = Column(Boolean, default=True)