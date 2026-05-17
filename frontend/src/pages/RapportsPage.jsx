import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "../components/NotificationsPanel.jsx";

const C = { dark: "#1e3d2f", primary: "#2D604F", accent: "#77D58F", lightBg: "#eaf5eb", white: "#FAFAFA", border: "#d4e9d7", text: "#1a2e22", muted: "#6b8c75" };

const REPORTS = [
  { id: 1, titre: "Rapport d'audit — Gestion PFE",       type: "Audit",       date: "2026-04-30", auteur: "Meziani Karim", statut: "Finalisé",  pages: 12 },
  { id: 2, titre: "Rapport ISO 9001 — Bilan mensuel",     type: "Conformité",  date: "2026-05-01", auteur: "Atir Zineb",   statut: "Finalisé",  pages: 8  },
  { id: 3, titre: "Tableau de bord performance SMQ",      type: "Performance", date: "2026-05-05", auteur: "Bensalem Sara", statut: "Brouillon", pages: 6  },
  { id: 4, titre: "Rapport d'audit — Contrôle Qualité",  type: "Audit",       date: "2026-05-08", auteur: "Haddadou Ali", statut: "En révision", pages: 14 },
  { id: 5, titre: "Rapport KPI trimestriel",              type: "Performance", date: "2026-05-10", auteur: "Atir Zineb",   statut: "Brouillon", pages: 10 },
  { id: 6, titre: "Plan d'action qualité 2026",           type: "Conformité",  date: "2026-04-15", auteur: "Kaci Nadia",  statut: "Finalisé",  pages: 20 },
];

const TYPE_COLOR = {
  Audit:       { bg: "#dbeafe", color: "#1e40af" },
  Conformité:  { bg: "#dcfce7", color: "#166534" },
  Performance: { bg: "#fef3c7", color: "#92400e" },
};

const STATUT_COLOR = {
  "Finalisé":    { bg: "#dcfce7", color: "#166534" },
  "En révision": { bg: "#fef3c7", color: "#92400e" },
  "Brouillon":   { bg: "#f3f4f6", color: "#6b7280" },
};

const ISO_CLAUSES = [
  { code: "4", label: "Contexte de l'organisation", score: 82 },
  { code: "5", label: "Leadership",                  score: 90 },
  { code: "6", label: "Planification",               score: 75 },
  { code: "7", label: "Support",                     score: 88 },
  { code: "8", label: "Réalisation",                 score: 71 },
  { code: "9", label: "Évaluation des performances", score: 84 },
  { code: "10", label: "Amélioration",               score: 68 },
];

function MiniBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "#f0f2f4", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{value}%</span>
    </div>
  );
}

