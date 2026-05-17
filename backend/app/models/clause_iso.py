from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ClauseISO(Base):
    """
    Référentiel des clauses ISO 9001:2015.
    Structure hiérarchique auto-référentielle :
      - Niveau 0 : sections principales  (ex: "4", "5", "6" ... "10")
      - Niveau 1 : sous-clauses          (ex: "4.1", "4.2", "6.1")
      - Niveau 2 : sous-sous-clauses     (ex: "6.1.1", "6.1.2", "7.5.1")
    """

    __tablename__ = "clauses_iso"

    id = Column(Integer, primary_key=True, index=True)

    # --- Identifiant métier ------------------------------------------------
    code = Column(String(20), unique=True, nullable=False, index=True)
    # ex: "4", "4.1", "6.1.2" — utilisé partout comme référence humaine

    # --- Libellé -----------------------------------------------------------
    titre = Column(String(255), nullable=False)
    # ex: "Contexte de l'organisme", "Compréhension de l'organisme"

    description = Column(Text, nullable=True)
    # Texte normatif résumé (pas la norme complète, résumé fonctionnel)

    # --- Hiérarchie --------------------------------------------------------
    parent_id = Column(Integer, ForeignKey("clauses_iso.id"), nullable=True)
    # NULL = clause racine (section principale)

    niveau = Column(Integer, nullable=False, default=0)
    # 0 = section (4), 1 = clause (4.1), 2 = sous-clause (4.1.1)

    ordre = Column(Integer, nullable=False, default=0)
    # Ordre d'affichage au sein du même parent

    # --- Flags métier ------------------------------------------------------
    est_applicable = Column(Boolean, default=True, nullable=False)
    # Permet d'exclure des clauses non applicables à l'organisme (ex: clause 8.3
    # si pas de conception produit)

    est_feuille = Column(Boolean, default=False, nullable=False)
    # True = nœud terminal → peut recevoir un DiagnosticISO
    # False = nœud intermédiaire → score agrégé depuis ses enfants

    # --- Relations ---------------------------------------------------------
    parent = relationship(
        "ClauseISO",
        back_populates="enfants",
        remote_side=[id],
        foreign_keys=[parent_id],
    )

    enfants = relationship(
        "ClauseISO",
        back_populates="parent",
        foreign_keys=[parent_id],
        order_by="ClauseISO.ordre",
        cascade="all, delete-orphan",
    )

    diagnostics = relationship(
    "DiagnosticClause",          # <-- On pointe vers le modèle enfant de la clause
    back_populates="clause",
    cascade="all, delete-orphan",
)

    def __repr__(self) -> str:
        return f"<ClauseISO {self.code} — {self.titre}>"