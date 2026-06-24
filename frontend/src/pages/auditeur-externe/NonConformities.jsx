import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const TYPE_STYLE = {
  majeur:      { label: "NC Majeure",  bg: "#fee2e2", color: "#991b1b" },
  mineur:      { label: "NC Mineure",  bg: "#fef3c7", color: "#92400e" },
  observation: { label: "Observation", bg: "#f3f4f6", color: "#374151" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
};

export default function NonConformities() {
  const user = getCurrentUser();
  const [findings, setFindings] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterProcess, setFilterProcess] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/diagnostics/").catch(() => []).then(async (diags) => {
      const all = Array.isArray(diags) ? diags : [];
      const withEcarts = all.filter((d) => (d.nb_ecarts_majeurs || 0) > 0 || d.statut === "valide" || d.statut === "soumis");
      const targets = withEcarts.length > 0 ? withEcarts : all;
      const details = await Promise.all(
        targets.map((d) => api.get(`/diagnostics/${d.id}`).catch(() => null))
      );
      const procSet = new Set();
      const allFindings = [];
      details.forEach((detail) => {
        if (!detail) return;
        procSet.add(detail.processus?.nom || "—");
        (detail.clauses_evaluees || []).forEach((c) => {
          if (c.type_ecart === "majeur" || c.type_ecart === "mineur") {
            allFindings.push({
              id: `${detail.id}_${c.id}`,
              diagId: detail.id,
              process: detail.processus?.nom || "—",
              type: c.type_ecart,
              clause: c.clause?.code || "—",
              desc: c.description_ecart || c.recommandation_finale || "Aucune description fournie.",
              evidence: c.preuves_existantes || "—",
              date: detail.date_diagnostic ? new Date(detail.date_diagnostic).toLocaleDateString("fr-FR") : "—",
              statut: detail.statut,
            });
          }
        });
      });
      setFindings(allFindings);
      setProcesses(Array.from(procSet));
    }).finally(() => setLoading(false));
  }, []);

  const filtered = findings.filter((f) =>
    (filterType === "all" || f.type === filterType) && (filterProcess === "all" || f.process === filterProcess)
  );

  const counts = {
    majeur: findings.filter((f) => f.type === "majeur").length,
    mineur: findings.filter((f) => f.type === "mineur").length,
  };

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Non-conformités" userName={user?.nom_complet} userRole="Auditeur Externe" />
        <div style={S.inner}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Topbar title="Non-conformités" userName={user?.nom_complet} userRole="Auditeur Externe" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Gestion des non-conformités</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Écarts majeurs et mineurs détectés lors des audits externes.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 24 }}>
          {[["NC Majeures", counts.majeur, "#991b1b"], ["NC Mineures", counts.mineur, "#92400e"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${c}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="all">Tous les types</option>
            <option value="majeur">NC Majeure</option>
            <option value="mineur">NC Mineure</option>
          </select>
          <select value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="all">Tous les processus</option>
            {processes.map((p) => <option key={p}>{p}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} constat(s)</span>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f2f4", background: "#fafafa" }}>
                {["Type", "Processus", "Clause", "Description", "Preuves", "Date", "Statut diagnostic"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const ts = TYPE_STYLE[f.type] || {};
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "13px 16px" }}><span style={{ background: ts.bg, color: ts.color, borderRadius: 6, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{ts.label}</span></td>
                    <td style={{ padding: "13px 16px", fontWeight: 600, color: "#1a2e22" }}>{f.process}</td>
                    <td style={{ padding: "13px 16px" }}><span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{f.clause}</span></td>
                    <td style={{ padding: "13px 16px", color: "#4b6358", maxWidth: 220 }}><span title={f.desc}>{f.desc.length > 70 ? f.desc.slice(0, 70) + "…" : f.desc}</span></td>
                    <td style={{ padding: "13px 16px", color: "#6b7280", maxWidth: 180 }}><span title={f.evidence}>{f.evidence.length > 50 ? f.evidence.slice(0, 50) + "…" : f.evidence}</span></td>
                    <td style={{ padding: "13px 16px", color: "#9ca3af", fontSize: 12 }}>{f.date}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#6b8c75" }}>{f.statut}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af" }}>Aucun constat trouvé.</div>}
        </div>
      </div>
    </div>
  );
}
