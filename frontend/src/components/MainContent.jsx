import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "./NotificationsPanel.jsx";
import { api, getCurrentUser } from "../lib/api";

/* ── Type-based categorisation (maps backend TypeProcessus enum) ── */
const TYPE_STYLE = {
  strategique:  { color: "#854d0e", bg: "#fef9c3", dot: "#ca8a04" },
  operationnel: { color: "#166534", bg: "#dcfce7", dot: "#22c55e" },
  support:      { color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
};
const TYPE_LABEL = {
  strategique: "Stratégique",
  operationnel: "Opérationnel",
  support: "Support",
};

/* ── Statut display (maps backend StatutProcessus enum) ── */
const STATUS_STYLE = {
  non_demarre:  { color: "#6b7280", bg: "#f3f4f6", label: "Non démarré" },
  en_cours:     { color: "#92400e", bg: "#fef3c7", label: "En cours" },
  conforme:     { color: "#166534", bg: "#dcfce7", label: "Conforme" },
  non_conforme: { color: "#991b1b", bg: "#fee2e2", label: "Non conforme" },
  suspendu:     { color: "#6b7280", bg: "#f3f4f6", label: "Suspendu" },
};

/* ── Normalise backend ProcessusResponse → flat UI row ── */
function normalize(p) {
  return {
    id:          p.id,
    nom:         p.nom,
    code:        p.code || "",
    responsable: p.pilote ? `${p.pilote.prenom} ${p.pilote.nom}` : "—",
    tel:         p.pilote?.telephone || "—",
    email:       p.pilote?.email    || "—",
    dept:        p.type  || null,
    statut:      p.statut,
    score:       p.score_maturite,
  };
}

const KPI_ICONS = {
  total: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1e3d2f"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  ),
  soutenances: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22c55e"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  laboratoire: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#3b82f6"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M9 3H7v10l-4 5h18l-4-5V3h-2M9 3h6M9 3v4m6-4v4" />
    </svg>
  ),
  qualite: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
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

function KpiCard({ label, value, icon, color, sub, delay }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (isNaN(end)) return;
    const step = Math.ceil(end / 18);
    const timer = setTimeout(() => {
      const id = setInterval(() => {
        start += step;
        if (start >= end) {
          setDisplayed(end);
          clearInterval(id);
        } else setDisplayed(start);
      }, 35);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "clamp(12px,1.3vw,16px)",
        padding: "clamp(14px,1.5vw,18px) clamp(14px,1.5vw,20px)",
        boxShadow: `0 1px 6px rgba(0,0,0,0.06)`,
        display: "flex",
        alignItems: "center",
        gap: "clamp(10px,1.1vw,14px)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        animation: `fadeUp 0.4s ease ${delay}ms both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `0 1px 6px rgba(0,0,0,0.06)`;
      }}
    >
      <div
        style={{
          width: "clamp(38px,3.5vw,46px)",
          height: "clamp(38px,3.5vw,46px)",
          borderRadius: "clamp(10px,1vw,13px)",
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontWeight: 900,
            fontSize: "clamp(20px,2vw,26px)",
            color: "#111",
            lineHeight: 1,
          }}
        >
          {displayed}
        </div>
        <div
          style={{
            fontSize: "clamp(10px,0.95vw,12px)",
            fontWeight: 600,
            color: "#6b7280",
            marginTop: 3,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: "clamp(9.5px,0.85vw,10.5px)",
              color,
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
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

export default function MainContent({ collapsed }) {
  const navigate = useNavigate();
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState(null);

  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("Tous");
  const [sortField, setSortField]     = useState(null);
  const [sortAsc, setSortAsc]         = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [viewMode, setViewMode]       = useState("table");
  const [showNotifs, setShowNotifs]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());

  /* Fetch on mount */
  useEffect(() => {
    setLoading(true);
    api.get("/processus")
      .then((items) => setData((items || []).map(normalize)))
      .catch((err)  => setApiError(err.message))
      .finally(()   => setLoading(false));
  }, []);

  const types = ["Tous", "strategique", "operationnel", "support"];

  const filtered = data
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        (!q ||
          r.nom.toLowerCase().includes(q) ||
          r.responsable.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)) &&
        (typeFilter === "Tous" || r.dept === typeFilter)
      );
    })
    .sort((a, b) =>
      !sortField
        ? 0
        : sortAsc
          ? a[sortField].localeCompare(b[sortField])
          : b[sortField].localeCompare(a[sortField]),
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
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const toggleAll = () =>
    setSelectedRows((p) =>
      p.length === filtered.length ? [] : filtered.map((r) => r.id),
    );
  const confirmDelete = async () => {
    try {
      await api.delete(`/processus/${deleteTarget.id}`);
      setData((p) => p.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      alert(`Erreur lors de la suppression : ${err.message}`);
    }
    setDeleteTarget(null);
  };

  const bulkDelete = async () => {
    try {
      await Promise.all(selectedRows.map((id) => api.delete(`/processus/${id}`)));
      setData((p) => p.filter((r) => !selectedRows.includes(r.id)));
      setSelectedRows([]);
    } catch (err) {
      alert(`Erreur lors de la suppression : ${err.message}`);
    }
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

  return (
    <>
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ══════════════════════════════════════════
           WRAP — fond vert solide, couvre tout
        ══════════════════════════════════════════ */
        .mc-wrap {
          padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px;
          position: relative;
          z-index: 1;
          min-height: 100vh;
          background: #eaf5eb;
        }

        /* ══════════════════════════════════════════
           TOPBAR — fond blanc opaque, pas de backdrop
        ══════════════════════════════════════════ */
        .topbar {
          display: flex; align-items: center; justify-content: flex-end;
          background: #ffffff;
          border: 1px solid #e8ede9;
          border-radius: clamp(12px,1.3vw,16px);
          height: clamp(52px,6vw,62px);
          padding: 0 clamp(12px,1.5vw,20px);
          margin-bottom: clamp(16px,2vw,24px);
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          animation: fadeUp 0.3s ease; gap: 10px;
        }
        .t-right {
          display: flex;
          align-items: center;
          gap: clamp(6px,0.9vw,12px);
          flex-shrink: 0;
          margin-left: auto;
        }
        .icon-btn {
          height: clamp(30px,3vw,36px); min-width: clamp(30px,3vw,36px);
          border-radius: 10px; border: 1px solid #e8eaed; background: white;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 5px; padding: 0 10px; position: relative; transition: all 0.15s;
        }
        .icon-btn:hover { background: #f3f5f7; transform: translateY(-1px); }
        .n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .u-chip {
          display: flex; align-items: center; gap: 8px;
          background: #f3f5f7; border: 1px solid #e8eaed;
          border-radius: 11px; padding: 4px 10px 4px 5px;
          cursor: pointer; transition: all 0.15s;
        }
        .u-chip:hover { background: #ebeef1; transform: translateY(-1px); }
        .u-av {
          width: clamp(26px,2.5vw,30px); height: clamp(26px,2.5vw,30px);
          border-radius: 8px;
          background: linear-gradient(135deg, #5ecf7a, #2d9e5f);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit',sans-serif; font-weight: 900;
          font-size: clamp(9px,0.85vw,10px); color: #152b21;
        }
        .pg-header { margin-bottom: clamp(16px,2vw,22px); animation: fadeUp 0.3s ease 0.05s both; }
        .pg-title { font-family: 'Outfit',sans-serif; font-weight: 900; font-size: clamp(20px,2.5vw,28px); color: #111; line-height: 1.1; }
        .pg-sub { font-size: clamp(11px,1.05vw,13px); color: #9ca3af; margin-top: 4px; }

        .kpi-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: clamp(10px,1.2vw,14px); margin-bottom: clamp(16px,2vw,22px);
        }

        /* ══════════════════════════════════════════
           MAIN CARD — blanc opaque, ZERO shadow/border
        ══════════════════════════════════════════ */
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
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
        .f-search {
          display: flex; align-items: center; gap: 8px;
          background: #f3f5f7; border: 1px solid #e8eaed;
          border-radius: 10px; padding: clamp(6px,0.8vw,8px) clamp(10px,1.1vw,13px);
          transition: border-color 0.18s, box-shadow 0.18s;
          flex: 1; min-width: 140px;
        }
        .f-search:focus-within { border-color: #5ecf7a; box-shadow: 0 0 0 3px rgba(94,207,122,0.12); background: white; }
        .f-search input { border:none; background:transparent; outline:none; font-size:clamp(11px,1vw,12.5px); color:#333; width:100%; font-family:'Plus Jakarta Sans',sans-serif; }
        .f-search input::placeholder { color: #c4c8d1; }
        .dtab {
          padding: clamp(5px,0.7vw,7px) clamp(10px,1.1vw,14px);
          border-radius: 9px; border: 1.5px solid #e8eaed; background: white;
          cursor: pointer; font-size: clamp(11px,1vw,12px); font-weight: 600; color: #6b7280;
          transition: all 0.15s; white-space: nowrap;
          font-family: 'Plus Jakarta Sans',sans-serif;
        }
        .dtab:hover { background: #f3f5f7; }
        .dtab.active { background: #1e3d2f; border-color: #1e3d2f; color: white; }
        .view-toggle { display: flex; background: #f3f5f7; border-radius: 9px; padding: 3px; gap: 2px; }
        .vt-btn {
          padding: 5px 7px; border-radius: 7px; border: none;
          cursor: pointer; background: transparent;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .vt-btn.on { background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .bulk-bar {
          display: flex; align-items: center; gap: 10px;
          background: #1e3d2f; border-radius: 10px;
          padding: 10px 16px; margin: 0 clamp(14px,1.5vw,22px) 14px;
          animation: fadeUp 0.2s ease;
        }
        .tbl-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 520px; }
        thead th {
          padding: clamp(9px,1vw,11px) clamp(12px,1.2vw,16px);
          text-align: left; font-size: clamp(9.5px,0.9vw,10.5px);
          font-weight: 700; color: #9ca3af;
          letter-spacing: 0.9px; text-transform: uppercase;
          cursor: pointer; user-select: none; white-space: nowrap;
          transition: color 0.14s; font-family: 'Plus Jakarta Sans',sans-serif;
          background: #ffffff;
        }
        thead th:hover { color: #1e3d2f; }
        thead th:first-child, tbody td:first-child { padding-left: clamp(14px,1.5vw,22px); width: 40px; }
        tbody tr { border-top: 1px solid #f0f2f4; transition: background 0.12s; animation: fadeUp 0.25s ease both; }
        tbody tr:hover { background: #f8fcf9; }
        tbody tr.selected { background: #f0fdf4 !important; }
        tbody td { padding: clamp(10px,1.1vw,13px) clamp(12px,1.2vw,16px); font-size: clamp(11.5px,1.05vw,13px); color: #374151; font-family: 'Plus Jakarta Sans',sans-serif; white-space: nowrap; }
        td.nom-cell { font-weight: 600; color: #111; }
        .del-btn {
          width: clamp(26px,2.5vw,30px); height: clamp(26px,2.5vw,30px);
          border-radius: 8px; border: 1.5px solid #fee2e2; background: #fef2f2;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.14s;
        }
        .del-btn:hover { background: #fecaca; border-color: #fca5a5; transform: scale(1.08); }
        .empty-state { padding: 52px 20px; text-align: center; color: #d1d5db; font-size: clamp(12px,1.1vw,14px); }
        .cards-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: clamp(10px,1.2vw,14px);
          padding: clamp(14px,1.5vw,18px) clamp(14px,1.5vw,22px);
        }
        .proc-card {
          border: 1.5px solid #f0f2f4; border-radius: clamp(11px,1.2vw,14px);
          padding: clamp(12px,1.3vw,16px) clamp(13px,1.4vw,18px);
          background: white; transition: all 0.18s; cursor: default;
          animation: fadeUp 0.3s ease both;
        }
        .proc-card:hover { border-color: #a8e6b8; box-shadow: 0 6px 20px rgba(94,207,122,0.12); transform: translateY(-2px); }
        input[type=checkbox] { width: 14px; height: 14px; cursor: pointer; accent-color: #1e3d2f; }

        @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .mc-wrap { padding: 70px 14px 48px; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr; }
          .cards-grid { grid-template-columns: 1fr; }
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
        {/* ── Topbar (search bar removed, right elements only) ── */}
        <div className="topbar">
          <div className="t-right">
            <div className="icon-btn" style={{ gap: 5 }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              <span
                style={{
                  fontSize: "clamp(10px,0.95vw,12px)",
                  fontWeight: 600,
                  color: "#555",
                }}
              >
                FR
              </span>
            </div>
            <div className="icon-btn" onClick={() => { setShowNotifs((v) => !v); setUnreadCount(0); }} style={{ cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="n-dot" />}
            </div>
            <div className="u-chip">
              <div className="u-av">
                {(() => {
                  const u = getCurrentUser();
                  return u?.nom_complet?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
                })()}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "clamp(10.5px,1vw,12px)",
                    fontWeight: 700,
                    color: "#111",
                    lineHeight: 1.2,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {getCurrentUser()?.nom_complet || "—"}
                </div>
                <div
                  style={{
                    fontSize: "clamp(9px,0.85vw,10px)",
                    color: "#9ca3af",
                  }}
                >
                  Admin
                </div>
              </div>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ marginLeft: 2 }}
              >
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

        {/* ── KPI cards ── */}
        <div className="kpi-grid">
          <KpiCard
            label="Total processus"
            value={data.length}
            icon={KPI_ICONS.total}
            color="#1e3d2f"
            sub={`${data.filter((d) => d.statut === "conforme").length} conformes`}
            delay={0}
          />
          <KpiCard
            label="Stratégiques"
            value={data.filter((d) => d.dept === "strategique").length}
            icon={KPI_ICONS.soutenances}
            color="#ca8a04"
            sub="type"
            delay={60}
          />
          <KpiCard
            label="Opérationnels"
            value={data.filter((d) => d.dept === "operationnel").length}
            icon={KPI_ICONS.laboratoire}
            color="#22c55e"
            sub="type"
            delay={120}
          />
          <KpiCard
            label="Support"
            value={data.filter((d) => d.dept === "support").length}
            icon={KPI_ICONS.qualite}
            color="#3b82f6"
            sub="type"
            delay={180}
          />
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
              {types.map((t) => (
                <button
                  key={t}
                  className={`dtab ${typeFilter === t ? "active" : ""}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === "Tous" ? "Tous" : TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="view-toggle">
              <button
                className={`vt-btn ${viewMode === "table" ? "on" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={viewMode === "table" ? "#1e3d2f" : "#9ca3af"}
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
              </button>
              <button
                className={`vt-btn ${viewMode === "cards" ? "on" : ""}`}
                onClick={() => setViewMode("cards")}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={viewMode === "cards" ? "#1e3d2f" : "#9ca3af"}
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
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
                  onClick={bulkDelete}
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
          {loading && (
            <div className="empty-state">Chargement des processus…</div>
          )}
          {apiError && (
            <div className="empty-state" style={{ color: "#ef4444" }}>
              Erreur : {apiError}
            </div>
          )}

          {viewMode === "table" && !loading && !apiError && (
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
                        ["dept", "Type"],
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
                      const ds = TYPE_STYLE[row.dept] || {
                        color: "#555",
                        bg: "#f3f4f6",
                        dot: "#9ca3af",
                      };
                      const ss = STATUS_STYLE[row.statut] || STATUS_STYLE.non_demarre;
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
                            style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}
                            onClick={() => navigate(`/fiche-processus/${row.id}`)}
                          >{row.nom}</td>
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
                              text={TYPE_LABEL[row.dept] || row.dept || "—"}
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
          )}

          {/* ── CARDS VIEW ── */}
          {viewMode === "cards" && !loading && !apiError && (
            <div className="cards-grid">
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  Aucun processus trouvé.
                </div>
              ) : (
                filtered.map((row, i) => {
                  const ds = TYPE_STYLE[row.dept] || {
                    color: "#555",
                    bg: "#f3f4f6",
                    dot: "#9ca3af",
                  };
                  const ss = STATUS_STYLE[row.statut] || STATUS_STYLE.non_demarre;
                  return (
                    <div
                      key={row.id}
                      className="proc-card"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <Badge
                          text={TYPE_LABEL[row.dept] || row.dept || "—"}
                          style={{
                            color: ds.color,
                            background: ds.bg,
                            dot: ds.dot,
                          }}
                        />
                        <Badge
                          text={ss.label}
                          style={{
                            color: ss.color,
                            background: ss.bg,
                            dot: ss.color,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "'Outfit',sans-serif",
                          fontWeight: 800,
                          fontSize: "clamp(14px,1.4vw,16px)",
                          color: "#111",
                          marginBottom: 4,
                        }}
                      >
                        {row.nom}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(11px,1vw,12px)",
                          color: "#6b7280",
                          marginBottom: 12,
                        }}
                      >
                        par {row.responsable}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          fontSize: "clamp(11px,1vw,12px)",
                          color: "#6b7280",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
                          </svg>
                          {row.tel}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          <a
                            href={`mailto:${row.email}`}
                            style={{ color: "#1e3d2f", textDecoration: "none" }}
                          >
                            {row.email}
                          </a>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid #f0f2f4",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
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
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: "clamp(11px,1.2vw,14px) clamp(14px,1.5vw,22px)",
              borderTop: "1px solid #f0f2f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
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