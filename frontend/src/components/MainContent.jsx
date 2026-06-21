import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";

const ALL_DATA = [
  {
    id: 1,
    nom: "Gestion PFE",
    responsable: "Haddadou",
    tel: "(225) 555-0118",
    email: "haddadou@esi.dz",
    dept: "Soutenances",
    status: "actif",
  },
  {
    id: 2,
    nom: "Gestion PFE",
    responsable: "Haddadou",
    tel: "(252) 555-0126",
    email: "haddadou@esi.dz",
    dept: "Soutenances",
    status: "actif",
  },
  {
    id: 3,
    nom: "Audit Labo",
    responsable: "Bensalem",
    tel: "(629) 555-0129",
    email: "bensalem@esi.dz",
    dept: "Laboratoire",
    status: "revue",
  },
  {
    id: 4,
    nom: "Contrôle Qualité",
    responsable: "Meziani",
    tel: "(704) 555-0127",
    email: "meziani@esi.dz",
    dept: "Qualité",
    status: "actif",
  },
  {
    id: 5,
    nom: "Gestion PFE",
    responsable: "Haddadou",
    tel: "(704) 555-0128",
    email: "haddadou@esi.dz",
    dept: "Soutenances",
    status: "inactif",
  },
  {
    id: 6,
    nom: "Formation",
    responsable: "Kaci",
    tel: "(312) 555-0198",
    email: "kaci@esi.dz",
    dept: "Laboratoire",
    status: "actif",
  },
  {
    id: 7,
    nom: "Audit Interne",
    responsable: "Meziani",
    tel: "(501) 555-0142",
    email: "meziani@esi.dz",
    dept: "Qualité",
    status: "revue",
  },
];

