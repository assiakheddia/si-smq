from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class NiveauConformite(str, enum.Enum):
    non_conforme = "non_conforme"      # 0-25%
    partiel = "partiel"                 # 25-50%
    avance = "avance"                   # 50-75%
    conforme = "conforme"               # 75-100%

class DiagnosticISO(Base):
    __tablename__ = "diagnostics"

    id = Column(Integer, primary_key=True, index=True)
    processus_id = Column(Integer, ForeignKey("processus.id"))
    clause_iso = Column(String)   # ex: "6.1", "7.5", "9.2"
    description_ecart = Column(Text)
    niveau = Column(Enum(NiveauConformite))
    score = Column(Float)          # 0 à 100
    recommandation = Column(Text)
    
    processus = relationship("Processus")