export default function RapportsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [exportToast, setExportToast] = useState(null);

  useEffect(() => { setUnread(getUnreadCount()); }, []);

  const filtered = REPORTS.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.titre.toLowerCase().includes(q) || r.auteur.toLowerCase().includes(q);
    const matchType = typeFilter === "Tous" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleExport = (fmt, titre) => {
    setExportToast(`Export ${fmt} de «${titre}» en cours…`);
    setTimeout(() => setExportToast(null), 2500);
  };

  const globalScore = Math.round(ISO_CLAUSES.reduce((s, c) => s + c.score, 0) / ISO_CLAUSES.length);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .rap-wrap { padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px; min-height:100vh; background:#eaf5eb; }
        .rap-topbar { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e8ede9; border-radius:clamp(12px,1.3vw,16px); height:clamp(52px,6vw,62px); padding:0 clamp(12px,1.5vw,20px); margin-bottom:clamp(16px,2vw,24px); box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.3s ease; gap:10px; }
        .rap-tb-r { display:flex; align-items:center; gap:clamp(6px,0.9vw,12px); }
        .rap-icon-btn { height:34px; min-width:34px; border-radius:10px; border:1px solid #e8eaed; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; padding:0 10px; position:relative; transition:all 0.15s; }
        .rap-icon-btn:hover { background:#f3f5f7; transform:translateY(-1px); }
        .rap-n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .rap-u-chip { display:flex; align-items:center; gap:8px; background:#f3f5f7; border:1px solid #e8eaed; border-radius:11px; padding:4px 10px 4px 5px; cursor:pointer; transition:all 0.15s; }
        .rap-u-chip:hover { background:#ebeef1; }
        .rap-u-av { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#5ecf7a,#2d9e5f); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:900; font-size:10px; color:#152b21; }
        .rap-grid { display:grid; grid-template-columns:2fr 1fr; gap:20px; align-items:start; }
        .rap-card { background:#fff; border-radius:18px; overflow:hidden; animation:fadeUp 0.4s ease both; }
        .rap-row:hover { background:#f8fcf9 !important; }
        @media (max-width:1100px) { .rap-grid { grid-template-columns:1fr; } }
      `}</style>

      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      {exportToast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: C.primary, color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 9999, animation: "fadeUp 0.3s ease" }}>
          📥 {exportToast}
        </div>
      )}

      <div className="rap-wrap">
        {/* Topbar */}
        <div className="rap-topbar">
          <div style={{ fontSize: 14, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/processus")}>Tableau de bord</span>
            <span style={{ color: C.border }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Rapports</span>
          </div>
          <div className="rap-tb-r">
            <div className="rap-icon-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>FR</span>
            </div>
            <div className="rap-icon-btn" onClick={() => setShowNotifs((v) => !v)} style={{ cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unread > 0 && <span className="rap-n-dot" />}
            </div>
            <div className="rap-u-chip" onClick={() => navigate("/parametres")}>
              <div className="rap-u-av">AZ</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Atir Zineb</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Admin</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22, animation: "fadeUp 0.3s ease 0.05s both" }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: "clamp(20px,2.5vw,28px)", color: "#111" }}>Rapports</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Analyses, exports et bilans du système qualité</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleExport("PDF", "Bilan SMQ")} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: 11, padding: "10px 18px", cursor: "pointer", color: "#991b1b", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "transform 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
              📄 Export PDF
            </button>
            <button onClick={() => handleExport("Excel", "Bilan SMQ")} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #2d9e5f, #1e6b42)", border: "none", borderRadius: 11, padding: "10px 18px", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 14px rgba(45,158,95,0.35)", transition: "transform 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
              📊 Export Excel
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22, animation: "fadeUp 0.35s ease 0.08s both" }}>
          {[
            { icon: "📋", label: "Total rapports", value: REPORTS.length, color: "#1e3d2f" },
            { icon: "✅", label: "Finalisés", value: REPORTS.filter((r) => r.statut === "Finalisé").length, color: "#22c55e" },
            { icon: "🔄", label: "En révision", value: REPORTS.filter((r) => r.statut === "En révision").length, color: "#f59e0b" },
            { icon: "📊", label: "Score global ISO", value: `${globalScore}%`, color: "#8b5cf6" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "#111", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rap-grid">
          {/* Reports list */}
          <div>
            <div className="rap-card" style={{ animationDelay: "0.1s" }}>
              <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111", flex: 1 }}>Documents & rapports</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 10, padding: "6px 12px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4c8d1" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 12.5, color: "#333", width: 140, fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
                </div>
                {["Tous", "Audit", "Conformité", "Performance"].map((f) => (
                  <button key={f} onClick={() => setTypeFilter(f)} style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${typeFilter === f ? C.dark : "#e8eaed"}`, background: typeFilter === f ? C.dark : "white", color: typeFilter === f ? "white" : "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    {f}
                  </button>
                ))}
              </div>

              {filtered.map((r, i) => {
                const ts = TYPE_COLOR[r.type];
                const ss = STATUT_COLOR[r.statut];
                return (
                  <div key={r.id} className="rap-row" style={{ padding: "14px 22px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", gap: 14, animationDelay: `${i * 0.04}s`, cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: ts.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {r.type === "Audit" ? "📋" : r.type === "Conformité" ? "🏆" : "📊"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111", fontSize: 13, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ ...ts, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.type}</span>
                        <span style={{ ...ss, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.statut}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>par {r.auteur}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>· {r.date}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>· {r.pages} pages</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleExport("PDF", r.titre)} style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#fee2e2", color: "#991b1b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>PDF</button>
                      <button onClick={() => handleExport("Excel", r.titre)} style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: C.primary, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>XLS</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ISO compliance sidebar */}
          <div>
            <div className="rap-card" style={{ animationDelay: "0.15s" }}>
              <div style={{ padding: "18px 22px", background: `linear-gradient(135deg, ${C.primary}, #3a7a62)`, color: "#fff" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Conformité ISO 9001</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Score par clause</div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Outfit',sans-serif", marginTop: 10 }}>{globalScore}%</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Score global de conformité</div>
              </div>
              <div style={{ padding: "16px 22px" }}>
                {ISO_CLAUSES.map((cl) => {
                  const color = cl.score >= 80 ? "#22c55e" : cl.score >= 65 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={cl.code} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>§{cl.code} {cl.label}</span>
                      </div>
                      <MiniBar value={cl.score} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick export card */}
            <div className="rap-card" style={{ marginTop: 16, padding: "20px 22px", animationDelay: "0.2s" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 16 }}>⚡ Génération rapide</div>
              {[
                { label: "Rapport d'audit complet", desc: "Tous les audits avec scores", icon: "📋" },
                { label: "Bilan ISO mensuel",       desc: "Conformité clause par clause", icon: "🏆" },
                { label: "Tableau KPI SMQ",         desc: "Indicateurs de performance", icon: "📊" },
                { label: "Plan d'action qualité",   desc: "Dysfonctionnements & actions", icon: "⚙️" },
              ].map(({ label, desc, icon }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border; }}
                  onClick={() => handleExport("PDF", label)}
                >
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
