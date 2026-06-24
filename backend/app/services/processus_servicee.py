# app/services/processus_service.py
from sqlalchemy.orm import Session
from app.models.processus import Processus

def extraire_fiche_processus_contexte(db: Session, processus_id: int) -> dict:
    proc = db.query(Processus).filter(Processus.id == processus_id).first()
    if not proc:
        return {}

    # Extraction des données en respectant scrupuleusement tes 6 sections
    return {
        "section_1_general": {
            "designation": proc.nom,
            "pilote": proc.pilote.nom if proc.pilote else "Non assigné",
            "objectif": proc.objectif,
            "structures_concernees": proc.structures,
            "type": proc.type_processus  # Management, Réalisation, Soutien
        },
        "section_2_elements_cles": {
            "delai_global": proc.delai_global,
            "cout_estime": proc.cout_estime,
            "entrees": [{"elements": e.nom, "provenance": e.provenance_processus} for e in proc.entrees],
            "sorties": [{"livrables": s.nom, "destination": s.destination_processus} for s in proc.sorties],
            "clients": proc.clients,
            "effectifs_impliques": proc.effectifs,
            "competences_cles": proc.competences,
            "kpis": [{"nom": k.nom, "cible": k.cible, "frequence": k.frequence} for k in proc.indicateurs if k.actif]
        },
        "section_3_contexte": {
            "processus_voisins": proc.voisins,
            "enjeux": proc.enjeux,
            "moyens_alloues": proc.moyens,
            "contraintes": proc.contraintes,
            "risques": [{"libelle": r.libelle, "criticite": r.criticite} for r in proc.risques]
        },
        "section_4_informations_documentees": {
            # On ne prend que les documents validés officiellement
            "documents": [{
                "titre": d.titre, 
                "format": d.format_support, 
                "approuve": d.statut == "valide",
                "est_enregistrement": d.est_enregistrement
            } for d in proc.documents if d.statut == "valide"]
        },
        "section_5_dysfonctionnements": {
            "historique": [{
                "description": d.description, 
                "consequences": d.consequences, 
                "causes": d.causes, 
                "ameliorations": d.ameliorations
            } for d in proc.dysfonctionnements]
        },
        "section_6_modelisation": {
            "taches_chronologiques": [t.nom for t in sorted(proc.taches, key=lambda x: x.ordre)]
        }
    }