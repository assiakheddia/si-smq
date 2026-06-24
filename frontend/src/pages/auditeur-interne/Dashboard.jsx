import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const KPI = [
  { label: "Fiches en attente", value: "4", sub: "En attente de révision", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  { label: "Fiches approuvées", value: "7", sub: "Validées internement", color: "#166534", bg: "#dcfce7", icon: "✅" },
  { label: "Corrections demandées", value: "2", sub: "En attente de correction", color: "#991b1b", bg: "#fee2e2", icon: "🔄" },
  { label: "Taux de conformité", value: "73%", sub: "Objectif 85%", color: "#1e40af", bg: "#dbeafe", icon: "📊" },
];

const RECENT_ACTIVITY = [
  { action: "Révision effectuée", process: "Gestion des achats", date: "Aujourd'hui, 10:23", status: "revision", version: "v2" },
  { action: "Corrections demandées", process: "Contrôle qualité labo", date: "Hier, 15:41", status: "correction", version: "v1" },
  { action: "Fiche validée", process: "Gestion PFE", date: "23/06/2026", status: "validated", version: "v3" },
  { action: "Observation ajoutée", process: "Audit interne", date: "22/06/2026", status: "observation", version: "v2" },
  { action: "Révision effectuée", process: "Formation du personnel", date: "21/06/2026", status: "revision", version: "v1" },
];

const ISO_CLAUSES = [
  { group: "4.x Contexte de l'organisme", compliance: 82 },
  { group: "5.x Leadership", compliance: 90 },
  { group: "6.x Planification", compliance: 68 },
  { group: "7.x Support", compliance: 75 },
  { group: "8.x Réalisation des activités", compliance: 60 },
  { group: "9.x Évaluation des performances", compliance: 85 },
  { group: "10.x Amélioration", compliance: 70 },
];

const UPCOMING = [
  { task: "Réviser Fiche — Maintenance préventive", due: "Demain", priority: "haute" },
  { task: "Réunion de revue — Processus achat", due: "25 juin", priority: "moyenne" },
  { task: "Clôturer observations — Gestion des risques", due: "27 juin", priority: "haute" },
  { task: "Rapport mensuel de conformité", due: "30 juin", priority: "normale" },
];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 },
};

function StatusBadge({ status }) {
  const map = {
    revision:    { label: "Révision", bg: "#dbeafe", color: "#1e40af" },
    correction:  { label: "Correction", bg: "#fee2e2", color: "#991b1b" },
    validated:   { label: "Validé", bg: "#dcfce7", color: "#166534" },
    observation: { label: "Observation", bg: "#f3f4f6", color: "#374151" },
  };
  const s = map[status] || map.observation;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const colors = { haute: "#ef4444", moyenne: "#f59e0b", normale: "#10b981" };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[priority] || "#9ca3af", display: "inline-block", marginRight: 6 }} />;
}

export default function AIDashboard() {
  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord" userName="Meziani Karim" userRole="Auditeur Interne" userInitials="MK" />
      <div style={S.inner}>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>
            Bonjour, Meziani Karim 👋
          </h1>
          <p style={{ fontSize: 13.5, color: "#5a7a66" }}>
            Auditeur Interne · Vous avez <strong>4 fiches</strong> en attente de révision.
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft: `4px solid ${k.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b8c75", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{k.sub}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Recent Activity */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Activité récente</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f2f4" }}>
                  {["Action", "Processus", "Version", "Date", "Statut"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ACTIVITY.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 600, color: "#1a2e22" }}>{r.action}</td>
                    <td style={{ padding: "10px 8px", color: "#4b6358" }}>{r.process}</td>
                    <td style={{ padding: "10px 8px" }}><span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{r.version}</span></td>
                    <td style={{ padding: "10px 8px", color: "#9ca3af", fontSize: 12 }}>{r.date}</td>
                    <td style={{ padding: "10px 8px" }}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upcoming Tasks */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Tâches à venir</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {UPCOMING.map((t, i) => (
                <div key={i} style={{ padding: "12px 14px", background: "#f8fffe", borderRadius: 10, border: "1px solid #e8f5e1" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2e22", marginBottom: 4 }}>
                    <PriorityDot priority={t.priority} />{t.task}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Échéance : {t.due}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ISO Clause Compliance */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Conformité par groupe de clauses ISO 9001</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ISO_CLAUSES.map((c) => (
              <div key={c.group}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2e22" }}>{c.group}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.compliance >= 80 ? "#166534" : c.compliance >= 65 ? "#92400e" : "#991b1b" }}>{c.compliance}%</span>
                </div>
                <div style={{ height: 8, background: "#f0f2f4", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${c.compliance}%`, height: "100%", background: c.compliance >= 80 ? "#22c55e" : c.compliance >= 65 ? "#f59e0b" : "#ef4444", borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
