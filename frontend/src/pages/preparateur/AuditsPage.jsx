import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, {
  getUnreadCount,
} from "../components/NotificationsPanel.jsx";

/* ── statuts ──────────────────────────────────────────────────────────── */
const STATUTS = {
  planifie: { label: "Planifié", bg: "#dbeafe", color: "#1e40af" },
  preparation: { label: "Préparation", bg: "#ede9fe", color: "#5b21b6" },
  en_cours: { label: "En cours", bg: "#fef3c7", color: "#92400e" },
  termine: { label: "Terminé", bg: "#dcfce7", color: "#166534" },
  valide: { label: "Validé", bg: "#d1fae5", color: "#065f46" },
  clos: { label: "Clos", bg: "#f3f4f6", color: "#374151" },
  retard: { label: "Retard", bg: "#fee2e2", color: "#991b1b" },
};
const NC_STATUTS = {
  ouvert: { label: "Ouvert", bg: "#fee2e2", color: "#991b1b" },
  en_cours: { label: "En cours", bg: "#fef3c7", color: "#92400e" },
  verification: { label: "Vérification", bg: "#ede9fe", color: "#5b21b6" },
  clos: { label: "Clos", bg: "#dcfce7", color: "#166534" },
};
const NC_GRAVITE = {
  Critique: { bg: "#fee2e2", color: "#991b1b" },
  Majeure: { bg: "#fef3c7", color: "#92400e" },
  Mineure: { bg: "#dbeafe", color: "#1e40af" },
};

/* ── données démo ─────────────────────────────────────────────────────── */
const PROCESSUS_LIST = [
  "Gestion PFE",
  "Contrôle Qualité",
  "Formation ISO",
  "Audit Labo",
  "Audit Interne",
  "Gestion documentaire",
  "Satisfaction client",
];
const AUDITEURS_LIST = [
  "Meziani Karim",
  "Bensalem Sara",
  "Haddadou Ali",
  "Kaci Nadia",
  "Atir Zineb",
];
const CLAUSES_ISO = [
  "4.1 Contexte",
  "4.2 Parties intéressées",
  "5.1 Leadership",
  "6.1 Risques",
  "6.2 Objectifs qualité",
  "7.1 Ressources",
  "7.2 Compétences",
  "7.5 Documents",
  "8.1 Planification",
  "8.4 Processus externes",
  "9.1 Surveillance",
  "9.2 Audit interne",
  "9.3 Revue de direction",
  "10.2 NC",
];

const INIT_AUDITS = [
  {
    id: 1,
    ref: "AUD-2026-001",
    titre: "Audit système qualité Q1",
    processus: "Gestion PFE",
    type: "Interne",
    auditeur: "Meziani Karim",
    datePlan: "2026-03-15",
    dateFin: "2026-03-18",
    statut: "clos",
    score: 88,
    ncIds: [1, 2],
  },
  {
    id: 2,
    ref: "AUD-2026-002",
    titre: "Audit laboratoire",
    processus: "Audit Labo",
    type: "Externe",
    auditeur: "Bensalem Sara",
    datePlan: "2026-04-20",
    dateFin: "2026-04-22",
    statut: "valide",
    score: 76,
    ncIds: [3],
  },
  {
    id: 3,
    ref: "AUD-2026-003",
    titre: "Audit formation ISO",
    processus: "Formation ISO",
    type: "Interne",
    auditeur: "Kaci Nadia",
    datePlan: "2026-05-10",
    dateFin: null,
    statut: "en_cours",
    score: null,
    ncIds: [],
  },
  {
    id: 4,
    ref: "AUD-2026-004",
    titre: "Audit contrôle qualité",
    processus: "Contrôle Qualité",
    type: "Interne",
    auditeur: "Haddadou Ali",
    datePlan: "2026-05-25",
    dateFin: null,
    statut: "preparation",
    score: null,
    ncIds: [],
  },
  {
    id: 5,
    ref: "AUD-2026-005",
    titre: "Audit satisfaction client",
    processus: "Satisfaction client",
    type: "Externe",
    auditeur: "Meziani Karim",
    datePlan: "2026-06-15",
    dateFin: null,
    statut: "planifie",
    score: null,
    ncIds: [],
  },
  {
    id: 6,
    ref: "AUD-2026-006",
    titre: "Audit gestion documentaire",
    processus: "Gestion documentaire",
    type: "Interne",
    auditeur: "Atir Zineb",
    datePlan: "2026-06-28",
    dateFin: null,
    statut: "planifie",
    score: null,
    ncIds: [],
  },
  {
    id: 7,
    ref: "AUD-2026-007",
    titre: "Revue processus achat",
    processus: "Contrôle Qualité",
    type: "Interne",
    auditeur: "Bensalem Sara",
    datePlan: "2026-04-05",
    dateFin: null,
    statut: "retard",
    score: null,
    ncIds: [4],
  },
];
const INIT_NC = [
  {
    id: 1,
    auditId: 1,
    ref: "AUD-2026-001-NC-001",
    titre: "Manque de traçabilité documentaire",
    clause: "7.5 Documents",
    gravite: "Majeure",
    statut: "clos",
    responsable: "Haddadou Ali",
    dateLimit: "2026-04-15",
    action: "Mise en place d'un registre numérique",
  },
  {
    id: 2,
    auditId: 1,
    ref: "AUD-2026-001-NC-002",
    titre: "Procédure de revue non suivie",
    clause: "9.3 Revue",
    gravite: "Mineure",
    statut: "clos",
    responsable: "Meziani Karim",
    dateLimit: "2026-04-20",
    action: "Rappels paramétrés dans le SMQ",
  },
  {
    id: 3,
    auditId: 2,
    ref: "AUD-2026-001-NC-003",
    titre: "Étalonnage équipements non conforme",
    clause: "7.1 Ressources",
    gravite: "Critique",
    statut: "en_cours",
    responsable: "Bensalem Sara",
    dateLimit: "2026-05-30",
    action: "Contrat étalonnage signé, en attente d'exécution",
  },
  {
    id: 4,
    auditId: 7,
    ref: "AUD-2026-001-NC-004",
    titre: "Critères sélection fournisseurs absent",
    clause: "8.4 Processus ext.",
    gravite: "Majeure",
    statut: "ouvert",
    responsable: "Kaci Nadia",
    dateLimit: "2026-06-10",
    action: "",
  },
];