const DEPT_STYLE = {
  Soutenances: { color: "#166534", bg: "#dcfce7", dot: "#22c55e" },
  Laboratoire: { color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  Qualité: { color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
};

const STATUS_STYLE = {
  actif: { color: "#166534", bg: "#dcfce7", label: "Actif" },
  revue: { color: "#92400e", bg: "#fef3c7", label: "En revue" },
  inactif: { color: "#6b7280", bg: "#f3f4f6", label: "Inactif" },
};

const DEPT_COLORS = {
  Soutenances: "#22c55e",
  Laboratoire: "#3b82f6",
  Qualité: "#f59e0b",
};

function Badge({ text, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "clamp(9.5px, 0.85vw, 11px)",
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: style.dot || style.color,
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}

function ConfirmModal({ nom, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 600,
        padding: 16,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "28px 28px 24px",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          animation: "fadeUp 0.2s ease",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#111",
            marginBottom: 6,
          }}
        >
          Supprimer «&nbsp;{nom}&nbsp;» ?
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            lineHeight: 1.6,
            marginBottom: 22,
          }}
        >
          Cette action est définitive. Le processus sera supprimé de façon
          permanente.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "none",
              background: "#ef4444",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "white",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProcessusList() {
  const navigate = useNavigate();
  const [data, setData] = useState(ALL_DATA);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Tous");
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  const depts = ["Tous", "Soutenances", "Laboratoire", "Qualité"];

  // Calculate statistics for charts
  const totalProcessus = data.length;
  const activeProcessus = data.filter((d) => d.status === "actif").length;
  const inactiveProcessus = data.filter((d) => d.status === "inactif").length;
  const inReviewProcessus = data.filter((d) => d.status === "revue").length;

  const deptStats = {};
  data.forEach((d) => {
    deptStats[d.dept] = (deptStats[d.dept] || 0) + 1;
  });

  const filtered = data
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        (!q ||
          r.nom.toLowerCase().includes(q) ||
          r.responsable.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)) &&
        (deptFilter === "Tous" || r.dept === deptFilter)
      );
    })
    .sort((a, b) =>
      !sortField
        ? 0
        : sortAsc
          ? String(a[sortField]).localeCompare(String(b[sortField]))
          : String(b[sortField]).localeCompare(String(a[sortField]))
    );

  const toggleSort = (f) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else {
      setSortField(f);
      setSortAsc(true);
    }
  };

  const toggleRow = (id) =>
    setSelectedRows((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  const toggleAll = () =>
    setSelectedRows((p) =>
      p.length === filtered.length ? [] : filtered.map((r) => r.id)
    );

  const confirmDelete = () => {
    setData((p) => p.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const SortArrow = ({ f }) => (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      style={{ marginLeft: 3, opacity: sortField === f ? 1 : 0.28 }}
    >
      <path
        d={sortField === f && !sortAsc ? "M1.5 6l3-4 3 4" : "M1.5 3l3 4 3-4"}
        stroke={sortField === f ? "#1e3d2f" : "#9ca3af"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Get max value for bar chart
  const maxDeptValue = Math.max(...Object.values(deptStats), 1);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes growBar {
          from { height: 0; }
          to   { height: var(--bar-height); }
        }

        .mc-wrap {
          padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px;
          position: relative;
          z-index: 1;
          min-height: 100vh;
          background: #eaf5eb;
        }

        .pg-header {
          margin-bottom: clamp(16px,2vw,22px);
          animation: fadeUp 0.3s ease 0.05s both;
        }
        .pg-title {
          font-family: 'Outfit',sans-serif;
          font-weight: 900;
          font-size: clamp(20px,2.5vw,28px);
          color: #111;
          line-height: 1.1;
        }
        .pg-sub {
          font-size: clamp(11px,1.05vw,13px);
          color: #9ca3af;
          margin-top: 4px;
        }

        /* ── Charts Section ── */
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(14px,1.5vw,20px);
          margin-bottom: clamp(16px,2vw,22px);
        }

        .chart-card {
          background: #ffffff;
          border-radius: clamp(12px,1.3vw,16px);
          padding: clamp(16px,1.5vw,22px) clamp(18px,1.8vw,24px);
          border: 1px solid #e8ede9;
          animation: fadeUp 0.4s ease both;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .chart-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .chart-title {
          font-family: 'Outfit',sans-serif;
          font-weight: 700;
          font-size: clamp(14px,1.2vw,16px);
          color: #111;
          margin-bottom: 4px;
        }
        .chart-sub {
          font-size: clamp(11px,0.95vw,12px);
          color: #9ca3af;
          margin-bottom: clamp(14px,1.2vw,18px);
        }

        .status-donut {
          display: flex;
          align-items: center;
          gap: clamp(20px,2vw,32px);
          justify-content: center;
          flex-wrap: wrap;
        }
        .donut-container {
          position: relative;
          width: clamp(120px,12vw,160px);
          height: clamp(120px,12vw,160px);
        }
        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .donut-number {
          font-family: 'Outfit',sans-serif;
          font-weight: 900;
          font-size: clamp(24px,2.5vw,32px);
          color: #111;
          line-height: 1;
        }
        .donut-label {
          font-size: clamp(9px,0.8vw,11px);
          color: #6b7280;
        }

        .status-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(12px,1vw,13px);
          color: #374151;
        }
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-value {
          margin-left: auto;
          font-weight: 700;
          color: #111;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: clamp(12px,1.2vw,20px);
          height: clamp(100px,10vw,140px);
          padding-top: 8px;
        }
        .bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .bar {
          width: 100%;
          max-width: 50px;
          border-radius: 6px 6px 0 0;
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 4px;
          --bar-height: 0px;
          animation: growBar 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .bar-value {
          font-family: 'Outfit',sans-serif;
          font-weight: 700;
          font-size: clamp(12px,1vw,14px);
          color: #111;
        }
        .bar-label {
          font-size: clamp(10px,0.8vw,11px);
          color: #6b7280;
          text-align: center;
        }

        /* ── Main Card ── */
        .main-card {
          background: #ffffff;
          border: none;
          border-radius: clamp(14px,1.5vw,18px);
          box-shadow: none;
          overflow: hidden;
          animation: fadeUp 0.4s ease 0.15s both;
        }

        .card-top {
          padding: clamp(14px,1.5vw,20px) clamp(14px,1.5vw,22px) clamp(12px,1.2vw,16px);
          border-bottom: 1px solid #f0f2f4;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .f-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f3f5f7;
          border: 1px solid #e8eaed;
          border-radius: 10px;
          padding: clamp(6px,0.8vw,8px) clamp(10px,1.1vw,13px);
          transition: border-color 0.18s, box-shadow 0.18s;
          flex: 1;
          min-width: 140px;
        }
        .f-search:focus-within {
          border-color: #5ecf7a;
          box-shadow: 0 0 0 3px rgba(94,207,122,0.12);
          background: white;
        }
        .f-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: clamp(11px,1vw,12.5px);
          color: #333;
          width: 100%;
          font-family: 'Plus Jakarta Sans',sans-serif;
        }
        .f-search input::placeholder {
          color: #c4c8d1;
        }

        .dtab {
          padding: clamp(5px,0.7vw,7px) clamp(10px,1.1vw,14px);
          border-radius: 9px;
          border: 1.5px solid #e8eaed;
          background: white;
          cursor: pointer;
          font-size: clamp(11px,1vw,12px);
          font-weight: 600;
          color: #6b7280;
          transition: all 0.15s;
          white-space: nowrap;
          font-family: 'Plus Jakarta Sans',sans-serif;
        }
        .dtab:hover { background: #f3f5f7; }
        .dtab.active {
          background: #1e3d2f;
          border-color: #1e3d2f;
          color: white;
        }

        .bulk-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #1e3d2f;
          border-radius: 10px;
          padding: 10px 16px;
          margin: 0 clamp(14px,1.5vw,22px) 14px;
          animation: fadeUp 0.2s ease;
        }

        .tbl-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
        }

        thead th {
          padding: clamp(9px,1vw,11px) clamp(12px,1.2vw,16px);
          text-align: left;
          font-size: clamp(9.5px,0.9vw,10.5px);
          font-weight: 700;
          color: #9ca3af;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          transition: color 0.14s;
          font-family: 'Plus Jakarta Sans',sans-serif;
          background: #ffffff;
        }
        thead th:hover { color: #1e3d2f; }
        thead th:first-child,
        tbody td:first-child {
          padding-left: clamp(14px,1.5vw,22px);
          width: 40px;
        }

        tbody tr {
          border-top: 1px solid #f0f2f4;
          transition: background 0.12s;
          animation: fadeUp 0.25s ease both;
        }
        tbody tr:hover { background: #f8fcf9; }
        tbody tr.selected { background: #f0fdf4 !important; }

        tbody td {
          padding: clamp(10px,1.1vw,13px) clamp(12px,1.2vw,16px);
          font-size: clamp(11.5px,1.05vw,13px);
          color: #374151;
          font-family: 'Plus Jakarta Sans',sans-serif;
          white-space: nowrap;
        }

        td.nom-cell {
          font-weight: 600;
          color: #111;
        }

        .del-btn {
          width: clamp(26px,2.5vw,30px);
          height: clamp(26px,2.5vw,30px);
          border-radius: 8px;
          border: 1.5px solid #fee2e2;
          background: #fef2f2;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.14s;
        }
        .del-btn:hover {
          background: #fecaca;
          border-color: #fca5a5;
          transform: scale(1.08);
        }

        .empty-state {
          padding: 52px 20px;
          text-align: center;
          color: #d1d5db;
          font-size: clamp(12px,1.1vw,14px);
        }

        input[type=checkbox] {
          width: 14px;
          height: 14px;
          cursor: pointer;
          accent-color: #1e3d2f;
        }

        .footer {
          padding: clamp(11px,1.2vw,14px) clamp(14px,1.5vw,22px);
          border-top: 1px solid #f0f2f4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .mc-wrap { padding: 70px 14px 48px; }
          .charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {deleteTarget && (
        <ConfirmModal
          nom={deleteTarget.nom}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="mc-wrap">
        {/* ── Topbar ── */}
        <Topbar 
          title="Processus"
          showBack={false}
          userName="Atir Zineb"
          userRole="Préparateur"
          userInitials="AZ"
          showNotifications={true}
        />

        {/* ── Page header ── */}
        <div className="pg-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <div className="pg-title">Processus</div>
              <div className="pg-sub">
                Gérez et visualisez tous les processus du système qualité
              </div>
            </div>
            <button
              onClick={() => navigate("/processus/new")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #2d9e5f, #1e6b42)",
                border: "none",
                borderRadius: 11,
                padding: "clamp(8px,1vw,11px) clamp(13px,1.4vw,18px)",
                cursor: "pointer",
                color: "white",
                fontSize: "clamp(11.5px,1.05vw,13px)",
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                boxShadow: "0 4px 14px rgba(45,158,95,0.35)",
                transition: "transform 0.15s, box-shadow 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(45,158,95,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(45,158,95,0.35)";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouveau processus
            </button>
          </div>
        </div>

        {/* ── Charts Section ── */}
        <div className="charts-grid">
          {/* Chart 1: Status Distribution (Donut + Legend) */}
          <div className="chart-card" style={{ animationDelay: "0.05s" }}>
            <div className="chart-title">Répartition par Statut</div>
            <div className="chart-sub">Actif, En revue, Inactif</div>
            <div className="status-donut">
              <div className="donut-container">
                <svg width="100%" height="100%" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#dcfce7"
                    strokeWidth="18"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="18"
                    strokeDasharray={`${(activeProcessus / totalProcessus) * 301.6} 301.6`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="18"
                    strokeDasharray={`${(inReviewProcessus / totalProcessus) * 301.6} 301.6`}
                    strokeDashoffset={`-${(activeProcessus / totalProcessus) * 301.6}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="18"
                    strokeDasharray={`${(inactiveProcessus / totalProcessus) * 301.6} 301.6`}
                    strokeDashoffset={`-${((activeProcessus + inReviewProcessus) / totalProcessus) * 301.6}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="donut-center">
                  <div className="donut-number">{totalProcessus}</div>
                  <div className="donut-label">Total</div>
                </div>
              </div>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#22c55e" }} />
                  <span>Actif</span>
                  <span className="legend-value">{activeProcessus}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#f59e0b" }} />
                  <span>En revue</span>
                  <span className="legend-value">{inReviewProcessus}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#6b7280" }} />
                  <span>Inactif</span>
                  <span className="legend-value">{inactiveProcessus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Department Distribution (Bar Chart) */}
          <div className="chart-card" style={{ animationDelay: "0.1s" }}>
            <div className="chart-title">Répartition par Département</div>
            <div className="chart-sub">Soutenances, Laboratoire, Qualité</div>
            <div className="bar-chart">
              {Object.entries(deptStats).map(([dept, count]) => {
                const heightPercent = (count / maxDeptValue) * 100;
                const color = DEPT_COLORS[dept] || "#9ca3af";
                return (
                  <div key={dept} className="bar-item">
                    <div
                      className="bar"
                      style={{
                        height: `${Math.max(heightPercent, 8)}%`,
                        background: color,
                        '--bar-height': `${Math.max(heightPercent, 8)}%`,
                      }}
                    />
                    <div className="bar-value">{count}</div>
                    <div className="bar-label">{dept}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="main-card">
          <div className="card-top">
            <div className="filter-bar" style={{ flex: 1 }}>
              <div className="f-search">
                <svg
                  width="13"
                  height="13"
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
                  placeholder="Rechercher un processus…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <span
                    onClick={() => setSearch("")}
                    style={{
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </span>
                )}
              </div>
              {depts.map((d) => (
                <button
                  key={d}
                  className={`dtab ${deptFilter === d ? "active" : ""}`}
                  onClick={() => setDeptFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div
            style={{
              padding: "clamp(8px,1vw,10px) clamp(14px,1.5vw,22px) 0",
              fontSize: "clamp(10.5px,1vw,12px)",
              color: "#9ca3af",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            <span style={{ fontWeight: 700, color: "#374151" }}>
              {filtered.length}
            </span>{" "}
            résultat{filtered.length !== 1 ? "s" : ""}
            {search && (
              <span>
                {" "}
                pour «&nbsp;<em style={{ color: "#1e3d2f" }}>{search}</em>
                &nbsp;»
              </span>
            )}
          </div>

          {/* Bulk bar */}
          {selectedRows.length > 0 && (
            <div style={{ padding: "8px clamp(14px,1.5vw,22px) 0" }}>
              <div className="bulk-bar">
                <span
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "clamp(11px,1vw,12px)",
                    fontWeight: 600,
                  }}
                >
                  {selectedRows.length} sélectionné
                  {selectedRows.length > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => {
                    setData((p) =>
                      p.filter((r) => !selectedRows.includes(r.id))
                    );
                    setSelectedRows([]);
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "clamp(11px,1vw,12px)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                  Supprimer la sélection
                </button>
                <button
                  onClick={() => setSelectedRows([])}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 10px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "clamp(11px,1vw,12px)",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          <div className="tbl-scroll" style={{ marginTop: 10 }}>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d1d5db"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5L21 21" />
                  </svg>
                </div>
                Aucun processus trouvé.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th onClick={toggleAll}>
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.length === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={toggleAll}
                      />
                    </th>
                    {[
                      ["nom", "Nom processus"],
                      ["responsable", "Responsable"],
                      ["tel", "Téléphone"],
                      ["email", "Email"],
                      ["dept", "Département"],
                    ].map(([f, l]) => (
                      <th key={f} onClick={() => toggleSort(f)}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {l}
                          <SortArrow f={f} />
                        </span>
                      </th>
                    ))}
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const ds = DEPT_STYLE[row.dept] || {
                      color: "#555",
                      bg: "#f3f4f6",
                      dot: "#9ca3af",
                    };
                    const ss = STATUS_STYLE[row.status];
                    const isSel = selectedRows.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={isSel ? "selected" : ""}
                        style={{ animationDelay: `${i * 0.04}s` }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleRow(row.id)}
                          />
                        </td>
                        <td
                          className="nom-cell"
                          style={{
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "2px",
                          }}
                          onClick={() => navigate(`/fiche-processus/${row.id}`)}
                        >
                          {row.nom}
                        </td>
                        <td>{row.responsable}</td>
                        <td style={{ color: "#6b7280" }}>{row.tel}</td>
                        <td>
                          <a
                            href={`mailto:${row.email}`}
                            style={{
                              color: "#1e3d2f",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            {row.email}
                          </a>
                        </td>
                        <td>
                          <Badge
                            text={row.dept}
                            style={{
                              color: ds.color,
                              background: ds.bg,
                              dot: ds.dot,
                            }}
                          />
                        </td>
                        <td>
                          <Badge
                            text={ss.label}
                            style={{
                              color: ss.color,
                              background: ss.bg,
                              dot: ss.color,
                            }}
                          />
                        </td>
                        <td>
                          <button
                            className="del-btn"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="footer">
            <span
              style={{
                fontSize: "clamp(10.5px,1vw,12px)",
                color: "#9ca3af",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Affichage de <b style={{ color: "#374151" }}>{filtered.length}</b>{" "}
              / <b style={{ color: "#374151" }}>{data.length}</b> processus
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1.5px solid #1e3d2f",
                  background: "#1e3d2f",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "clamp(11px,1vw,12px)",
                  fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                1
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}