"""
services/rapport_service.py — Génération de rapports PDF du SMQ.

Construit un PDF (reportlab) à partir des blocs sélectionnés dans le
report builder du frontend, sur un périmètre de processus choisi par
l'utilisateur : tous les processus actifs, ou une sélection explicite.

Sources de données par processus :
  - DiagnosticISO / DiagnosticClause → score, niveau, écarts, audit
  - Indicateur / MesureKPI           → KPIs
  - Risque                          → registre des risques
  - Action                          → actions correctives
  - Document                        → liste des documents/rapports

Le PDF généré est retourné en mémoire (bytes) pour téléchargement
immédiat. Il est également persisté en tant que Document (métadonnées
+ fichier MinIO si disponible) pour apparaître dans la liste des
rapports — l'upload MinIO est best-effort : son échec ne doit jamais
empêcher l'utilisateur de récupérer son PDF.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle,
)
from sqlalchemy.orm import Session

from app.core.iso_engine import score_to_niveau
from app.models.action import Action
from app.models.diagnostic import DiagnosticClause, DiagnosticISO
from app.models.document import Document, StatutDocument, TypeDocument
from app.models.indicateur import Indicateur
from app.models.processus import Processus
from app.models.risque import Risque
from app.models.utilisateur import Utilisateur
from app.schemas.rapport import RapportGenerationRequest
from app.services.document_service import (
    _construire_chemin_minio,
    _generer_reference,
    _get_minio,
    settings,
)
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thème visuel (aligné sur le frontend : vert SMQ)
# ---------------------------------------------------------------------------

_VERT_FONCE = colors.HexColor("#1e3d2f")
_VERT       = colors.HexColor("#2D604F")
_VERT_CLAIR = colors.HexColor("#eaf5eb")
_BORDURE    = colors.HexColor("#d4e9d7")
_GRIS       = colors.HexColor("#6b7280")
_ROUGE      = colors.HexColor("#e53935")
_ORANGE     = colors.HexColor("#f59e0b")
_VERT_OK    = colors.HexColor("#22c55e")

_NIVEAU_LABEL = {
    "non_conforme": "Non conforme",
    "partiellement_conforme": "Partiellement conforme",
    "conforme": "Conforme",
    "excellent": "Excellent",
}
_NIVEAU_COLOR = {
    "non_conforme": _ROUGE,
    "partiellement_conforme": _ORANGE,
    "conforme": _VERT_OK,
    "excellent": _VERT,
}


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "titre": ParagraphStyle(
            "titre", parent=base["Title"], textColor=_VERT_FONCE,
            fontSize=22, spaceAfter=4,
        ),
        "sous_titre": ParagraphStyle(
            "sous_titre", parent=base["Normal"], textColor=_GRIS, fontSize=11,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], textColor=_VERT_FONCE,
            fontSize=14, spaceBefore=18, spaceAfter=8,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], textColor=_VERT,
            fontSize=11.5, spaceBefore=10, spaceAfter=4,
        ),
        "normal": base["Normal"],
        "muted": ParagraphStyle(
            "muted", parent=base["Normal"], textColor=_GRIS, fontSize=9,
        ),
    }


def _esc(value) -> str:
    if value is None:
        return "—"
    return escape(str(value))


# ---------------------------------------------------------------------------
# §1 — Résolution du périmètre de processus
# ---------------------------------------------------------------------------

def _resoudre_processus(db: Session, payload: RapportGenerationRequest) -> list[Processus]:
    q = db.query(Processus).filter(Processus.est_actif == True)  # noqa: E712

    if payload.portee == "tous":
        return q.order_by(Processus.ordre).all()

    codes = [c.strip().upper() for c in (payload.processus_codes or [])]
    processus = q.filter(Processus.code.in_(codes)).order_by(Processus.ordre).all()
    manquants = set(codes) - {p.code for p in processus}
    if manquants:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processus introuvable(s) : {sorted(manquants)}.",
        )
    return processus


# ---------------------------------------------------------------------------
# §2 — Collecte des données par processus
# ---------------------------------------------------------------------------

def _collecter_donnees_processus(db: Session, processus: Processus) -> dict:
    diagnostic = (
        db.query(DiagnosticISO)
        .filter(DiagnosticISO.processus_id == processus.id)
        .order_by(DiagnosticISO.date_diagnostic.desc())
        .first()
    )

    clauses_evaluees: list[DiagnosticClause] = []
    if diagnostic:
        clauses_evaluees = (
            db.query(DiagnosticClause)
            .filter(DiagnosticClause.diagnostic_id == diagnostic.id)
            .all()
        )

    indicateurs = (
        db.query(Indicateur)
        .filter(Indicateur.processus_id == processus.id, Indicateur.est_actif == True)  # noqa: E712
        .all()
    )
    risques = (
        db.query(Risque)
        .filter(Risque.processus_id == processus.id, Risque.est_actif == True)  # noqa: E712
        .all()
    )
    actions = (
        db.query(Action)
        .filter(Action.processus_id == processus.id, Action.est_active == True)  # noqa: E712
        .all()
    )
    documents = (
        db.query(Document)
        .filter(Document.processus_id == processus.id)
        .order_by(Document.date_modification.desc())
        .limit(20)
        .all()
    )

    return {
        "processus": processus,
        "diagnostic": diagnostic,
        "clauses_evaluees": clauses_evaluees,
        "clauses_ecart": [c for c in clauses_evaluees if c.type_ecart],
        "indicateurs": indicateurs,
        "risques": risques,
        "actions": actions,
        "documents": documents,
    }


# ---------------------------------------------------------------------------
# §3 — Construction du PDF
# ---------------------------------------------------------------------------

def _bloc_entete(nom: str, utilisateur: Utilisateur, donnees: list[dict], st: dict) -> list:
    portee_txt = (
        f"{len(donnees)} processus" if len(donnees) != 1 else "1 processus"
    )
    return [
        Paragraph(_esc(nom), st["titre"]),
        Paragraph("Rapport du Système de Management de la Qualité — ISO 9001:2015", st["sous_titre"]),
        Spacer(1, 8),
        HRFlowable(width="100%", color=_BORDURE, thickness=1),
        Spacer(1, 10),
        Paragraph(
            f"Généré le {datetime.now(tz=timezone.utc).strftime('%d/%m/%Y à %H:%M')} UTC "
            f"par {_esc(f'{utilisateur.prenom} {utilisateur.nom}')} — Périmètre : {portee_txt}",
            st["muted"],
        ),
        Spacer(1, 16),
    ]


def _bloc_resume_executif(donnees: list[dict], st: dict) -> list:
    scores = [d["processus"].score_maturite for d in donnees if d["processus"].score_maturite is not None]
    score_moyen = round(sum(scores) / len(scores), 1) if scores else 0.0
    nb_diag_valides = sum(1 for d in donnees if d["diagnostic"] is not None)
    nb_risques_actifs = sum(len(d["risques"]) for d in donnees)
    nb_actions_ouvertes = sum(
        1 for d in donnees for a in d["actions"] if a.statut.value not in ("close", "annulee")
    )
    nb_documents = sum(len(d["documents"]) for d in donnees)

    data = [
        ["Processus couverts", str(len(donnees))],
        ["Score de maturité moyen", f"{score_moyen} / 100"],
        ["Processus diagnostiqués", str(nb_diag_valides)],
        ["Risques actifs", str(nb_risques_actifs)],
        ["Actions correctives ouvertes", str(nb_actions_ouvertes)],
        ["Documents associés", str(nb_documents)],
    ]
    table = Table(data, colWidths=[8 * cm, 6 * cm])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), _GRIS),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, _BORDURE),
    ]))
    return [Paragraph("Résumé exécutif", st["h2"]), table, Spacer(1, 6)]


def _bloc_kpis(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Indicateurs clés (KPIs)", st["h2"])]
    header = ["Processus", "Score maturité", "Statut"]
    rows = [header]
    for d in donnees:
        p = d["processus"]
        rows.append([_esc(f"{p.code} — {p.nom}"), f"{p.score_maturite:.0f}/100", _esc(p.statut.value)])
    table = Table(rows, colWidths=[9 * cm, 3.5 * cm, 3.5 * cm], repeatRows=1)
    table.setStyle(_table_style_entete())
    flow.append(table)

    for d in donnees:
        if not d["indicateurs"]:
            continue
        flow.append(Paragraph(f"KPI — {_esc(d['processus'].nom)}", st["h3"]))
        krows = [["Indicateur", "Valeur", "Cible", "Statut"]]
        for ind in d["indicateurs"]:
            krows.append([
                _esc(ind.nom),
                f"{ind.valeur_actuelle:.1f}",
                f"{ind.valeur_cible:.1f}" if ind.valeur_cible is not None else "—",
                _esc(_latest_alerte(ind)),
            ])
        ktable = Table(krows, colWidths=[7 * cm, 3 * cm, 3 * cm, 3 * cm], repeatRows=1)
        ktable.setStyle(_table_style_entete())
        flow.append(ktable)
    flow.append(Spacer(1, 6))
    return flow


def _latest_alerte(indicateur: Indicateur) -> str:
    mesures = sorted(indicateur.mesures, key=lambda m: m.date_mesure, reverse=True)
    return mesures[0].statut_alerte.value if mesures else "—"


def _bloc_charts(donnees: list[dict], st: dict) -> list:
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.shapes import Drawing

    flow: list = [Paragraph("Graphiques et visualisations", st["h2"])]
    subset = donnees[:15]
    if not subset:
        flow.append(Paragraph("Aucun processus à représenter.", st["muted"]))
        return flow

    drawing = Drawing(16 * cm, 8 * cm)
    chart = VerticalBarChart()
    chart.x = 40
    chart.y = 40
    chart.height = 6.5 * cm
    chart.width = 14 * cm
    chart.data = [[d["processus"].score_maturite or 0 for d in subset]]
    chart.categoryAxis.categoryNames = [d["processus"].code or f"P{i}" for i, d in enumerate(subset)]
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.dy = -12
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.bars[0].fillColor = _VERT
    drawing.add(chart)
    flow.append(Paragraph("Score de maturité par processus (/100)", st["h3"]))
    flow.append(drawing)
    flow.append(Spacer(1, 6))
    return flow


def _bloc_reports_list(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Liste des documents et rapports", st["h2"])]
    rows = [["Référence", "Titre", "Type", "Statut", "Modifié le"]]
    for d in donnees:
        for doc in d["documents"]:
            rows.append([
                _esc(doc.reference), _esc(doc.titre), _esc(doc.type.value),
                _esc(doc.statut.value), doc.date_modification.strftime("%d/%m/%Y"),
            ])
    if len(rows) == 1:
        flow.append(Paragraph("Aucun document associé à ce périmètre.", st["muted"]))
        return flow
    table = Table(rows, colWidths=[3.5 * cm, 6 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm], repeatRows=1)
    table.setStyle(_table_style_entete())
    flow.append(table)
    flow.append(Spacer(1, 6))
    return flow


def _bloc_audit_details(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Détails d'audit", st["h2"])]
    for d in donnees:
        diag = d["diagnostic"]
        flow.append(Paragraph(_esc(d["processus"].nom), st["h3"]))
        if not diag:
            flow.append(Paragraph("Aucun diagnostic réalisé.", st["muted"]))
            continue
        flow.append(Paragraph(
            f"Diagnostic {_esc(diag.reference)} — score global "
            f"{diag.score_global:.0f}/100 — {_esc(diag.statut.value)}",
            st["normal"],
        ))
        rows = [["Clause", "Score", "Niveau", "Écart"]]
        for c in d["clauses_evaluees"]:
            rows.append([
                _esc(c.clause.code if c.clause else "—"),
                f"{c.score:.0f}",
                _esc(c.niveau.value if c.niveau else "—"),
                _esc(c.type_ecart.value if c.type_ecart else "—"),
            ])
        table = Table(rows, colWidths=[3 * cm, 2.5 * cm, 4.5 * cm, 4 * cm], repeatRows=1)
        table.setStyle(_table_style_entete())
        flow.append(table)
        flow.append(Spacer(1, 6))
    return flow


def _bloc_non_conformites(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Non-conformités", st["h2"])]
    rows = [["Processus", "Clause", "Écart", "Description", "Recommandation"]]
    for d in donnees:
        for c in d["clauses_ecart"]:
            rows.append([
                _esc(d["processus"].code),
                _esc(c.clause.code if c.clause else "—"),
                _esc(c.type_ecart.value if c.type_ecart else "—"),
                _esc(c.description_ecart),
                _esc(c.recommandation_manuelle or c.recommandation_auto),
            ])
    if len(rows) == 1:
        flow.append(Paragraph("Aucune non-conformité détectée sur ce périmètre.", st["muted"]))
        return flow
    table = Table(rows, colWidths=[2.5 * cm, 2 * cm, 2 * cm, 5 * cm, 5 * cm], repeatRows=1)
    table.setStyle(_table_style_entete())
    flow.append(table)
    flow.append(Spacer(1, 6))
    return flow


def _bloc_actions(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Actions correctives", st["h2"])]
    rows = [["Référence", "Processus", "Titre", "Statut", "Priorité", "Avancement"]]
    for d in donnees:
        for a in d["actions"]:
            rows.append([
                _esc(a.reference), _esc(d["processus"].code), _esc(a.titre),
                _esc(a.statut.value), _esc(a.priorite.value), f"{a.avancement}%",
            ])
    if len(rows) == 1:
        flow.append(Paragraph("Aucune action corrective sur ce périmètre.", st["muted"]))
        return flow
    table = Table(rows, colWidths=[2.7 * cm, 2.3 * cm, 5 * cm, 2.3 * cm, 2.2 * cm, 2.2 * cm], repeatRows=1)
    table.setStyle(_table_style_entete())
    flow.append(table)
    flow.append(Spacer(1, 6))
    return flow


def _bloc_iso_compliance(donnees: list[dict], st: dict) -> list:
    flow: list = [Paragraph("Conformité ISO 9001:2015", st["h2"])]
    rows = [["Processus", "Score global", "Niveau"]]
    for d in donnees:
        diag = d["diagnostic"]
        score = diag.score_global if diag else d["processus"].score_maturite
        niveau = diag.niveau_global.value if diag and diag.niveau_global else score_to_niveau(score or 0).value
        rows.append([_esc(d["processus"].nom), f"{(score or 0):.0f}/100", _esc(_NIVEAU_LABEL.get(niveau, niveau))])
    table = Table(rows, colWidths=[8 * cm, 3.5 * cm, 4.5 * cm], repeatRows=1)
    style = _table_style_entete()
    for i, d in enumerate(donnees, start=1):
        diag = d["diagnostic"]
        score = diag.score_global if diag else d["processus"].score_maturite
        niveau = diag.niveau_global.value if diag and diag.niveau_global else score_to_niveau(score or 0).value
        couleur = _NIVEAU_COLOR.get(niveau, _GRIS)
        style.add("TEXTCOLOR", (2, i), (2, i), couleur)
        style.add("FONTNAME", (2, i), (2, i), "Helvetica-Bold")
    table.setStyle(style)
    flow.append(table)
    flow.append(Spacer(1, 6))
    return flow


def _table_style_entete() -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _VERT_CLAIR),
        ("TEXTCOLOR", (0, 0), (-1, 0), _VERT_FONCE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, _BORDURE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ])


_BLOC_BUILDERS = {
    "summary": _bloc_resume_executif,
    "kpis": _bloc_kpis,
    "charts": _bloc_charts,
    "reports_list": _bloc_reports_list,
    "audit_details": _bloc_audit_details,
    "non_conformities": _bloc_non_conformites,
    "actions": _bloc_actions,
    "iso_compliance": _bloc_iso_compliance,
}


def _footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(_GRIS)
    canvas.drawString(2 * cm, 1.2 * cm, "SI-SMQ — Document généré automatiquement")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _construire_pdf(
    nom: str,
    elements: list[str],
    donnees: list[dict],
    utilisateur: Utilisateur,
) -> bytes:
    st = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
        title=nom,
    )

    flow: list = []
    if "header" in elements:
        flow += _bloc_entete(nom, utilisateur, donnees, st)

    if not donnees:
        flow.append(Paragraph("Aucun processus ne correspond au périmètre sélectionné.", st["muted"]))

    for element_id in [e for e in elements if e in _BLOC_BUILDERS]:
        flow += _BLOC_BUILDERS[element_id](donnees, st)
        if element_id != elements[-1]:
            flow.append(Spacer(1, 4))

    on_page = _footer if "footer" in elements else lambda canvas, doc: None
    doc.build(flow, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# §4 — Persistance (métadonnées + upload MinIO best-effort)
# ---------------------------------------------------------------------------

def _persister_document(
    db: Session,
    payload: RapportGenerationRequest,
    pdf_bytes: bytes,
    auteur: Utilisateur,
) -> Document:
    reference = _generer_reference(db, "GENERAL")
    document = Document(
        reference=reference,
        titre=payload.nom,
        type=TypeDocument.rapport,
        description=(
            f"Rapport généré automatiquement — éléments : {', '.join(payload.elements)} "
            f"— périmètre : {payload.portee}"
            + (f" ({', '.join(payload.processus_codes)})" if payload.processus_codes else "")
        ),
        statut=StatutDocument.brouillon,
        auteur_id=auteur.id,
        taille_octets=len(pdf_bytes),
    )
    db.add(document)
    db.flush()

    minio_path = _construire_chemin_minio(reference, None, f"{reference}.pdf")
    try:
        client = _get_minio()
        client.put_object(
            bucket_name=settings.MINIO_BUCKET_DOCUMENTS,
            object_name=minio_path,
            data=BytesIO(pdf_bytes),
            length=len(pdf_bytes),
            content_type="application/pdf",
        )
        document.chemin_minio = minio_path
    except Exception as exc:  # noqa: BLE001 — MinIO indisponible : ne bloque pas la génération
        logger.warning("Upload MinIO du rapport %s impossible : %s", reference, exc)

    db.commit()
    db.refresh(document)
    return document


# ---------------------------------------------------------------------------
# §5 — Point d'entrée
# ---------------------------------------------------------------------------

def generer_rapport(
    db: Session,
    payload: RapportGenerationRequest,
    auteur: Utilisateur,
) -> tuple[bytes, Document]:
    """
    Génère le PDF du rapport et le persiste comme Document.

    Raises:
        HTTPException 404 — processus de la sélection introuvable(s).
    """
    processus = _resoudre_processus(db, payload)
    donnees = [_collecter_donnees_processus(db, p) for p in processus]
    pdf_bytes = _construire_pdf(payload.nom, payload.elements, donnees, auteur)
    document = _persister_document(db, payload, pdf_bytes, auteur)

    logger.info(
        "Rapport '%s' généré (%d processus, %d octets) par %s",
        payload.nom, len(processus), len(pdf_bytes), auteur.email,
    )
    return pdf_bytes, document
