import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "../components/NotificationsPanel.jsx";

const C = { dark: "#1e3d2f", primary: "#2D604F", accent: "#77D58F", lightBg: "#eaf5eb", white: "#FAFAFA", border: "#d4e9d7", text: "#1a2e22", muted: "#6b8c75" };

const DEMO_AUDITS = [
  { id: 1, processus: "Gestion PFE",       auditeur: "Meziani Karim",  type: "Interne", datePlan: "2026-05-15", statut: "planifie",  score: null },
  { id: 2, processus: "Audit Labo",         auditeur: "Bensalem Sara",  type: "Externe", datePlan: "2026-05-20", statut: "en_cours",  score: null },
  { id: 3, processus: "Contrôle Qualité",  auditeur: "Haddadou Ali",   type: "Interne", datePlan: "2026-04-30", statut: "termine",   score: 88 },
  { id: 4, processus: "Formation",          auditeur: "Kaci Nadia",     type: "Externe", datePlan: "2026-06-01", statut: "planifie",  score: null },
  { id: 5, processus: "Audit Interne",      auditeur: "Meziani Karim",  type: "Interne", datePlan: "2026-04-10", statut: "termine",   score: 76 },
];

const STATUT = {
  planifie:  { label: "Planifié",   bg: "#dbeafe", color: "#1e40af" },
  en_cours:  { label: "En cours",   bg: "#fef3c7", color: "#92400e" },
  termine:   { label: "Terminé",    bg: "#dcfce7", color: "#166534" },
  annule:    { label: "Annulé",     bg: "#fee2e2", color: "#991b1b" },
};

