import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const KPI = [
  { label: "Audits assignés",          value: "5",  color: "#1e40af", bg: "#dbeafe", icon: "📋" },
  { label: "Audits complétés",         value: "2",  color: "#166534", bg: "#dcfce7", icon: "✅" },
  { label: "Non-conformités détectées",value: "8",  color: "#991b1b", bg: "#fee2e2", icon: "⚠️" },
  { label: "Recommandations émises",   value: "12", color: "#5b21b6", bg: "#ede9fe", icon: "💡" },
];

const SCHEDULE = [
  { process: "Gestion des achats",         date: "25/06/2026", status: "en-cours",  progress: 60 },
  { process: "Formation du personnel",     date: "28/06/2026", status: "planifie",  progress: 0  },
  { process: "Contrôle qualité labo",      date: "30/06/2026", status: "planifie",  progress: 0  },
  { process: "Gestion des non-conformités",date: "10/06/2026", status: "termine",   progress: 100},
  { process: "Audit interne",              date: "05/06/2026", status: "termine",   progress: 100},
];

const FINDINGS = [
  { id: 1, process: "Gestion des achats", type: "majeure", clause: "8.4", desc: "Absence de critères d'évaluation fournisseurs documentés.", date: "23/06/2026" },
  { id: 2, process: "Gestion des achats", type: "mineure", clause: "7.5", desc: "Références documentaires non à jour dans la fiche processus.", date: "23/06/2026" },
  { id: 3, process: "Gestion des NC",     type: "observation", clause: "10.2", desc: "Délais de clôture des NC non systématiquement respectés.", date: "10/06/2026" },
  { id: 4, process: "Audit interne",      type: "recommandation", clause: "9.2", desc: "Recommandation d'élargir le programme d'audit à tous les processus.", date: "05/06/2026" },
  { id: 5, process: "Audit interne",      type: "mineure", clause: "5.2", desc: "Politique qualité non affichée dans tous les locaux.", date: "05/06/2026" },
];

const COMPLIANCE = [
  { process: "Gestion des achats",         score: 62 },
  { process: "Formation du personnel",     score: 0, pending: true },
  { process: "Contrôle qualité labo",      score: 0, pending: true },
  { process: "Gestion des non-conformités",score: 81 },
  { process: "Audit interne",              score: 88 },
];

const FINDING_STYLE = {
  majeure:       { label: "Majeure",         bg: "#fee2e2", color: "#991b1b" },
  mineure:       { label: "Mineure",         bg: "#fef3c7", color: "#92400e" },
  observation:   { label: "Observation",     bg: "#f3f4f6", color: "#374151" },
  recommandation:{ label: "Recommandation",  bg: "#ede9fe", color: "#5b21b6" },
};

const STATUS_STYLE = {
  "en-cours": { label: "En cours",   bg: "#dbeafe", color: "#1e40af" },
  "planifie": { label: "Planifié",   bg: "#fef3c7", color: "#92400e" },
  "termine":  { label: "Terminé",    bg: "#dcfce7", color: "#166534" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 },
};

export default function AEDashboard() {
  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord" userName="Benmoussa Sarah" userRole="Auditeur Externe" userInitials="BS" />
      <div style={S.inner}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Bonjour, Benmoussa Sarah 👋</h1>
          <p style={{ fontSize: 13.5, color: "#5a7a66" }}>Auditeur Externe · <strong>3 audits</strong> en attente de démarrage.</p>
        </div>

        {/* KPIs */}
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
          {/* Audit schedule */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Programme d'audit</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f2f4" }}>
                  {["Processus", "Date prévue", "Statut", "Avancement"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map((r, i) => {
                  const ss = STATUS_STYLE[r.status];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 600, color: "#1a2e22" }}>{r.process}</td>
                      <td style={{ padding: "10px 8px", fontSize: 12, color: "#6b8c75" }}>{r.date}</td>
                      <td style={{ padding: "10px 8px" }}><span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{ss.label}</span></td>
                      <td style={{ padding: "10px 8px" }}>
                        {r.status === "planifie" ? <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span> : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: "#f0f2f4", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${r.progress}%`, height: "100%", background: r.progress === 100 ? "#22c55e" : "#3b82f6", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#4b6358", minWidth: 28 }}>{r.progress}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compliance by process */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Conformité par processus</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {COMPLIANCE.map((c) => (
                <div key={c.process}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2e22" }}>{c.process}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.pending ? "#9ca3af" : c.score >= 80 ? "#166534" : c.score >= 60 ? "#92400e" : "#991b1b" }}>
                      {c.pending ? "En attente" : `${c.score}%`}
                    </span>
                  </div>
                  <div style={{ height: 7, background: "#f0f2f4", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${c.score}%`, height: "100%", background: c.pending ? "#e5e7eb" : c.score >= 80 ? "#22c55e" : c.score >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent findings */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Derniers constats</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FINDINGS.map((f) => {
              const fs = FINDING_STYLE[f.type];
              return (
                <div key={f.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", background: "#fafafa", borderRadius: 10, border: "1px solid #f0f2f4" }}>
                  <span style={{ background: fs.bg, color: fs.color, borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{fs.label}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2e22" }}>{f.process}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>Clause {f.clause}</span>
                    <div style={{ fontSize: 12, color: "#4b6358", marginTop: 3 }}>{f.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{f.date}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
