from app.core.database import SessionLocal
from app.models.processus import Processus, TypeProcessus, StatutProcessus

processus_lmcs_lcsi = [
    # STRATÉGIQUES
    {"nom": "Pilotage et gouvernance du laboratoire", "code": "PS-01", "type": TypeProcessus.strategique, "objectif": "Assurer la direction stratégique et opérationnelle du laboratoire"},
    {"nom": "Planification stratégique de la recherche", "code": "PS-02", "type": TypeProcessus.strategique, "objectif": "Définir les axes et priorités de recherche à moyen et long terme"},
    {"nom": "Revue de direction", "code": "PS-03", "type": TypeProcessus.strategique, "objectif": "Évaluer périodiquement l'efficacité du SMQ et décider des actions d'amélioration"},
    {"nom": "Gestion des partenariats et conventions", "code": "PS-04", "type": TypeProcessus.strategique, "objectif": "Établir et maintenir des partenariats académiques et industriels"},
    {"nom": "Communication et valorisation externe", "code": "PS-05", "type": TypeProcessus.strategique, "objectif": "Promouvoir les activités et résultats du laboratoire"},

    # OPÉRATIONNELS
    {"nom": "Gestion des projets de recherche", "code": "PO-01", "type": TypeProcessus.operationnel, "objectif": "Planifier, exécuter et clôturer les projets de recherche"},
    {"nom": "Encadrement des doctorants", "code": "PO-02", "type": TypeProcessus.operationnel, "objectif": "Assurer le suivi et l'encadrement des thèses de doctorat"},
    {"nom": "Encadrement des masters (PFE)", "code": "PO-03", "type": TypeProcessus.operationnel, "objectif": "Encadrer les projets de fin d'études des étudiants master"},
    {"nom": "Gestion des équipes de recherche", "code": "PO-04", "type": TypeProcessus.operationnel, "objectif": "Organiser et coordonner les équipes et membres du laboratoire"},
    {"nom": "Publication et valorisation scientifique", "code": "PO-05", "type": TypeProcessus.operationnel, "objectif": "Gérer le processus de soumission et publication des travaux scientifiques"},
    {"nom": "Organisation des séminaires et journées scientifiques", "code": "PO-06", "type": TypeProcessus.operationnel, "objectif": "Planifier et organiser les événements scientifiques du laboratoire"},
    {"nom": "Gestion des moyennes et résultats académiques", "code": "PO-07", "type": TypeProcessus.operationnel, "objectif": "Assurer le suivi et la traçabilité des résultats académiques"},

    # SUPPORT
    {"nom": "Gestion documentaire qualité", "code": "PSU-01", "type": TypeProcessus.support, "objectif": "Maîtriser la création, validation, diffusion et archivage des documents qualité"},
    {"nom": "Gestion des ressources humaines", "code": "PSU-02", "type": TypeProcessus.support, "objectif": "Gérer le recrutement, la formation et l'évaluation du personnel"},
    {"nom": "Gestion budgétaire et financière", "code": "PSU-03", "type": TypeProcessus.support, "objectif": "Planifier et contrôler les ressources financières du laboratoire"},
    {"nom": "Gestion des équipements et infrastructure", "code": "PSU-04", "type": TypeProcessus.support, "objectif": "Assurer la disponibilité et la maintenance des équipements"},
    {"nom": "Gestion des ressources externes", "code": "PSU-05", "type": TypeProcessus.support, "objectif": "Gérer les relations avec les fournisseurs et prestataires externes"},
    {"nom": "Système d'information et outils numériques", "code": "PSU-06", "type": TypeProcessus.support, "objectif": "Maintenir et faire évoluer les outils informatiques du laboratoire"},
]

def seed():
    db = SessionLocal()
    try:
        # Vérifier si déjà seedé
        existing = db.query(Processus).first()
        if existing:
            print("Base déjà initialisée — seed ignoré")
            return

        for data in processus_lmcs_lcsi:
            p = Processus(
                nom=data["nom"],
                objectif=data["objectif"],
                type=data["type"],
                statut=StatutProcessus.non_demarre,
                score_maturite=0.0
            )
            db.add(p)

        db.commit()
        print(f"✅ {len(processus_lmcs_lcsi)} processus insérés avec succès")

    except Exception as e:
        db.rollback()
        print(f"❌ Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()