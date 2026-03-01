from sqlalchemy import Column, Integer, String, Text, Float
from sqlalchemy import Enum as SAEnum
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
    type = Column(SAEnum(TypeProcessus), nullable=True)
    statut = Column(SAEnum(StatutProcessus), default=StatutProcessus.non_demarre)
    pilote_id = Column(Integer, nullable=True)
    score_maturite = Column(Float, default=0.0)