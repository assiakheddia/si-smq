from app.core.iso_engine import ISOEngine
from app.models.processus import Processus


def test_processus_sans_pilote():

    p = Processus(
        nom="Processus Test",
        pilote_id=None
    )

    result = ISOEngine.validate_processus(p)

    assert result.is_valid == False
    assert "ISO §5.3" in result.errors[0]