function PlanModal({ onClose, onSave }) {
  const [form, setForm] = useState({ processus: "", auditeur: "", type: "Interne", datePlan: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, backdropFilter: "blur(3px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 480, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 }}>📋 Planifier un audit</div>
        {[
          { label: "Processus concerné", key: "processus", placeholder: "Ex : Gestion PFE" },
          { label: "Auditeur responsable", key: "auditeur", placeholder: "Nom de l'auditeur" },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>
            <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#f0ffeb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Type d'audit</label>
            <div style={{ position: "relative" }}>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#f0ffeb", fontSize: 14, outline: "none", appearance: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                <option>Interne</option><option>Externe</option>
              </select>
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }}>▾</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Date planifiée</label>
            <input type="date" value={form.datePlan} onChange={(e) => set("datePlan", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#f0ffeb", fontSize: 14, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 14, color: C.muted }}>Annuler</button>
          <button onClick={() => { if (form.processus && form.auditeur && form.datePlan) onSave(form); }} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (form.processus && form.auditeur && form.datePlan) ? 1 : 0.5 }}>
            Planifier
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditsPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("smq_audits") || "[]");
    const fromLocalStorage = stored.map((a, i) => ({
      id: `ext_${i}`,
      processus: a.processName || "—",
      auditeur: a.auditorEmail || "—",
      type: "Externe",
      datePlan: a.sentAt?.split("T")[0] || "",
      statut: "en_cours",
      score: null,
    }));
    setAudits([...DEMO_AUDITS, ...fromLocalStorage]);
    setUnread(getUnreadCount());
  }, []);

  const handlePlan = (form) => {
    const newAudit = { id: Date.now(), ...form, statut: "planifie", score: null };
    setAudits((a) => [...a, newAudit]);
    setShowModal(false);
  };

  const filtered = audits.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.processus.toLowerCase().includes(q) || a.auditeur.toLowerCase().includes(q);
    const matchFilter = filter === "Tous" || a.statut === filter || a.type === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    total: audits.length,
    planifie: audits.filter((a) => a.statut === "planifie").length,
    en_cours: audits.filter((a) => a.statut === "en_cours").length,
    termine: audits.filter((a) => a.statut === "termine").length,
    conformite: audits.filter((a) => a.score !== null).length > 0
      ? Math.round(audits.filter((a) => a.score !== null).reduce((s, a) => s + a.score, 0) / audits.filter((a) => a.score !== null).length)
      : null,
  };

  const KpiCard = ({ icon, label, value, color, sub }) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "#111", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .aud-wrap { padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px; min-height: 100vh; background: #eaf5eb; }
        .aud-topbar { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e8ede9; border-radius: clamp(12px,1.3vw,16px); height: clamp(52px,6vw,62px); padding: 0 clamp(12px,1.5vw,20px); margin-bottom: clamp(16px,2vw,24px); box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.3s ease; gap:10px; }
        .aud-tb-r { display:flex; align-items:center; gap: clamp(6px,0.9vw,12px); }
        .aud-icon-btn { height:34px; min-width:34px; border-radius:10px; border:1px solid #e8eaed; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; padding:0 10px; position:relative; transition:all 0.15s; }
        .aud-icon-btn:hover { background:#f3f5f7; transform:translateY(-1px); }
        .aud-n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .aud-u-chip { display:flex; align-items:center; gap:8px; background:#f3f5f7; border:1px solid #e8eaed; border-radius:11px; padding:4px 10px 4px 5px; cursor:pointer; transition:all 0.15s; }
        .aud-u-chip:hover { background:#ebeef1; }
        .aud-u-av { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#5ecf7a,#2d9e5f); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:900; font-size:10px; color:#152b21; }
        .aud-kpi { display:grid; grid-template-columns:repeat(5,1fr); gap: clamp(10px,1.2vw,14px); margin-bottom: clamp(16px,2vw,22px); }
        .aud-card { background:#fff; border:none; border-radius: clamp(14px,1.5vw,18px); overflow:hidden; animation:fadeUp 0.4s ease 0.15s both; }
        .aud-row:hover { background:#f8fcf9 !important; }
        .aud-tbl { width:100%; border-collapse:collapse; min-width:600px; }
        .aud-tbl thead th { padding:10px 16px; text-align:left; font-size:10.5px; font-weight:700; color:#9ca3af; letter-spacing:0.9px; text-transform:uppercase; background:#fff; border-bottom:1px solid #f0f2f4; font-family:'Plus Jakarta Sans',sans-serif; }
        .aud-tbl tbody td { padding:12px 16px; font-size:13px; color:#374151; border-top:1px solid #f0f2f4; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
        @media (max-width:1100px) { .aud-kpi { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:768px) { .aud-kpi { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      {showModal && <PlanModal onClose={() => setShowModal(false)} onSave={handlePlan} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}

      <div className="aud-wrap">
        {/* Topbar */}
        <div className="aud-topbar">
          <div style={{ fontSize: 14, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/processus")}>Tableau de bord</span>
            <span style={{ color: "#d4e9d7" }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Audits</span>
          </div>
          <div className="aud-tb-r">
            <div className="aud-icon-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>FR</span>
            </div>
            <div className="aud-icon-btn" onClick={() => setShowNotifs((v) => !v)} style={{ cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unread > 0 && <span className="aud-n-dot" />}
            </div>
            <div className="aud-u-chip" onClick={() => navigate("/parametres")}>
              <div className="aud-u-av">AZ</div>
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
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: "clamp(20px,2.5vw,28px)", color: "#111", lineHeight: 1.1 }}>Audits</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Planification, suivi et résultats des audits qualité</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #2d9e5f, #1e6b42)", border: "none", borderRadius: 11, padding: "11px 20px", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 14px rgba(45,158,95,0.35)", transition: "transform 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Planifier un audit
          </button>
        </div>

        {/* KPIs */}
        <div className="aud-kpi">
          <KpiCard icon="📋" label="Total audits" value={counts.total} color="#1e3d2f" sub={`${counts.en_cours} en cours`} />
          <KpiCard icon="📅" label="Planifiés" value={counts.planifie} color="#3b82f6" />
          <KpiCard icon="🔄" label="En cours" value={counts.en_cours} color="#f59e0b" />
          <KpiCard icon="✅" label="Terminés" value={counts.termine} color="#22c55e" />
          <KpiCard icon="📊" label="Conformité moy." value={counts.conformite !== null ? `${counts.conformite}%` : "—"} color="#8b5cf6" sub="audits évalués" />
        </div>

        {/* Main card */}
        <div className="aud-card">
          <div style={{ padding: "16px 22px 14px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 10, padding: "7px 13px", flex: 1, minWidth: 160, maxWidth: 320 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4c8d1" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un audit…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 12.5, color: "#333", width: "100%", fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
            </div>
            {["Tous", "planifie", "en_cours", "termine", "Interne", "Externe"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 9, border: `1.5px solid ${filter === f ? C.dark : "#e8eaed"}`, background: filter === f ? C.dark : "white", color: filter === f ? "white" : "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all 0.15s" }}>
                {f === "planifie" ? "Planifiés" : f === "en_cours" ? "En cours" : f === "termine" ? "Terminés" : f}
              </button>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              <b style={{ color: "#374151" }}>{filtered.length}</b> résultat{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="aud-tbl">
              <thead>
                <tr>
                  {["Processus", "Auditeur", "Type", "Date planifiée", "Statut", "Score", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#d1d5db" }}>Aucun audit trouvé.</td></tr>
                ) : (
                  filtered.map((a, i) => {
                    const s = STATUT[a.statut] || STATUT.planifie;
                    return (
                      <tr key={a.id} className="aud-row" style={{ animationDelay: `${i * 0.04}s` }}>
                        <td style={{ fontWeight: 600, color: "#111" }}>{a.processus}</td>
                        <td>{a.auditeur}</td>
                        <td>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: a.type === "Externe" ? "#fef3c7" : "#dbeafe", color: a.type === "Externe" ? "#92400e" : "#1e40af" }}>
                            {a.type}
                          </span>
                        </td>
                        <td style={{ color: "#6b7280" }}>{a.datePlan || "—"}</td>
                        <td>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td>
                          {a.score !== null ? (
                            <span style={{ fontWeight: 700, color: a.score >= 80 ? "#166534" : a.score >= 60 ? "#92400e" : "#991b1b" }}>
                              {a.score}%
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#f0fdf4", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Voir
                            </button>
                            {a.statut === "planifie" && (
                              <button
                                onClick={() => setAudits((prev) => prev.map((x) => x.id === a.id ? { ...x, statut: "en_cours" } : x))}
                                style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: C.primary, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                              >
                                Démarrer
                              </button>
                            )}
                            {a.statut === "en_cours" && (
                              <button
                                onClick={() => setAudits((prev) => prev.map((x) => x.id === a.id ? { ...x, statut: "termine", score: Math.floor(Math.random() * 25) + 70 } : x))}
                                style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                              >
                                Clôturer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "12px 22px", borderTop: "1px solid #f0f2f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Affichage de <b style={{ color: "#374151" }}>{filtered.length}</b> / <b style={{ color: "#374151" }}>{audits.length}</b> audits
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