/* ── helpers ──────────────────────────────────────────────────────────── */
const StatBadge = ({ statut, map = STATUTS }) => {
  const s = map[statut] || { label: statut, bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        padding: "2px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};
const TypeBadge = ({ type }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: type === "Externe" ? "#92400e" : "#1e40af",
      background: type === "Externe" ? "#fef3c7" : "#dbeafe",
      padding: "2px 8px",
      borderRadius: 20,
    }}
  >
    {type}
  </span>
);
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ── Charts ────────────────────────────────────────────────────────────── */

// Donut Chart
function DonutChart({ segments, size = 100, stroke = 18 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2,
    cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f0f2f4"
        strokeWidth={stroke}
      />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={(-offset * circ) / total + circ / 4}
            strokeLinecap="butt"
            style={{
              transform: `rotate(-90deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
        );
        offset += seg.value;
        return el;
      })}
    </svg>
  );
}

// Vertical Bar Chart for Monthly Audits
function VerticalBarChart({ data, color = "#2d9e5f", height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        height: height + 20,
        width: "100%",
        justifyContent: "space-around",
      }}
    >
      {data.map((item, i) => {
        const barHeight = Math.max((item.value / max) * height, 4);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: 4,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 28,
                height: barHeight,
                background: color,
                borderRadius: "4px 4px 0 0",
                opacity: item.value > 0 ? 0.85 : 0.3,
                transition: "height 0.4s ease",
              }}
            />
            <div
              style={{
                fontSize: 8,
                color: "#9ca3af",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Score Gauge Chart
function ScoreGauge({ score }) {
  const normalized = Math.min(Math.max(score, 0), 100);
  const color = normalized >= 80 ? "#22c55e" : normalized >= 60 ? "#f59e0b" : "#ef4444";
  const angle = (normalized / 100) * 180;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 140, height: 80, overflow: "hidden" }}>
        <svg width="140" height="80" viewBox="0 0 140 80">
          <path
            d="M 15 70 A 55 55 0 0 1 125 70"
            fill="none"
            stroke="#f0f2f4"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 15 70 A 55 55 0 0 1 125 70"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 172.8} 172.8`}
            strokeDashoffset="0"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "'Outfit',sans-serif",
            color: color,
          }}
        >
          {score}%
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Tableau de bord ─────────────────────────────────────────────── */
function TabDashboard({ audits, ncs }) {
  const recent = [...audits].sort((a, b) => b.id - a.id).slice(0, 5);
  
  // NC by Clause (top 4 for small charts)
  const clauseCounts = {};
  ncs.forEach((n) => {
    clauseCounts[n.clause] = (clauseCounts[n.clause] || 0) + 1;
  });
  const clauseData = Object.entries(clauseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));
  const maxClause = Math.max(...clauseData.map((d) => d.value), 1);

  // Audit type distribution
  const typeData = [
    { label: "Interne", value: audits.filter((a) => a.type === "Interne").length, color: "#3b82f6" },
    { label: "Externe", value: audits.filter((a) => a.type === "Externe").length, color: "#f59e0b" },
  ];

  // Monthly distribution
  const monthBars = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ].map((l, i) => ({
    label: l,
    value: audits.filter(
      (a) => a.datePlan && parseInt(a.datePlan.split("-")[1]) - 1 === i
    ).length,
  }));

  // Scores for gauge
  const scores = audits.filter((a) => a.score !== null);
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, v) => s + v.score, 0) / scores.length)
    : null;

  return (
    <div
      style={{
        padding: "16px 22px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "#eaf5eb",
      }}
    >
      {/* Charts Grid - 4 charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {/* Chart 1: Monthly Distribution */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>
            Audits par mois
          </div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 12 }}>
            Programme 2026
          </div>
          <VerticalBarChart data={monthBars} color="#2d9e5f" height={100} />
        </div>

        {/* Chart 2: Type Distribution - Donut */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>
            Interne vs Externe
          </div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 12 }}>
            Répartition des audits
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DonutChart segments={typeData} size={80} stroke={14} />
            <div style={{ marginLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {typeData.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
                  <span style={{ fontSize: 11, color: "#374151" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#111", marginLeft: 6 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Score Gauge */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>
            Score moyen de conformité
          </div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 8 }}>
            {scores.length} audit{scores.length !== 1 ? "s" : ""} évalué{scores.length !== 1 ? "s" : ""}
          </div>
          {avgScore !== null ? (
            <ScoreGauge score={avgScore} />
          ) : (
            <div style={{ color: "#d1d5db", fontSize: 12, padding: 20 }}>Aucune donnée</div>
          )}
        </div>

        {/* Chart 4: NC by Clause - Small Horizontal Bar Chart */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "16px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>
            NC par clause ISO
          </div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 12 }}>
            Top 4 clauses
          </div>
          {clauseData.length === 0 ? (
            <div style={{ color: "#d1d5db", fontSize: 12, textAlign: "center", padding: 20 }}>
              Aucune donnée
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clauseData.map((item) => (
                <div key={item.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "#374151" }}>{item.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>
                      {item.value}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#f3f4f6",
                      borderRadius: 20,
                      height: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.value / maxClause) * 100}%`,
                        background: "#ef4444",
                        borderRadius: 20,
                        transition: "width 0.6s ease",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audits Table */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f2f4",
            fontWeight: 700,
            fontSize: 13,
            color: "#111",
          }}
        >
          Audits récents
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                {["Référence", "Titre", "Processus", "Auditeur", "Date planifiée", "Statut", "Score"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      borderBottom: "1px solid #f0f2f4",
                      background: "#fafafa",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f8f9fa" }}>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                    {a.ref}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 200 }}>
                    {a.titre}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.processus}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.auditeur}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{fmtDate(a.datePlan)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <StatBadge statut={a.statut} />
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: a.score >= 80 ? "#166534" : a.score >= 60 ? "#92400e" : a.score !== null ? "#991b1b" : "#9ca3af",
                    }}
                  >
                    {a.score !== null ? `${a.score}%` : "—"}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#d1d5db", fontSize: 13 }}>
                    Aucun audit récent
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Programme & Calendrier (Fusionné) ──────────────────────────── */
function TabProgrammeCalendrier({ audits }) {
  const [viewMode, setViewMode] = useState("calendar");
  const [curMonth, setCurMonth] = useState(4);
  const [filterProcessus, setFilterProcessus] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  
  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const year = 2026;

  // Get unique processus from audits
  const processusList = ["Tous", ...new Set(audits.map(a => a.processus).filter(Boolean))];

  // Apply filters
  const filteredAudits = audits.filter(a => {
    const matchP = filterProcessus === "Tous" || a.processus === filterProcessus;
    const matchT = filterType === "Tous" || a.type === filterType;
    const matchS = filterStatut === "Tous" || a.statut === filterStatut;
    return matchP && matchT && matchS;
  });

  // Calendar calculations
  const firstDay = new Date(year, curMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, curMonth + 1, 0).getDate();

  const getAuditsForDay = (day) => {
    const dateStr = `${year}-${String(curMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredAudits.filter((a) => a.datePlan === dateStr);
  };

  // Status distribution for graph
  const statusData = [
    { label: "Planifié", value: filteredAudits.filter(a => a.statut === "planifie").length, color: "#3b82f6" },
    { label: "Préparation", value: filteredAudits.filter(a => a.statut === "preparation").length, color: "#8b5cf6" },
    { label: "En cours", value: filteredAudits.filter(a => a.statut === "en_cours").length, color: "#f59e0b" },
    { label: "Terminé", value: filteredAudits.filter(a => ["termine", "valide", "clos"].includes(a.statut)).length, color: "#22c55e" },
    { label: "Retard", value: filteredAudits.filter(a => a.statut === "retard").length, color: "#ef4444" },
  ];

  // Calendar cells
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ padding: "16px 22px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filters and View Toggle */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "14px 18px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 4, background: "#f3f5f7", borderRadius: 7, padding: 3 }}>
          <button
            onClick={() => setViewMode("calendar")}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: viewMode === "calendar" ? "white" : "transparent",
              color: viewMode === "calendar" ? "#1e3d2f" : "#6b7280",
              boxShadow: viewMode === "calendar" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            📅 Calendrier
          </button>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: viewMode === "table" ? "white" : "transparent",
              color: viewMode === "table" ? "#1e3d2f" : "#6b7280",
              boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            📋 Programme
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: viewMode === "table" ? 0 : "auto" }}>
          <select
            value={filterProcessus}
            onChange={(e) => setFilterProcessus(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: "1.5px solid #e8eaed",
              background: "white",
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              outline: "none",
            }}
          >
            {processusList.map((p) => (
              <option key={p} value={p}>{p === "Tous" ? "Tous processus" : p}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: "1.5px solid #e8eaed",
              background: "white",
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              outline: "none",
            }}
          >
            <option value="Tous">Tous types</option>
            <option value="Interne">Interne</option>
            <option value="Externe">Externe</option>
          </select>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 7,
              border: "1.5px solid #e8eaed",
              background: "white",
              fontSize: 11,
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              outline: "none",
            }}
          >
            <option value="Tous">Tous statuts</option>
            {Object.entries(STATUTS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar or Table View */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {viewMode === "calendar" ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Calendrier des audits</div>
                <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{MONTHS[curMonth]} {year}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setCurMonth((m) => Math.max(0, m - 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid #e8eaed",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7 2.5L4 6l3 3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111", minWidth: 100, textAlign: "center" }}>
                  {MONTHS[curMonth]}
                </span>
                <button
                  onClick={() => setCurMonth((m) => Math.min(11, m + 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid #e8eaed",
                    background: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M5 2.5L8 6l-3 3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9ca3af", padding: "4px 0" }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dayAudits = getAuditsForDay(day);
                const isToday = day === new Date().getDate() && curMonth === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <div
                    key={i}
                    style={{
                      minHeight: 64,
                      borderRadius: 8,
                      background: isToday ? "#f0fdf4" : "#fafafa",
                      border: `1px solid ${isToday ? "#5ecf7a" : "#f0f2f4"}`,
                      padding: "6px 8px",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? "#1e3d2f" : "#374151", marginBottom: 4 }}>
                      {day}
                    </div>
                    {dayAudits.slice(0, 2).map((a) => {
                      const s = STATUTS[a.statut] || {};
                      return (
                        <div
                          key={a.id}
                          title={a.titre}
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: s.color || "#374151",
                            background: s.bg || "#f3f4f6",
                            borderRadius: 4,
                            padding: "1px 5px",
                            marginBottom: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {a.titre.slice(0, 16)}…
                        </div>
                      );
                    })}
                    {dayAudits.length > 2 && (
                      <div style={{ fontSize: 9, color: "#9ca3af" }}>+{dayAudits.length - 2}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 12 }}>
              Programme annuel des audits
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#9ca3af",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        borderBottom: "1px solid #f0f2f4",
                        whiteSpace: "nowrap",
                        background: "#fafafa",
                      }}
                    >
                      Processus
                    </th>
                    {MONTHS.map((m) => (
                      <th
                        key={m}
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: "#9ca3af",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                          borderBottom: "1px solid #f0f2f4",
                          whiteSpace: "nowrap",
                          background: "#fafafa",
                        }}
                      >
                        {m.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processusList.filter(p => p !== "Tous").map((proc) => {
                    const procAudits = filteredAudits.filter((a) => a.processus === proc);
                    if (procAudits.length === 0 && filterProcessus !== "Tous") return null;
                    return (
                      <tr key={proc} style={{ borderBottom: "1px solid #f8f9fa" }}>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#111",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {proc}
                        </td>
                        {MONTHS.map((_, mi) => {
                          const monthAud = procAudits.filter(
                            (a) => a.datePlan && parseInt(a.datePlan.split("-")[1]) - 1 === mi
                          );
                          return (
                            <td key={mi} style={{ padding: "10px 6px", textAlign: "center" }}>
                              {monthAud.map((a) => {
                                const s = STATUTS[a.statut] || {};
                                return (
                                  <div
                                    key={a.id}
                                    title={a.titre}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 5,
                                      background: s.bg || "#f3f4f6",
                                      margin: "0 auto",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginBottom: 2,
                                      cursor: "default",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 8,
                                        fontWeight: 800,
                                        color: s.color || "#374151",
                                      }}
                                    >
                                      {a.type === "Interne" ? "I" : "E"}
                                    </span>
                                  </div>
                                );
                              })}
                              {monthAud.length === 0 && (
                                <span style={{ color: "#f0f2f4", fontSize: 10 }}>·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {filteredAudits.length === 0 && (
                    <tr>
                      <td colSpan={13} style={{ textAlign: "center", padding: "40px", color: "#d1d5db", fontSize: 13 }}>
                        Aucun audit trouvé pour les filtres sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f0f2f4",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#dbeafe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 8, fontWeight: 800, color: "#1e40af" }}>I</span>
                </div>
                <span style={{ fontSize: 10.5, color: "#374151" }}>Audit interne</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 8, fontWeight: 800, color: "#92400e" }}>E</span>
                </div>
                <span style={{ fontSize: 10.5, color: "#374151" }}>Audit externe</span>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 10.5, color: "#9ca3af" }}>
                <b style={{ color: "#374151" }}>{filteredAudits.length}</b> audit{filteredAudits.length !== 1 ? "s" : ""} affiché{filteredAudits.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Audit Drawer ─────────────────────────────────────────────────────── */
function AuditDrawer({ audit, ncs, onClose, onStatusChange }) {
  const [drawerTab, setDrawerTab] = useState(0);
  const auditNCs = ncs.filter((n) => n.auditId === audit.id);

  const NEXT_STATUT = {
    planifie: "preparation",
    preparation: "en_cours",
    en_cours: "termine",
    termine: "valide",
    valide: "clos",
  };
  const NEXT_LABEL = {
    planifie: "Démarrer préparation",
    preparation: "Lancer l'audit",
    en_cours: "Marquer terminé",
    termine: "Valider",
    valide: "Clôturer",
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 200,
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          background: "white",
          zIndex: 201,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f0f2f4", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, marginBottom: 4 }}>{audit.ref}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111", lineHeight: 1.3 }}>{audit.titre}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <StatBadge statut={audit.statut} />
                <TypeBadge type={audit.type} />
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                border: "1px solid #e8eaed",
                borderRadius: 7,
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#f3f5f7",
              borderRadius: 7,
              padding: 2,
              marginTop: 12,
            }}
          >
            {["Informations", "Non-conformités", "Actions"].map((t, i) => (
              <button
                key={i}
                onClick={() => setDrawerTab(i)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  borderRadius: 5,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  background: drawerTab === i ? "white" : "transparent",
                  color: drawerTab === i ? "#1e3d2f" : "#6b7280",
                  boxShadow: drawerTab === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
          {drawerTab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Processus", value: audit.processus },
                { label: "Auditeur", value: audit.auditeur },
                { label: "Type", value: audit.type },
                { label: "Date planifiée", value: fmtDate(audit.datePlan) },
                { label: "Date de clôture", value: fmtDate(audit.dateFin) },
                { label: "Score", value: audit.score !== null ? `${audit.score}%` : "Non évalué" },
              ].map((f) => (
                <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8f9fa" }}>
                  <span style={{ fontSize: 11.5, color: "#6b7280" }}>{f.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{f.value}</span>
                </div>
              ))}
              {audit.score !== null && (
                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Score de conformité
                  </div>
                  <div style={{ background: "#f0f2f4", borderRadius: 20, height: 10, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${audit.score}%`,
                        background: audit.score >= 80 ? "#22c55e" : audit.score >= 60 ? "#f59e0b" : "#ef4444",
                        borderRadius: 20,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>0%</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: audit.score >= 80 ? "#166534" : audit.score >= 60 ? "#92400e" : "#991b1b" }}>
                      {audit.score}%
                    </span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>100%</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {drawerTab === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditNCs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: 12 }}>
                  Aucune non-conformité pour cet audit.
                </div>
              ) : (
                auditNCs.map((nc) => {
                  const gs = NC_GRAVITE[nc.gravite] || {};
                  const ss = NC_STATUTS[nc.statut] || {};
                  return (
                    <div key={nc.id} style={{ background: "#fafafa", border: "1px solid #f0f2f4", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>{nc.ref}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: gs.color, background: gs.bg, padding: "1px 6px", borderRadius: 20 }}>
                            {nc.gravite}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: ss.color, background: ss.bg, padding: "1px 6px", borderRadius: 20 }}>
                            {ss.label || nc.statut}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>{nc.titre}</div>
                      <div style={{ fontSize: 10.5, color: "#6b7280" }}>Clause : {nc.clause} · Responsable : {nc.responsable}</div>
                      {nc.action && (
                        <div style={{ fontSize: 10.5, color: "#374151", marginTop: 6, fontStyle: "italic" }}>
                          Action : {nc.action}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
          {drawerTab === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditNCs.filter((n) => n.action).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: 12 }}>
                  Aucune action corrective définie.
                </div>
              ) : (
                auditNCs.filter((n) => n.action).map((nc) => (
                  <div key={nc.id} style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", marginBottom: 4 }}>{nc.ref} — {nc.clause}</div>
                    <div style={{ fontSize: 12, color: "#111" }}>{nc.action}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 10.5, color: "#6b7280" }}>Resp. : {nc.responsable}</span>
                      <span style={{ fontSize: 10.5, color: "#6b7280" }}>Échéance : {fmtDate(nc.dateLimit)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {NEXT_STATUT[audit.statut] && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f2f4", flexShrink: 0 }}>
            <button
              onClick={() => onStatusChange(audit.id, NEXT_STATUT[audit.statut])}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#2d9e5f,#1e6b42)",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {NEXT_LABEL[audit.statut]}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Tab: Liste des audits ────────────────────────────────────────────── */
function TabAudits({ audits, ncs, onAuditClick, onStatusChange, onNew }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");

  const filtered = audits.filter((a) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      a.titre.toLowerCase().includes(q) ||
      a.processus.toLowerCase().includes(q) ||
      a.auditeur.toLowerCase().includes(q) ||
      a.ref.toLowerCase().includes(q);
    const matchT = filterType === "Tous" || a.type === filterType;
    const matchS = filterStatut === "Tous" || a.statut === filterStatut;
    return matchQ && matchT && matchS;
  });

  return (
    <div style={{ padding: "16px 22px 40px" }}>
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f2f4",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#f3f5f7",
              border: "1px solid #e8eaed",
              borderRadius: 9,
              padding: "7px 12px",
              flex: 1,
              minWidth: 160,
              maxWidth: 280,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round">
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
                fontSize: 12,
                color: "#333",
                width: "100%",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tous", "Interne", "Externe"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  border: `1.5px solid ${filterType === f ? "#1e3d2f" : "#e8eaed"}`,
                  background: filterType === f ? "#1e3d2f" : "white",
                  color: filterType === f ? "white" : "#6b7280",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: "all 0.12s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tous", "planifie", "en_cours", "retard", "clos"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatut(f)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  border: `1.5px solid ${filterStatut === f ? "#1e3d2f" : "#e8eaed"}`,
                  background: filterStatut === f ? "#1e3d2f" : "white",
                  color: filterStatut === f ? "white" : "#6b7280",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: "all 0.12s",
                }}
              >
                {STATUTS[f]?.label || "Tous"}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
            <b style={{ color: "#374151" }}>{filtered.length}</b> audit{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                {["Référence", "Titre", "Processus", "Auditeur", "Type", "Date planifiée", "Statut", "Score", "NC"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      background: "#fafafa",
                      borderBottom: "1px solid #f0f2f4",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#d1d5db", fontSize: 13 }}>
                    Aucun audit trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const ncCount = ncs.filter((n) => n.auditId === a.id).length;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onAuditClick(a)}
                      style={{ borderBottom: "1px solid #f8f9fa", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fcf9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{a.ref}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 220 }}>{a.titre}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.processus}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.auditeur}</td>
                      <td style={{ padding: "10px 14px" }}><TypeBadge type={a.type} /></td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{fmtDate(a.datePlan)}</td>
                      <td style={{ padding: "10px 14px" }}><StatBadge statut={a.statut} /></td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: a.score >= 80 ? "#166534" : a.score >= 60 ? "#92400e" : a.score !== null ? "#991b1b" : "#9ca3af",
                        }}
                      >
                        {a.score !== null ? `${a.score}%` : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {ncCount > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "2px 8px", borderRadius: 20 }}>
                            {ncCount} NC
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: NC & Actions ────────────────────────────────────────────────── */
function TabNC({ audits, ncs, setNcs }) {
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterGrav, setFilterGrav] = useState("Tous");
  const [filterProcessus, setFilterProcessus] = useState("Tous");

  const processusList = ["Tous", ...new Set(audits.map(a => a.processus).filter(Boolean))];

  const getProcessusForNC = (auditId) => {
    const audit = audits.find(a => a.id === auditId);
    return audit?.processus || "—";
  };

  const filtered = ncs.filter((n) => {
    const matchS = filterStatut === "Tous" || n.statut === filterStatut;
    const matchG = filterGrav === "Tous" || n.gravite === filterGrav;
    const matchP = filterProcessus === "Tous" || getProcessusForNC(n.auditId) === filterProcessus;
    return matchS && matchG && matchP;
  });

  const advance = (id) => {
    const workflow = {
      ouvert: "en_cours",
      en_cours: "verification",
      verification: "clos",
    };
    setNcs((prev) =>
      prev.map((n) =>
        n.id === id && workflow[n.statut]
          ? { ...n, statut: workflow[n.statut] }
          : n,
      ),
    );
  };
  const advLabel = {
    ouvert: "Prendre en charge",
    en_cours: "Soumettre vérification",
    verification: "Clôturer",
  };

  return (
    <div style={{ padding: "16px 22px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Total NC", value: ncs.length, color: "#374151", bg: "#f3f4f6" },
          { label: "Ouvertes", value: ncs.filter((n) => n.statut === "ouvert").length, color: "#991b1b", bg: "#fee2e2" },
          { label: "En cours", value: ncs.filter((n) => n.statut === "en_cours").length, color: "#92400e", bg: "#fef3c7" },
          { label: "Clôturées", value: ncs.filter((n) => n.statut === "clos").length, color: "#065f46", bg: "#d1fae5" },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              background: "white",
              borderRadius: 10,
              border: `1px solid ${k.bg}`,
              padding: "10px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 28, color: k.color, lineHeight: 1 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f2f4",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Non-conformités & actions correctives</div>
          
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", alignSelf: "center" }}>Processus:</span>
            <select
              value={filterProcessus}
              onChange={(e) => setFilterProcessus(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: 7,
                border: "1.5px solid #e8eaed",
                background: "white",
                fontSize: 11,
                fontWeight: 600,
                color: "#374151",
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            >
              {processusList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {["Tous", "ouvert", "en_cours", "verification", "clos"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatut(f)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 7,
                  border: `1.5px solid ${filterStatut === f ? "#1e3d2f" : "#e8eaed"}`,
                  background: filterStatut === f ? "#1e3d2f" : "white",
                  color: filterStatut === f ? "white" : "#6b7280",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: "all 0.12s",
                }}
              >
                {NC_STATUTS[f]?.label || "Tous"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tous", "Critique", "Majeure", "Mineure"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterGrav(f)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 7,
                  border: `1.5px solid ${filterGrav === f ? "#374151" : "#e8eaed"}`,
                  background: filterGrav === f ? "#374151" : "white",
                  color: filterGrav === f ? "white" : "#6b7280",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  transition: "all 0.12s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr>
                {["Réf.", "Non-conformité", "Processus", "Clause", "Gravité", "Responsable", "Échéance", "Statut", "Action"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      background: "#fafafa",
                      borderBottom: "1px solid #f0f2f4",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#d1d5db", fontSize: 13 }}>
                    Aucune non-conformité.
                  </td>
                </tr>
              ) : (
                filtered.map((nc) => {
                  const gs = NC_GRAVITE[nc.gravite] || {};
                  const ss = NC_STATUTS[nc.statut] || {};
                  const canAdvance = nc.statut !== "clos";
                  const processusName = getProcessusForNC(nc.auditId);
                  return (
                    <tr key={nc.id} style={{ borderBottom: "1px solid #f8f9fa" }}>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{nc.ref}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 200 }}>{nc.titre}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#1e40af", fontWeight: 600 }}>
                        {processusName}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{nc.clause}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: gs.color,
                            background: gs.bg,
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {nc.gravite}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{nc.responsable}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(nc.dateLimit)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: ss.color,
                            background: ss.bg,
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {ss.label || nc.statut}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {canAdvance && (
                          <button
                            onClick={() => advance(nc.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 7,
                              border: "none",
                              background: "#1e3d2f",
                              color: "white",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                            }}
                          >
                            {advLabel[nc.statut]}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Wizard: Nouvel audit ──────────────────────────────────────────────── */
function NewAuditWizard({ onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    titre: "",
    processus: "",
    type: "Interne",
    auditeur: "",
    datePlan: "",
    dateFin: "",
    objectif: "",
  });
  const [clauses, setClauses] = useState([]);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleClause = (c) =>
    setClauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const validate0 = () => {
    const e = {};
    if (!form.titre.trim()) e.titre = true;
    if (!form.processus) e.processus = true;
    if (!form.datePlan) e.datePlan = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validate1 = () => {
    const e = {};
    if (!form.auditeur) e.auditeur = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validate0()) return;
    if (step === 1 && !validate1()) return;
    setStep((s) => s + 1);
  };

  const handleSave = () => {
    onSave({ ...form, clauses });
    onClose();
  };

  const STEPS = ["Informations", "Auditeur", "Clauses ISO", "Confirmer"];
  const inputStyle = (err) => ({
    width: "100%",
    padding: "9px 12px",
    borderRadius: 9,
    border: `1.5px solid ${err ? "#ef4444" : "#e8eaed"}`,
    background: err ? "#fff5f5" : "#f9fafb",
    fontSize: 13,
    outline: "none",
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    boxSizing: "border-box",
    color: "#111",
  });
  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    display: "block",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 18,
          width: "90%",
          maxWidth: 520,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f2f4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>Nouvel audit</div>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                border: "1px solid #e8eaed",
                borderRadius: 7,
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: i < step ? "#2d9e5f" : i === step ? "#1e3d2f" : "#f0f2f4",
                      color: i <= step ? "white" : "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      transition: "all 0.2s",
                    }}
                  >
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      color: i === step ? "#1e3d2f" : "#9ca3af",
                      fontWeight: i === step ? 700 : 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: i < step ? "#2d9e5f" : "#f0f2f4",
                      margin: "0 6px",
                      marginBottom: 14,
                      transition: "background 0.2s",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 24px", minHeight: 260 }}>
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Titre de l'audit *</label>
                <input
                  value={form.titre}
                  onChange={(e) => set("titre", e.target.value)}
                  placeholder="Ex : Audit système qualité Q2"
                  style={inputStyle(errors.titre)}
                />
                {errors.titre && <span style={{ fontSize: 10.5, color: "#ef4444", marginTop: 3, display: "block" }}>Champ requis</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Processus *</label>
                  <select
                    value={form.processus}
                    onChange={(e) => set("processus", e.target.value)}
                    style={{ ...inputStyle(errors.processus), appearance: "none" }}
                  >
                    <option value="">Sélectionner…</option>
                    {PROCESSUS_LIST.map((p) => (<option key={p}>{p}</option>))}
                  </select>
                  {errors.processus && <span style={{ fontSize: 10.5, color: "#ef4444", marginTop: 3, display: "block" }}>Champ requis</span>}
                </div>
                <div>
                  <label style={labelStyle}>Type d'audit</label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                    style={{ ...inputStyle(false), appearance: "none" }}
                  >
                    <option>Interne</option>
                    <option>Externe</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date planifiée *</label>
                  <input
                    type="date"
                    value={form.datePlan}
                    onChange={(e) => set("datePlan", e.target.value)}
                    style={inputStyle(errors.datePlan)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date de fin prévue</label>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={(e) => set("dateFin", e.target.value)}
                    style={inputStyle(false)}
                  />
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Auditeur responsable *</label>
                <select
                  value={form.auditeur}
                  onChange={(e) => set("auditeur", e.target.value)}
                  style={{ ...inputStyle(errors.auditeur), appearance: "none" }}
                >
                  <option value="">Sélectionner…</option>
                  {AUDITEURS_LIST.map((a) => (<option key={a}>{a}</option>))}
                </select>
                {errors.auditeur && <span style={{ fontSize: 10.5, color: "#ef4444", marginTop: 3, display: "block" }}>Champ requis</span>}
              </div>
              <div>
                <label style={labelStyle}>Objectif de l'audit</label>
                <textarea
                  value={form.objectif}
                  onChange={(e) => set("objectif", e.target.value)}
                  rows={4}
                  placeholder="Décrire l'objectif principal de cet audit…"
                  style={{ ...inputStyle(false), resize: "vertical", lineHeight: 1.5 }}
                />
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                Sélectionnez les clauses ISO 9001 à vérifier lors de cet audit :
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {CLAUSES_ISO.map((c) => (
                  <div
                    key={c}
                    onClick={() => toggleClause(c)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${clauses.includes(c) ? "#2d9e5f" : "#e8eaed"}`,
                      background: clauses.includes(c) ? "#f0fdf4" : "white",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: `2px solid ${clauses.includes(c) ? "#2d9e5f" : "#d1d5db"}`,
                        background: clauses.includes(c) ? "#2d9e5f" : "white",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {clauses.includes(c) && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 10.5, color: "#374151", fontWeight: clauses.includes(c) ? 700 : 400 }}>{c}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
                {clauses.length} clause{clauses.length !== 1 ? "s" : ""} sélectionnée{clauses.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 10 }}>Récapitulatif</div>
                {[
                  { label: "Titre", value: form.titre },
                  { label: "Processus", value: form.processus },
                  { label: "Type", value: form.type },
                  { label: "Auditeur", value: form.auditeur },
                  { label: "Date planif.", value: fmtDate(form.datePlan) },
                  { label: "Clauses", value: clauses.length > 0 ? `${clauses.length} clauses sélectionnées` : "Non définies" },
                ].map((f) => (
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #dcfce7" }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{f.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{f.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f2f4", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <button
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "1.5px solid #e8eaed",
              background: "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: "#6b7280",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            {step === 0 ? "Annuler" : "Précédent"}
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              style={{
                padding: "9px 24px",
                borderRadius: 9,
                border: "none",
                background: "linear-gradient(135deg,#2d9e5f,#1e6b42)",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleSave}
              style={{
                padding: "9px 24px",
                borderRadius: 9,
                border: "none",
                background: "linear-gradient(135deg,#2d9e5f,#1e6b42)",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Créer l'audit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ──────────────────────────────────────────────────── */
export default function AuditsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [audits, setAudits] = useState(INIT_AUDITS);
  const [ncs, setNcs] = useState(INIT_NC);
  const [showWizard, setShowWizard] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(getUnreadCount());
  }, []);

  const handleNewAudit = (form) => {
    const id = Date.now();
    const count = audits.length + 1;
    setAudits((prev) => [
      ...prev,
      {
        id,
        ref: `AUD-2026-${String(count).padStart(3, "0")}`,
        titre: form.titre,
        processus: form.processus,
        type: form.type,
        auditeur: form.auditeur,
        datePlan: form.datePlan,
        dateFin: form.dateFin || null,
        statut: "planifie",
        score: null,
        ncIds: [],
      },
    ]);
  };

  const handleStatusChange = (auditId, newStatut) => {
    setAudits((prev) =>
      prev.map((a) =>
        a.id === auditId
          ? {
              ...a,
              statut: newStatut,
              ...(newStatut === "clos"
                ? { score: Math.floor(Math.random() * 25) + 70 }
                : {}),
            }
          : a,
      ),
    );
    if (selectedAudit?.id === auditId)
      setSelectedAudit((prev) => ({ ...prev, statut: newStatut }));
  };

  const TABS = [
    "Tableau de bord",
    "Programme & Calendrier",
    "Audits",
    "NC & Actions",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eaf5eb",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      {showWizard && <NewAuditWizard onClose={() => setShowWizard(false)} onSave={handleNewAudit} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      {selectedAudit && (
        <AuditDrawer
          audit={selectedAudit}
          ncs={ncs}
          onClose={() => setSelectedAudit(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── Topbar ── */}
      <div
        style={{
          height: 56,
          background: "#fff",
          borderBottom: "1px solid #e8ede9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          gap: 16,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#111", lineHeight: 1 }}>
            Gestion des audits
          </div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>ISO 9001:2015 § 9.2 — Audit interne</div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            background: "#f3f5f7",
            borderRadius: 8,
            padding: 3,
            overflow: "hidden",
          }}
        >
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                padding: "4px 11px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                background: tab === i ? "white" : "transparent",
                color: tab === i ? "#1e3d2f" : "#6b7280",
                boxShadow: tab === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.12s",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowWizard(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#1e3d2f",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nouvel audit
          </button>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              style={{
                width: 32,
                height: 32,
                border: "1px solid #e8eaed",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    background: "#ef4444",
                    borderRadius: "50%",
                    border: "2px solid white",
                  }}
                />
              )}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#f3f5f7",
              border: "1px solid #e8eaed",
              borderRadius: 8,
              padding: "3px 8px 3px 3px",
              cursor: "pointer",
            }}
            onClick={() => navigate("/parametres")}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: 9,
                color: "#152b21",
              }}
            >
              AZ
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>Atir Zineb</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {tab === 0 && <TabDashboard audits={audits} ncs={ncs} />}
      {tab === 1 && <TabProgrammeCalendrier audits={audits} />}
      {tab === 2 && (
        <TabAudits
          audits={audits}
          ncs={ncs}
          onAuditClick={setSelectedAudit}
          onStatusChange={handleStatusChange}
          onNew={() => setShowWizard(true)}
        />
      )}
      {tab === 3 && <TabNC audits={audits} ncs={ncs} setNcs={setNcs} />}
    </div>
  );
}