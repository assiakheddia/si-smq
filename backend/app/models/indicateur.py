from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Indicateur(Base):
    __tablename__ = "indicateurs"

    id = Column(Integer, primary_key=True, index=True)
    processus_id = Column(Integer, ForeignKey("processus.id"))
    nom = Column(String, nullable=False)
    valeur_cible = Column(Float)
    valeur_actuelle = Column(Float, default=0.0)
    seuil_alerte = Column(Float)
    unite = Column(String)         # %, jours, nombre...

    processus = relationship("Processus", back_populates="indicateurs")