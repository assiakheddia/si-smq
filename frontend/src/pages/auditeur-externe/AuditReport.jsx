import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const VERDICT_OPTS = [
  { value: "recommande",          label: "Recommandé",               color: "#166534", bg: "#dcfce7" },
  { value: "recommande-reserves", label: "Recommandé avec réserves", color: "#92400e", bg: "#fef3c7" },
  { value: "non-recommande",      label: "Non recommandé",           color: "#991b1b", bg: "#fee2e2" },
];

const CLAUSE_STATUS_STYLE = {
  conforme:    { bg: "#dcfce7", color: "#166534", label: "Conforme" },
  observation: { bg: "#f3f4f6", color: "#374151", label: "Observation" },
  mineur:      { bg: "#fef3c7", color: "#92400e", label: "Écart mineur" },
  majeur:      { bg: "#fee2e2", color: "#991b1b", label: "Écart majeur" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1100 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "24px 28px", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 800, color: "#1a2e22", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #f0f2f4" },
};

export default function AuditReport() {
  const user = getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [diagnostics, setDiagnostics] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("diagId") || "");
  const [report, setReport] = useState(null);
  const [conclusion, setConclusion] = useState("");
  const [verdict, setVerdict] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/diagnostics/").catch(() => []).then((diags) => {
      const all = Array.isArray(diags) ? diags : [];
      const mine = all.filter((d) => d.auditeur?.id === user?.id);
      const list = mine.length > 0 ? mine : all;
      setDiagnostics(list);
      if (!selectedId && list.length > 0) setSelectedId(String(list[0].id));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setError(null);
    api.get(`/diagnostics/${selectedId}/rapport`)
      .then(setReport)
      .catch((err) => { setError(err.message); setReport(null); });
  }, [selectedId]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setSearchParams(id ? { diagId: id } : {});
    setReport(null);
    setVerdict("");
    setConclusion("");
    setSubmitted(false);
  };

  const handleSubmit = () => { setSubmitted(true); };

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Rapport d'audit" userName={user?.nom_complet} userRole="Auditeur Externe" />
        <div style={S.inner}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Topbar title="Rapport d'audit" userName={user?.nom_complet} userRole="Auditeur Externe" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Rapport d'audit externe</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Consultez le rapport de maturité et soumettez votre verdict à la Direction.</p>
          </div>
          <select value={selectedId} onChange={(e) => handleSelect(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e8f0eb", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit", background: "#fff" }}>
            <option value="">Sélectionner un diagnostic...</option>
            {diagnostics.map((d) => (
              <option key={d.id} value={d.id}>{d.processus?.nom || "—"} — {d.reference || d.id}</option>
            ))}
          </select>
        </div>

        {!selectedId && (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22" }}>Sélectionnez un diagnostic pour voir son rapport</div>
          </div>
        )}

        {selectedId && error && (
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px", color: "#991b1b" }}>{error}</div>
        )}

        {selectedId && !error && !report && (
          <div style={S.card}>Chargement du rapport…</div>
        )}

        {report && (
          <>
            {submitted && (
              <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#166534" }}>Rapport soumis à la Direction</div>
                <div style={{ fontSize: 13, color: "#4b6358", marginTop: 4 }}>La Direction a été notifiée et peut consulter votre rapport.</div>
              </div>
            )}

            <div style={S.card}>
              <div style={S.sectionTitle}>1. Informations générales</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
                {[
                  ["Processus audité", report.processus_nom],
                  ["Auditeur", report.auditeur_nom_complet || "—"],
                  ["Date d'audit", report.date_diagnostic ? new Date(report.date_diagnostic).toLocaleDateString("fr-FR") : "—"],
                  ["Référence", report.reference || "—"],
                  ["Période couverte", report.periode_couverte || "—"],
                  ["Référentiel", "ISO 9001:2015"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#f8fffe", borderRadius: 8, padding: "12px 14px", border: "1px solid #e8f5e1" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2e22" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>2. Synthèse par section ISO</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(report.synthese_par_section || []).map((s) => (
                  <span key={s.code_section} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                    {s.code_section} — {s.titre_section} ({Math.round(s.score_section)}%)
                  </span>
                ))}
                {(!report.synthese_par_section || report.synthese_par_section.length === 0) && (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>Aucune section évaluée.</span>
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>3. Clauses prioritaires</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(report.clauses_prioritaires || []).map((f) => {
                  const fs = CLAUSE_STATUS_STYLE[f.type_ecart] || CLAUSE_STATUS_STYLE.observation;
                  return (
                    <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "#fafafa", borderRadius: 10, border: "1px solid #f0f2f4" }}>
                      <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{f.clause?.code}</span>
                      <span style={{ background: fs.bg, color: fs.color, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{fs.label}</span>
                      <span style={{ fontSize: 13, color: "#4b6358", flex: 1 }}>{f.description_ecart || f.recommandation_finale || "—"}</span>
                    </div>
                  );
                })}
                {(!report.clauses_prioritaires || report.clauses_prioritaires.length === 0) && (
                  <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>Aucune clause prioritaire identifiée.</div>
                )}
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22" }}>Score global : <strong style={{ color: report.score_global >= 80 ? "#166534" : report.score_global >= 60 ? "#92400e" : "#991b1b" }}>{Math.round(report.score_global)}%</strong></span>
                <span style={{ fontSize: 12, color: "#4b6358" }}>{report.nb_conformes}/{report.nb_clauses_total} clauses conformes</span>
                <span style={{ fontSize: 12, color: "#4b6358" }}>Niveau global : {report.niveau_global}</span>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>4. Synthèse des écarts</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  ["Écarts majeurs", report.nb_ecarts_majeurs, "#991b1b", "#fee2e2"],
                  ["Écarts mineurs", report.nb_ecarts_mineurs, "#92400e", "#fef3c7"],
                  ["Observations", report.nb_observations, "#374151", "#f3f4f6"],
                ].map(([l, v, c, bg]) => (
                  <div key={l} style={{ background: bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c, marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
              {report.avertissements_iso && report.avertissements_iso.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {report.avertissements_iso.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px" }}>⚠️ {a}</div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>5. Conclusion générale</div>
              <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={5}
                placeholder="Rédigez votre conclusion d'audit. Résumez les points forts, les axes d'amélioration et votre appréciation globale..."
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #e8f0eb", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={S.card}>
              <div style={S.sectionTitle}>6. Verdict final</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {VERDICT_OPTS.map((opt) => (
                  <button key={opt.value} onClick={() => setVerdict(opt.value)}
                    style={{ padding: "12px 24px", borderRadius: 10, border: `2px solid ${verdict === opt.value ? opt.color : "#e5e7eb"}`, background: verdict === opt.value ? opt.bg : "#fff", color: verdict === opt.value ? opt.color : "#6b7280", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleSubmit} disabled={!verdict || !conclusion.trim() || submitted}
                style={{ background: (!verdict || !conclusion.trim() || submitted) ? "#9ca3af" : "#2D604F", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: (!verdict || !conclusion.trim() || submitted) ? "not-allowed" : "pointer" }}>
                📤 Soumettre à la Direction
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
