import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════ */
const C = {
  dark: "#1e3d2f",
  primary: "#2D604F",
  accent: "#77D58F",
  lightBg: "#eaf5eb",
  softBg: "#F0FFEB",
  white: "#FAFAFA",
  border: "#d4e9d7",
  text: "#1a2e22",
  muted: "#6b8c75",
  danger: "#e53935",
  warn: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f97316",
};

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: C.lightBg,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    height: 60,
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    flexShrink: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: C.muted,
  },
  breadcrumbActive: { color: C.text, fontWeight: 600 },
  topbarRight: { display: "flex", alignItems: "center", gap: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: C.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  pageHeader: {
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    color: C.text,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: C.muted,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
  },
  statCard: {
    background: C.white,
    borderRadius: 16,
    padding: "20px 24px",
    border: `1px solid ${C.border}`,
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 800,
    color: C.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  card: {
    background: C.white,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    overflow: "hidden",
  },
  cardHeader: {
    padding: "18px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: C.white,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
  },
  cardSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },
  cardContent: {
    padding: "20px 24px",
  },
  chartPlaceholder: {
    background: C.lightBg,
    borderRadius: 12,
    padding: "20px",
    minHeight: 250,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  barContainer: {
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 20,
    marginTop: 20,
  },
  bar: {
    flex: 1,
    background: C.accent,
    borderRadius: 8,
    transition: "height 0.3s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 600,
    color: C.text,
  },
  barLabel: {
    fontSize: 11,
    color: C.muted,
  },
  pieContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 30,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pieSegment: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pieColor: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  pieLabel: {
    fontSize: 13,
    color: C.text,
  },
  piePercent: {
    fontSize: 13,
    fontWeight: 700,
    color: C.text,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    background: C.lightBg,
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: `1px solid ${C.border}`,
  },
  td: {
    padding: "12px 16px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.border}`,
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
};

// Mock data for the dashboard
const actionsCorrectives = [
  { id: "AC-023", processus: "Gestion RH", description: "Mettre à jour procédure recrutement", responsable: "M. Haddadou", echeance: "15/04/2026", statut: "Planifié" },
  { id: "AC-012", processus: "Achats", description: "Créer workflow validation commandes", responsable: "M. Haddadou", echeance: "20/04/2026", statut: "En cours" },
  { id: "AC-009", processus: "Documentation", description: "Archiver documents obsolètes", responsable: "M. Haddadou", echeance: "10/04/2026", statut: "En retard" },
];

const statutStyles = {
  "Planifié": { background: "#dbeafe", color: "#1e40af" },
  "En cours": { background: "#fef3c7", color: "#92400e" },
  "En retard": { background: "#fee2e2", color: "#991b1b" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const sidebarWidth = collapsed ? 70 : 245;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #eaf5eb; }
        ::-webkit-scrollbar-thumb { background: #77D58F; border-radius: 99px; }
        button:hover { opacity: 0.88; cursor: pointer; }
      `}</style>

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        sidebarWidth={sidebarWidth}
      />

      <div style={{
        flex: 1,
        marginLeft: sidebarWidth,
        transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={styles.breadcrumb}>
            <span style={{ color: C.muted }}>Tableau de bord</span>
            <span style={{ color: C.border }}>/</span>
            <span style={styles.breadcrumbActive}>Dashboard</span>
          </div>
          <div style={styles.topbarRight}>
            <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
              🇫🇷 Français
            </span>
            <div style={styles.avatar}>AZ</div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div style={styles.pageTitle}>Tableau de bord</div>
            <div style={styles.pageSub}>Vue d'ensemble du système qualité</div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            {[
              { label: "Processus actifs", value: "24", icon: "📋", color: C.accent },
              { label: "Non-conformités", value: "12", icon: "⚠️", color: C.warn },
              { label: "Actions correctives", value: "8", icon: "✅", color: C.blue },
              { label: "Audits planifiés", value: "5", icon: "📅", color: C.purple },
            ].map((stat, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: `${stat.color}15` }}>
                  <span style={{ fontSize: 24 }}>{stat.icon}</span>
                </div>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div style={styles.twoColumnGrid}>
            {/* Chart: Non-Conformités par département */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>Non-Conformités</div>
                <div style={styles.cardSub}>Répartition par département</div>
              </div>
              <div style={styles.cardContent}>
                <div style={styles.chartPlaceholder}>
                  <div style={styles.barContainer}>
                    {[
                      { dept: "RH", value: 6 },
                      { dept: "Qualité", value: 4 },
                      { dept: "Laboratoire", value: 3 },
                      { dept: "Soutenances", value: 2 },
                    ].map((item, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{
                          height: `${item.value * 15}px`,
                          background: C.accent,
                          borderRadius: 8,
                          marginBottom: 8,
                          transition: "height 0.3s",
                        }} />
                        <div style={{ fontSize: 11, color: C.muted }}>{item.dept}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart: Répartition des Processus par Type */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>Répartition des Processus par Type</div>
                <div style={styles.cardSub}>Opérationnel, Support, Management</div>
              </div>
              <div style={styles.cardContent}>
                <div style={styles.pieContainer}>
                  {[
                    { type: "Opérationnel", percent: 60, color: C.accent },
                    { type: "Support", percent: 30, color: C.blue },
                    { type: "Management", percent: 10, color: C.orange },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: `conic-gradient(${item.color} 0deg ${item.percent * 3.6}deg, ${C.lightBg} ${item.percent * 3.6}deg 360deg)`,
                        marginBottom: 12,
                      }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.percent}%</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{item.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Correctives Table */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>Actions Correctives</div>
              <div style={styles.cardSub}>Suivi des actions en cours</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Processus</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Responsable</th>
                    <th style={styles.th}>Échéance</th>
                    <th style={styles.th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {actionsCorrectives.map((action) => (
                    <tr key={action.id}>
                      <td style={styles.td}>{action.id}</td>
                      <td style={styles.td}>{action.processus}</td>
                      <td style={styles.td}>{action.description}</td>
                      <td style={styles.td}>{action.responsable}</td>
                      <td style={styles.td}>{action.echeance}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          ...statutStyles[action.statut],
                        }}>
                          {action.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}