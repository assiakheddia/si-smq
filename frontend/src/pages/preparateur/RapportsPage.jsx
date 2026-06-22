import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, {
  getUnreadCount,
} from "../../components/NotificationsPanel.jsx";

const C = {
  dark: "#1e3d2f",
  primary: "#2D604F",
  accent: "#77D58F",
  lightBg: "#eaf5eb",
  white: "#FAFAFA",
  border: "#d4e9d7",
  text: "#1a2e22",
  muted: "#6b8c75",
  danger: "#e53935",
};

const REPORTS = [
  {
    id: 1,
    titre: "Rapport d'audit — Gestion PFE",
    type: "Audit",
    date: "2026-04-30",
    auteur: "Meziani Karim",
    statut: "Finalisé",
    pages: 12,
  },
  {
    id: 2,
    titre: "Rapport ISO 9001 — Bilan mensuel",
    type: "Conformité",
    date: "2026-05-01",
    auteur: "Atir Zineb",
    statut: "Finalisé",
    pages: 8,
  },
  {
    id: 3,
    titre: "Tableau de bord performance SMQ",
    type: "Performance",
    date: "2026-05-05",
    auteur: "Bensalem Sara",
    statut: "Brouillon",
    pages: 6,
  },
  {
    id: 4,
    titre: "Rapport d'audit — Contrôle Qualité",
    type: "Audit",
    date: "2026-05-08",
    auteur: "Haddadou Ali",
    statut: "En révision",
    pages: 14,
  },
  {
    id: 5,
    titre: "Rapport KPI trimestriel",
    type: "Performance",
    date: "2026-05-10",
    auteur: "Atir Zineb",
    statut: "Brouillon",
    pages: 10,
  },
  {
    id: 6,
    titre: "Plan d'action qualité 2026",
    type: "Conformité",
    date: "2026-04-15",
    auteur: "Kaci Nadia",
    statut: "Finalisé",
    pages: 20,
  },
];

const TYPE_COLOR = {
  Audit: { bg: "#dbeafe", color: "#1e40af" },
  Conformité: { bg: "#dcfce7", color: "#166534" },
  Performance: { bg: "#fef3c7", color: "#92400e" },
};

const STATUT_COLOR = {
  Finalisé: { bg: "#dcfce7", color: "#166534" },
  "En révision": { bg: "#fef3c7", color: "#92400e" },
  Brouillon: { bg: "#f3f4f6", color: "#6b7280" },
};

// Available report elements (like Odoo's report builder)
const REPORT_ELEMENTS = [
  { id: "header", label: "En-tête du rapport", icon: "📄", default: true },
  { id: "summary", label: "Résumé exécutif", icon: "📊", default: true },
  { id: "kpis", label: "Indicateurs clés (KPIs)", icon: "📈", default: true },
  {
    id: "charts",
    label: "Graphiques et visualisations",
    icon: "📉",
    default: false,
  },
  {
    id: "reports_list",
    label: "Liste des rapports",
    icon: "📋",
    default: true,
  },
  { id: "audit_details", label: "Détails d'audit", icon: "🔍", default: false },
  {
    id: "non_conformities",
    label: "Non-conformités",
    icon: "⚠️",
    default: false,
  },
  { id: "actions", label: "Actions correctives", icon: "✅", default: false },
  { id: "iso_compliance", label: "Conformité ISO", icon: "🏆", default: false },
  { id: "footer", label: "Pied de page", icon: "📎", default: true },
];

