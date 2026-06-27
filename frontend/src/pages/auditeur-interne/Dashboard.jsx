import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const SECTION_LABELS = {
  "4": "Contexte de l'organisme",
  "5": "Leadership",
  "6": "Planification",
  "7": "Support",
  "8": "Réalisation des activités",
  "9": "Évaluation des performances",
  "10": "Amélioration",
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 },
};

function StatusBadge({ status }) {
  const map = {
    soumis:    { label: "Soumis", bg: "#fef3c7", color: "#92400e" },
    valide:    { label: "Validé", bg: "#dcfce7", color: "#166534" },
    brouillon: { label: "Brouillon", bg: "#f3f4f6", color: "#374151" },
    archive:   { label: "Archivé", bg: "#dbeafe", color: "#1e40af" },
  };
  const s = map[status] || map.brouillon;
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
  const user = getCurrentUser();
  const initials = (user?.nom_complet || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  const [diagnostics, setDiagnostics] = useState([]);
  const [actions, setActions] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  const refetchActions = () => {
    api.get("/actions/").then((acts) => setActions(Array.isArray(acts) ? acts : [])).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      api.get("/diagnostics/").catch(() => []),
      api.get("/actions/").catch(() => []),
    ])
      .then(([diags, acts]) => {
        const diagList = Array.isArray(diags) ? diags : [];
        setDiagnostics(diagList);
        setActions(Array.isArray(acts) ? acts : []);
        const validIds = diagList.filter((d) => d.statut === "valide" || d.statut === "soumis").slice(0, 10).map((d) => d.id);
        Promise.all(validIds.map((id) => api.get(`/diagnostics/${id}`).catch(() => null)))
          .then((details) => setSections(details.filter(Boolean).flatMap((d) => d.synthese_par_section || [])));
      })
      .finally(() => setLoading(false));
  }, []);

  const traiterVerification = async (actionId, nouveau_statut) => {
    setVerifyingId(actionId);
    try {
      await api.post(`/actions/${actionId}/statut`, { nouveau_statut });
      refetchActions();
    } catch {
      // le bouton reste disponible pour réessayer
    } finally {
      setVerifyingId(null);
    }
  };

  const soumis = diagnostics.filter((d) => d.statut === "soumis");
  const valides = diagnostics.filter((d) => d.statut === "valide");
  const correctionsDemandees = actions.filter((a) => a.type === "corrective" && a.statut !== "close" && a.statut !== "annulee");
  const actionsAVerifier = actions.filter((a) => a.statut === "en_verification");

  const scores = diagnostics.filter((d) => d.score_global > 0).map((d) => d.score_global);
  const tauxConformite = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

  const KPI = [
    { label: "Fiches en attente", value: String(soumis.length), sub: "En attente de révision", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
    { label: "Fiches approuvées", value: String(valides.length), sub: "Validées internement", color: "#166534", bg: "#dcfce7", icon: "✅" },
    { label: "Corrections demandées", value: String(correctionsDemandees.length), sub: "En attente de correction", color: "#991b1b", bg: "#fee2e2", icon: "🔄" },
    { label: "Taux de conformité", value: `${tauxConformite}%`, sub: "Objectif 85%", color: "#1e40af", bg: "#dbeafe", icon: "📊" },
  ];

  const recentActivity = [...diagnostics]
    .sort((a, b) => new Date(b.date_diagnostic) - new Date(a.date_diagnostic))
    .slice(0, 5)
    .map((d) => ({
      action: d.statut === "valide" ? "Fiche validée" : d.statut === "soumis" ? "Révision en attente" : d.statut === "archive" ? "Fiche archivée" : "Brouillon",
      process: d.processus?.nom || "—",
      date: d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString("fr-FR") : "—",
      status: d.statut === "valide" ? "validated" : d.statut === "soumis" ? "revision" : "observation",
      version: d.reference || `#${d.id}`,
    }));

  const upcoming = actions
    .filter((a) => a.date_echeance && a.statut !== "close" && a.statut !== "annulee")
    .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance))
    .slice(0, 4)
    .map((a) => ({
      task: a.titre,
      due: new Date(a.date_echeance).toLocaleDateString("fr-FR"),
      priority: a.priorite === "haute" || a.priorite === "critique" ? "haute" : a.priorite === "moyenne" ? "moyenne" : "normale",
    }));

  const sectionAgg = {};
  sections.forEach((s) => {
    if (!sectionAgg[s.code_section]) sectionAgg[s.code_section] = { total: 0, count: 0 };
    sectionAgg[s.code_section].total += s.score_section;
    sectionAgg[s.code_section].count += 1;
  });
  const isoClauses = Object.keys(SECTION_LABELS).map((code) => ({
    group: `${code}.x ${SECTION_LABELS[code]}`,
    compliance: sectionAgg[code] ? Math.round(sectionAgg[code].total / sectionAgg[code].count) : 0,
  }));

  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord" userName={user?.nom_complet || "—"} userRole="Auditeur Interne" userInitials={initials} />
      <div style={S.inner}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>
            Bonjour, {user?.nom_complet || "—"} 👋
          </h1>
          <p style={{ fontSize: 13.5, color: "#5a7a66" }}>
            Auditeur Interne · Vous avez <strong>{soumis.length} fiche{soumis.length !== 1 ? "s" : ""}</strong> en attente de révision.
          </p>
        </div>

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
          <div style={S.card}>
            <div style={S.sectionTitle}>Activité récente</div>
            {loading ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Chargement...</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Aucune activité récente.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f2f4" }}>
                    {["Action", "Processus", "Référence", "Date", "Statut"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                      <td style={{ padding: "10px 8px", fontWeight: 600, color: "#1a2e22" }}>{r.action}</td>
                      <td style={{ padding: "10px 8px", color: "#4b6358" }}>{r.process}</td>
                      <td style={{ padding: "10px 8px" }}><span style={{ background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{r.version}</span></td>
                      <td style={{ padding: "10px 8px", color: "#9ca3af", fontSize: 12 }}>{r.date}</td>
                      <td style={{ padding: "10px 8px" }}><StatusBadge status={r.status === "validated" ? "valide" : r.status === "revision" ? "soumis" : "brouillon"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Tâches à venir</div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Aucune tâche planifiée.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {upcoming.map((t, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "#f8fffe", borderRadius: 10, border: "1px solid #e8f5e1" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2e22", marginBottom: 4 }}>
                      <PriorityDot priority={t.priority} />{t.task}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>Échéance : {t.due}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {actionsAVerifier.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={S.sectionTitle}>
              Actions en attente de vérification ({actionsAVerifier.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {actionsAVerifier.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "12px 14px",
                    background: "#f8fffe",
                    borderRadius: 10,
                    border: "1px solid #e8f5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22" }}>{a.titre}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      {a.reference || `#${a.id}`} · {a.processus_nom || "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={verifyingId === a.id}
                      onClick={() => traiterVerification(a.id, "close")}
                      style={{
                        background: "#166534",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: verifyingId === a.id ? "not-allowed" : "pointer",
                        opacity: verifyingId === a.id ? 0.6 : 1,
                      }}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      disabled={verifyingId === a.id}
                      onClick={() => traiterVerification(a.id, "en_cours")}
                      style={{
                        background: "#fff",
                        color: "#92400e",
                        border: "1px solid #fde68a",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: verifyingId === a.id ? "not-allowed" : "pointer",
                        opacity: verifyingId === a.id ? 0.6 : 1,
                      }}
                    >
                      Renvoyer en cours
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={S.sectionTitle}>Conformité par groupe de clauses ISO 9001</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isoClauses.map((c) => (
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
