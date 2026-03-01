from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class TypeProcessus(str, enum.Enum):
    strategique = "strategique"
    operationnel = "operationnel"
    support = "support"

class StatutProcessus(str, enum.Enum):
    non_demarre = "non_demarre"
    en_cours = "en_cours"
    conforme = "conforme"
    non_conforme = "non_conforme"

class Processus(Base):
    __tablename__ = "processus"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    objectif = Column(Text)
    type = Column(Enum(TypeProcessus))
    statut = Column(Enum(StatutProcessus), default=StatutProcessus.non_demarre)
    pilote_id = Column(Integer, ForeignKey("utilisateurs.id"))
    score_maturite = Column(Float, default=0.0)  # 0 à 100
    
    pilote = relationship("Utilisateur")
    indicateurs = relationship("Indicateur", back_populates="processus")
    risques = relationship("Risque", back_populates="processus")