export default function RapportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [statutFilter, setStatutFilter] = useState("Tous");
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [exportToast, setExportToast] = useState(null);

  // Report builder state
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedElements, setSelectedElements] = useState(
    REPORT_ELEMENTS.filter((el) => el.default).map((el) => el.id),
  );
  const [reportName, setReportName] = useState("");
  const [reportFormat, setReportFormat] = useState("PDF");

  useEffect(() => {
    setUnread(getUnreadCount());
  }, []);

  const filtered = REPORTS.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.titre.toLowerCase().includes(q) ||
      r.auteur.toLowerCase().includes(q);
    const matchType = typeFilter === "Tous" || r.type === typeFilter;
    const matchStatut = statutFilter === "Tous" || r.statut === statutFilter;
    return matchSearch && matchType && matchStatut;
  });

  const toggleElement = (elementId) => {
    setSelectedElements((prev) =>
      prev.includes(elementId)
        ? prev.filter((id) => id !== elementId)
        : [...prev, elementId],
    );
  };

  const handleGenerateReport = () => {
    if (!reportName.trim()) {
      setExportToast({
        message: "Veuillez donner un nom au rapport",
        type: "error",
      });
      setTimeout(() => setExportToast(null), 2500);
      return;
    }
    const selectedCount = selectedElements.length;
    setExportToast({
      message: `Rapport "${reportName}" généré avec ${selectedCount} éléments au format ${reportFormat}`,
      type: "success",
    });
    setTimeout(() => setExportToast(null), 3500);
    setShowReportBuilder(false);
    setReportName("");
  };

  const handleExport = (fmt, titre) => {
    setExportToast({
      message: `Export ${fmt} de «${titre}» en cours…`,
      type: "success",
    });
    setTimeout(() => setExportToast(null), 2500);
  };

  // Stats for the report preview
  const totalReports = REPORTS.length;
  const finalizedReports = REPORTS.filter(
    (r) => r.statut === "Finalisé",
  ).length;
  const inProgressReports = REPORTS.filter(
    (r) => r.statut === "En révision",
  ).length;
  const draftReports = REPORTS.filter((r) => r.statut === "Brouillon").length;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .rap-wrap { padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px; min-height:100vh; background:#eaf5eb; }
        .rap-topbar { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e8ede9; border-radius:clamp(12px,1.3vw,16px); height:clamp(52px,6vw,62px); padding:0 clamp(12px,1.5vw,20px); margin-bottom:clamp(16px,2vw,24px); box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.3s ease; gap:10px; }
        .rap-tb-r { display:flex; align-items:center; gap:clamp(6px,0.9vw,12px); }
        .rap-icon-btn { height:34px; min-width:34px; border-radius:10px; border:1px solid #e8eaed; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; padding:0 10px; position:relative; transition:all 0.15s; }
        .rap-icon-btn:hover { background:#f3f5f7; transform:translateY(-1px); }
        .rap-n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .rap-u-chip { display:flex; align-items:center; gap:8px; background:#f3f5f7; border:1px solid #e8eaed; border-radius:11px; padding:4px 10px 4px 5px; cursor:pointer; transition:all 0.15s; }
        .rap-u-chip:hover { background:#ebeef1; }
        .rap-u-av { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#5ecf7a,#2d9e5f); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:900; font-size:10px; color:#152b21; }
        .rap-card { background:#fff; border-radius:18px; overflow:hidden; animation:fadeUp 0.4s ease both; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
        .rap-row:hover { background:#f8fcf9 !important; }
        .rap-builder-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px); animation:fadeUp 0.2s ease; }
        .rap-builder-modal { background:#fff; border-radius:24px; max-width:680px; width:94%; max-height:90vh; overflow:auto; padding:32px; box-shadow:0 24px 80px rgba(0,0,0,0.25); animation:slideIn 0.3s ease; }
        .rap-element-chip { display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:2px solid #e8eaed; background:#fff; cursor:pointer; transition:all 0.15s; font-size:13px; font-weight:600; color:#374151; }
        .rap-element-chip:hover { border-color:#77D58F; transform:translateY(-1px); }
        .rap-element-chip.active { border-color:#2D604F; background:#eaf5eb; color:#1e3d2f; }
        .rap-element-chip .check { opacity:0; transition:opacity 0.15s; }
        .rap-element-chip.active .check { opacity:1; }
        .rap-element-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .rap-toast-error { background:#fef2f2 !important; color:#991b1b !important; border:1px solid #fca5a5 !important; }
        .rap-toast-error .toast-icon { color:#ef4444; }
        .rap-toast-success { background:#f0fdf4 !important; color:#166534 !important; border:1px solid #86efac !important; }
        @media (max-width:600px) { .rap-element-grid { grid-template-columns:1fr; } }
      `}</style>

      {showNotifs && (
        <NotificationsPanel onClose={() => setShowNotifs(false)} />
      )}
      {exportToast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            borderRadius: 12,
            padding: "14px 22px",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            zIndex: 9999,
            animation: "fadeUp 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: 10,
            ...(exportToast.type === "error"
              ? {
                  background: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fca5a5",
                }
              : {
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #86efac",
                }),
          }}
        >
          <span style={{ fontSize: 20 }}>
            {exportToast.type === "error" ? "⚠️" : "✅"}
          </span>
          {exportToast.message}
        </div>
      )}

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <div
          className="rap-builder-overlay"
          onClick={() => setShowReportBuilder(false)}
        >
          <div
            className="rap-builder-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 800,
                    fontSize: 22,
                    color: "#111",
                  }}
                >
                  🛠️ Créer un rapport personnalisé
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  Sélectionnez les éléments que vous souhaitez inclure dans
                  votre rapport
                </div>
              </div>
              <button
                onClick={() => setShowReportBuilder(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid #e8eaed",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.muted,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            {/* Report Name */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Nom du rapport
              </label>
              <input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Ex: Bilan qualité trimestriel"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  background: C.softBg || "#f3f5f7",
                  fontSize: 14,
                  color: C.text,
                  outline: "none",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.primary)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {/* Elements selection */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Éléments du rapport ({selectedElements.length} sélectionnés)
                </label>
                <button
                  onClick={() =>
                    setSelectedElements(REPORT_ELEMENTS.map((el) => el.id))
                  }
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.primary,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Tout sélectionner
                </button>
              </div>
              <div className="rap-element-grid">
                {REPORT_ELEMENTS.map((el) => (
                  <div
                    key={el.id}
                    className={`rap-element-chip ${selectedElements.includes(el.id) ? "active" : ""}`}
                    onClick={() => toggleElement(el.id)}
                  >
                    <span>{el.icon}</span>
                    <span style={{ flex: 1 }}>{el.label}</span>
                    <span className="check" style={{ color: C.primary }}>
                      ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Format
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["PDF", "Excel", "Word"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setReportFormat(fmt)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 8,
                      border: `2px solid ${reportFormat === fmt ? C.primary : "#e8eaed"}`,
                      background: reportFormat === fmt ? C.primary : "white",
                      color: reportFormat === fmt ? "white" : "#6b7280",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: "all 0.15s",
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowReportBuilder(false)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  color: C.muted,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateReport}
                style={{
                  flex: 2,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "none",
                  background: `linear-gradient(135deg, ${C.primary}, #1e6b42)`,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: "0 4px 14px rgba(45,96,79,0.3)",
                }}
              >
                🚀 Générer le rapport
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rap-wrap">
        {/* Topbar */}
        <div className="rap-topbar">
          <div
            style={{
              fontSize: 14,
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/processus")}
            >
              Tableau de bord
            </span>
            <span style={{ color: C.border }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Rapports</span>
          </div>
          <div className="rap-tb-r">
            <div className="rap-icon-btn">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                FR
              </span>
            </div>
            <div
              className="rap-icon-btn"
              onClick={() => setShowNotifs((v) => !v)}
              style={{ cursor: "pointer" }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unread > 0 && <span className="rap-n-dot" />}
            </div>
            <div className="rap-u-chip" onClick={() => navigate("/parametres")}>
              <div className="rap-u-av">AZ</div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#111",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  Atir Zineb
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Admin</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 3.5l3 3 3-3"
                  stroke="#9ca3af"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 22,
            animation: "fadeUp 0.3s ease 0.05s both",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: "clamp(20px,2.5vw,28px)",
                color: "#111",
              }}
            >
              Rapports
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
              Consultez et exportez les rapports du système qualité
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* New Report Builder Button */}
            <button
              onClick={() => setShowReportBuilder(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #2d9e5f, #1e6b42)",
                border: "none",
                borderRadius: 11,
                padding: "10px 18px",
                cursor: "pointer",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                boxShadow: "0 4px 14px rgba(45,158,95,0.35)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              🛠️ Créer un rapport
            </button>
            <button
              onClick={() => handleExport("PDF", "Bilan SMQ")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fee2e2",
                border: "1.5px solid #fca5a5",
                borderRadius: 11,
                padding: "10px 18px",
                cursor: "pointer",
                color: "#991b1b",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => handleExport("Excel", "Bilan SMQ")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #2d9e5f, #1e6b42)",
                border: "none",
                borderRadius: 11,
                padding: "10px 18px",
                cursor: "pointer",
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                boxShadow: "0 4px 14px rgba(45,158,95,0.35)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 14,
            marginBottom: 22,
            animation: "fadeUp 0.35s ease 0.08s both",
          }}
        >
          {[
            {
              icon: "📋",
              label: "Total rapports",
              value: totalReports,
              color: "#1e3d2f",
            },
            {
              icon: "✅",
              label: "Finalisés",
              value: finalizedReports,
              color: "#22c55e",
            },
            {
              icon: "🔄",
              label: "En révision",
              value: inProgressReports,
              color: "#f59e0b",
            },
            {
              icon: "✏️",
              label: "Brouillons",
              value: draftReports,
              color: "#6b7280",
            },
          ].map(({ icon, label, value, color }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                border: `1px solid ${color}15`,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: `${color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 900,
                    fontSize: 26,
                    color: "#111",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginTop: 3,
                  }}
                >
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content - Reports list */}
        <div className="rap-card" style={{ animationDelay: "0.1s" }}>
          {/* Filters */}
          <div
            style={{
              padding: "16px 22px 14px",
              borderBottom: "1px solid #f0f2f4",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "#111", flex: 1 }}
            >
              Documents & rapports
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f3f5f7",
                border: "1px solid #e8eaed",
                borderRadius: 10,
                padding: "6px 12px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c4c8d1"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5L21 21" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 12.5,
                  color: "#333",
                  width: 140,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1.5px solid #e8eaed",
                  background: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  outline: "none",
                }}
              >
                {["Tous", "Audit", "Conformité", "Performance"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1.5px solid #e8eaed",
                  background: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  outline: "none",
                }}
              >
                {["Tous", "Finalisé", "En révision", "Brouillon"].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <span
              style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}
            >
              <strong style={{ color: "#374151" }}>{filtered.length}</strong>{" "}
              rapport{filtered.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Reports list */}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                Aucun rapport trouvé
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Modifiez vos filtres pour voir plus de résultats
              </div>
            </div>
          ) : (
            filtered.map((r, i) => {
              const ts = TYPE_COLOR[r.type];
              const ss = STATUT_COLOR[r.statut];
              return (
                <div
                  key={r.id}
                  className="rap-row"
                  style={{
                    padding: "14px 22px",
                    borderBottom:
                      i < filtered.length - 1 ? "1px solid #f0f2f4" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    animationDelay: `${i * 0.04}s`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fcf9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: ts.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {r.type === "Audit"
                      ? "📋"
                      : r.type === "Conformité"
                        ? "🏆"
                        : "📊"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#111",
                        fontSize: 13,
                        marginBottom: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.titre}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          ...ts,
                          padding: "2px 9px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {r.type}
                      </span>
                      <span
                        style={{
                          ...ss,
                          padding: "2px 9px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {r.statut}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        par{" "}
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>
                          {r.auteur}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        · {r.date}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        · {r.pages} pages
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport("PDF", r.titre);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: `1px solid ${C.border}`,
                        background: "#fee2e2",
                        color: "#991b1b",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fecaca";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fee2e2";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      PDF
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport("Excel", r.titre);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: "none",
                        background: C.primary,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1e6b42";
                        e.currentTarget.style.transform = "scale(1.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = C.primary;
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      XLS
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
