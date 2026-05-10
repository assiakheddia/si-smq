from typing import List
from app.core.iso_engine import ISOEngine
from app.models.processus import Processus


class AnalyticsEngine:

    # score global organisation
    @staticmethod
    def compute_global_iso_score(processus_list: List[Processus]):

        return ISOEngine.calculate_global_score(processus_list)

    # liste processus non conformes
    @staticmethod
    def get_non_conform_processus(processus_list: List[Processus]):

        return ISOEngine.detect_non_conformes(processus_list)

    # calcul maturité de chaque processus
    @staticmethod
    def compute_processus_scores(processus_list: List[Processus]):

        results = []

        for p in processus_list:

            score = ISOEngine.calculate_maturity_score(p)

            results.append({
                "processus_id": p.id,
                "nom": p.nom,
                "score_maturite": score
            })

        return results