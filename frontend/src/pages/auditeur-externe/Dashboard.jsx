import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const FINDING_STYLE = {
  majeur:       { label: "Majeure",         bg: "#fee2e2", color: "#991b1b" },
  mineur:       { label: "Mineure",         bg: "#fef3c7", color: "#92400e" },
  observation:  { label: "Observation",     bg: "#f3f4f6", color: "#374151" },
};

const STATUT_STYLE = {
  brouillon: { label: "Brouillon", bg: "#fef3c7", color: "#92400e" },
  soumis:    { label: "Soumis",    bg: "#dbeafe", color: "#1e40af" },
  valide:    { label: "Validé",    bg: "#dcfce7", color: "#166534" },
  archive:   { label: "Archivé",   bg: "#f3f4f6", color: "#374151" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 },
};

function progressForStatut(statut) {
  if (statut === "valide" || statut === "archive") return 100;
  if (statut === "soumis") return 60;
  return 10;
}

export default function AEDashboard() {
  const user = getCurrentUser();
  const [diags, setDiags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/diagnostics/").catch(() => []),
    ]).then(([diagsRes]) => {
      const all = Array.isArray(diagsRes) ? diagsRes : [];
      const mine = all.filter((d) => d.auditeur?.id === user?.id);
      setDiags(mine.length > 0 ? mine : all);
    }).finally(() => setLoading(false));
  }, []);

  const assigned = diags.length;
  const completed = diags.filter((d) => d.statut === "valide" || d.statut === "archive").length;
  const ncTotal = diags.reduce((sum, d) => sum + (d.nb_ecarts_majeurs || 0), 0);
  const pending = diags.filter((d) => d.statut === "brouillon" || d.statut === "soumis").length;

  const KPI = [
    { label: "Audits assignés",           value: String(assigned),  color: "#1e40af", bg: "#dbeafe", icon: "📋" },
    { label: "Audits complétés",          value: String(completed), color: "#166534", bg: "#dcfce7", icon: "✅" },
    { label: "Écarts majeurs détectés",   value: String(ncTotal),   color: "#991b1b", bg: "#fee2e2", icon: "⚠️" },
    { label: "Diagnostics en attente",    value: String(pending),   color: "#5b21b6", bg: "#ede9fe", icon: "💡" },
  ];

  const schedule = diags.slice(0, 6).map((d) => ({
    process: d.processus?.nom || "—",
    date: d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString("fr-FR") : "—",
    statut: d.statut,
    progress: progressForStatut(d.statut),
  }));

  const compliance = diags.slice(0, 6).map((d) => ({
    process: d.processus?.nom || "—",
    score: Math.round(d.score_global || 0),
  }));

  const findings = diags
    .filter((d) => (d.nb_ecarts_majeurs || 0) > 0)
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      process: d.processus?.nom || "—",
      type: "majeur",
      desc: `${d.nb_ecarts_majeurs} écart(s) majeur(s) détecté(s) sur ce diagnostic.`,
      date: d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString("fr-FR") : "—",
    }));

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Tableau de bord" userName={user?.nom_complet} userRole="Auditeur Externe" />
        <div style={S.inner}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord" userName={user?.nom_complet} userRole="Auditeur Externe" />
      <div style={S.inner}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Bonjour, {user?.nom_complet || "Auditeur"} 👋</h1>
          <p style={{ fontSize: 13.5, color: "#5a7a66" }}>Auditeur Externe · <strong>{pending} audit{pending !== 1 ? "s" : ""}</strong> en attente de finalisation.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft: `4px solid ${k.color}`, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b8c75", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={S.card}>
            <div style={S.sectionTitle}>Programme d'audit</div>
            {schedule.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Aucun audit pour le moment.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f2f4" }}>
                    {["Processus", "Date", "Statut", "Avancement"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r, i) => {
                    const ss = STATUT_STYLE[r.statut] || STATUT_STYLE.brouillon;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                        <td style={{ padding: "10px 8px", fontWeight: 600, color: "#1a2e22" }}>{r.process}</td>
                        <td style={{ padding: "10px 8px", fontSize: 12, color: "#6b8c75" }}>{r.date}</td>
                        <td style={{ padding: "10px 8px" }}><span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{ss.label}</span></td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: "#f0f2f4", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${r.progress}%`, height: "100%", background: r.progress === 100 ? "#22c55e" : "#3b82f6", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#4b6358", minWidth: 28 }}>{r.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Conformité par processus</div>
            {compliance.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Aucune donnée disponible.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {compliance.map((c, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2e22" }}>{c.process}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.score >= 80 ? "#166534" : c.score >= 60 ? "#92400e" : "#991b1b" }}>
                        {c.score}%
                      </span>
                    </div>
                    <div style={{ height: 7, background: "#f0f2f4", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${c.score}%`, height: "100%", background: c.score >= 80 ? "#22c55e" : c.score >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>Derniers constats</div>
          {findings.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Aucun constat majeur récent.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {findings.map((f) => {
                const fs = FINDING_STYLE[f.type];
                return (
                  <div key={f.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", background: "#fafafa", borderRadius: 10, border: "1px solid #f0f2f4" }}>
                    <span style={{ background: fs.bg, color: fs.color, borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{fs.label}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2e22" }}>{f.process}</span>
                      <div style={{ fontSize: 12, color: "#4b6358", marginTop: 3 }}>{f.desc}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{f.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
