import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "../components/NotificationsPanel.jsx";
import { api, getCurrentUser } from "../lib/api.js";

/* ══ design tokens ══ */
const C = {
  dark: "#1e3d2f", primary: "#2D604F", accent: "#77D58F",
  lightBg: "#eaf5eb", softBg: "#F0FFEB", white: "#FAFAFA",
  border: "#d4e9d7", text: "#1a2e22", muted: "#6b8c75",
  danger: "#e53935",
};

/* ══ helpers criticité (RPN = p×g×d, seuils backend) ══ */
function rpnToCriticite(rpn) {
  if (rpn >= 81)  return { label: "Critique", color: "#991b1b", bg: "#fee2e2", bar: "#f87171" };
  if (rpn >= 51)  return { label: "Élevé",    color: "#92400e", bg: "#fef3c7", bar: "#fbbf24" };
  if (rpn >= 21)  return { label: "Modéré",   color: "#1e40af", bg: "#dbeafe", bar: "#60a5fa" };
  return                 { label: "Faible",   color: "#166534", bg: "#dcfce7", bar: "#4ade80" };
}

const CRITICITE_MAP = {
  critique: { label: "Critique", color: "#991b1b", bg: "#fee2e2" },
  eleve:    { label: "Élevé",    color: "#92400e", bg: "#fef3c7" },
  modere:   { label: "Modéré",   color: "#1e40af", bg: "#dbeafe" },
  faible:   { label: "Faible",   color: "#166534", bg: "#dcfce7" },
};

/* statut API → display */
function mapStatutDisplay(s) {
  if (s === "identifie" || s === "analyse") return "Ouvert";
  if (s === "traitement" || s === "surveillance") return "En cours";
  if (s === "clos") return "Traité";
  return s;
}

function statutStyle(s) {
  const d = mapStatutDisplay(s);
  if (d === "Ouvert")   return { color: "#991b1b", bg: "#fee2e2" };
  if (d === "En cours") return { color: "#92400e", bg: "#fef3c7" };
  return                       { color: "#166534", bg: "#dcfce7" };
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const MOIS = ["jan.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sep.", "oct.", "nov.", "déc."];
  return `${dt.getDate()} ${MOIS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* ══ Champ input réutilisable ══ */
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 10,
  border: `1.5px solid ${C.border}`, background: C.softBg,
  fontSize: 13.5, color: C.text, outline: "none", boxSizing: "border-box",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

/* ══ Modal ajout risque ══ */
function RisqueModal({ onClose, onSave, processusList }) {
  const [form, setForm] = useState({
    titre: "", processus_id: "", probabilite: "3", gravite: "3", detectabilite: "3",
    plan_attenuation: "", echeance: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const rpn = parseInt(form.probabilite) * parseInt(form.gravite) * parseInt(form.detectabilite);
  const nc = rpnToCriticite(rpn);

  const NIVEAUX_P = ["Rare", "Peu probable", "Possible", "Probable", "Certain"];
  const NIVEAUX_G = ["Négligeable", "Mineur", "Modéré", "Majeur", "Critique"];
  const NIVEAUX_D = ["Très détectable", "Détectable", "Modérée", "Difficile", "Indétectable"];

  const validate = () => {
    const e = {};
    if (!form.titre.trim())      e.titre = "Champ requis";
    if (!form.processus_id)      e.processus_id = "Champ requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        titre: form.titre.trim(),
        processus_id: parseInt(form.processus_id),
        probabilite: parseInt(form.probabilite),
        gravite: parseInt(form.gravite),
        detectabilite: parseInt(form.detectabilite),
        plan_attenuation: form.plan_attenuation.trim() || null,
        date_echeance: form.echeance ? `${form.echeance}T00:00:00` : null,
      };
      const created = await api.post("/risques/", payload);
      onSave(created);
    } catch (err) {
      setErrors({ _api: err.message || "Erreur lors de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,30,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "min(660px, 94vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 28px 70px rgba(0,0,0,0.22)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* header */}
        <div style={{ padding: "20px 26px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>Nouveau risque</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>ISO 9001:2015 § 6.1 — Identification et évaluation AMDEC</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
          </button>
        </div>

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* API error */}
          {errors._api && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b" }}>{errors._api}</div>
          )}

          {/* Criticité en temps réel */}
          <div style={{ background: nc.bg, border: `1.5px solid ${nc.color}30`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: nc.color, textTransform: "uppercase", letterSpacing: 1 }}>RPN calculé</div>
              <div style={{ fontSize: 11, color: nc.color, marginTop: 2, opacity: 0.8 }}>Probabilité × Gravité × Détectabilité</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 28, color: nc.color }}>{rpn}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: nc.color, background: "rgba(255,255,255,0.6)", padding: "3px 10px", borderRadius: 20, border: `1px solid ${nc.color}40` }}>{nc.label}</span>
            </div>
          </div>

          {/* Titre */}
          <Field label="Intitulé du risque" required>
            <input value={form.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Ex : Retard de révision documentaire" style={{ ...inputStyle, borderColor: errors.titre ? C.danger : C.border }} />
            {errors.titre && <span style={{ fontSize: 11, color: C.danger }}>{errors.titre}</span>}
          </Field>

          {/* Processus */}
          <Field label="Processus concerné" required>
            <div style={{ position: "relative" }}>
              <select value={form.processus_id} onChange={(e) => set("processus_id", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer", borderColor: errors.processus_id ? C.danger : C.border }}>
                <option value="">— Sélectionner un processus —</option>
                {processusList.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </span>
            </div>
            {errors.processus_id && <span style={{ fontSize: 11, color: C.danger }}>{errors.processus_id}</span>}
          </Field>

          {/* P + G + D sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {[
              { key: "probabilite",   label: "Probabilité (P)", levels: NIVEAUX_P },
              { key: "gravite",       label: "Gravité (G)",     levels: NIVEAUX_G },
              { key: "detectabilite", label: "Détectabilité (D)", levels: NIVEAUX_D },
            ].map(({ key, label, levels }) => (
              <Field key={key} label={label}>
                <div style={{ background: C.softBg, borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 22, color: C.primary }}>{form[key]}</span>
                    <span style={{ fontSize: 10.5, color: C.muted, fontStyle: "italic" }}>{levels[parseInt(form[key]) - 1]}</span>
                  </div>
                  <input type="range" min="1" max="5" value={form[key]} onChange={(e) => set(key, e.target.value)} style={{ width: "100%", accentColor: C.primary, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ fontSize: 9, color: C.muted }}>1</span>
                    <span style={{ fontSize: 9, color: C.muted }}>5</span>
                  </div>
                </div>
              </Field>
            ))}
          </div>

          {/* Mesure */}
          <Field label="Mesure de maîtrise / Plan d'atténuation">
            <textarea value={form.plan_attenuation} onChange={(e) => set("plan_attenuation", e.target.value)} placeholder="Décrivez les actions prévues pour réduire ce risque…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} />
          </Field>

          {/* Échéance */}
          <Field label="Échéance">
            <input type="date" value={form.echeance} onChange={(e) => set("echeance", e.target.value)} style={inputStyle} />
          </Field>
        </div>

        {/* footer */}
        <div style={{ padding: "16px 26px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 13.5, color: C.muted, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.primary}, #1e6b42)`, color: "white", fontWeight: 700, fontSize: 13.5, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 14px rgba(45,96,79,0.3)", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "Enregistrer le risque"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ Matrice 5×5 (P × G) ══ */
function MatriceRisque({ risques }) {
  const CELL = 40;
  const LABELS_P = ["1 — Rare", "2 — Peu prob.", "3 — Possible", "4 — Probable", "5 — Certain"];
  const LABELS_G = ["1 — Négligeable", "2 — Mineur", "3 — Modéré", "4 — Majeur", "5 — Critique"];
  const cellBg = (p, g) => {
    const c = p * g;
    if (c >= 12) return "#fee2e2";
    if (c >= 6)  return "#fef3c7";
    if (c >= 3)  return "#dbeafe";
    return "#f0fdf4";
  };
  const countAt = (p, g) => risques.filter((r) => r.probabilite === p && r.gravite === g).length;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", gap: 3, marginLeft: 110 }}>
          {LABELS_G.map((l, i) => <div key={i} style={{ width: CELL, textAlign: "center", fontSize: 8.5, color: C.muted, lineHeight: 1.3 }}>{l}</div>)}
          <div style={{ width: 30 }} />
        </div>
        {[5, 4, 3, 2, 1].map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 108, textAlign: "right", paddingRight: 8, fontSize: 8.5, color: C.muted }}>{LABELS_P[p - 1]}</div>
            {[1, 2, 3, 4, 5].map((g) => {
              const n = countAt(p, g);
              const ncv = rpnToCriticite(p * g);
              return (
                <div key={g} style={{ width: CELL, height: CELL, borderRadius: 6, background: cellBg(p, g), border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <span style={{ fontSize: 9, color: ncv.color, opacity: 0.4, position: "absolute", top: 3, right: 4, fontWeight: 700 }}>{p * g}</span>
                  {n > 0 && <span style={{ width: 20, height: 20, borderRadius: "50%", background: ncv.color, color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", boxShadow: `0 2px 6px ${ncv.color}60` }}>{n}</span>}
                </div>
              );
            })}
            <div style={{ width: 30, paddingLeft: 8, fontSize: 9, color: C.muted }}>P={p}</div>
          </div>
        ))}
        <div style={{ marginLeft: 110, marginTop: 6, fontSize: 9, color: C.muted }}>Gravité (G) →</div>
      </div>
    </div>
  );
}

/* ══ Page principale ══ */
export default function RisquesPage() {
  const navigate = useNavigate();
  const [risques, setRisques] = useState([]);
  const [processusList, setProcessusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("Tous");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread] = useState(() => getUnreadCount());

  const user = getCurrentUser();
  const initials = getInitials(user?.nom_complet);

  useEffect(() => {
    Promise.all([
      api.get("/risques/").catch(() => []),
      api.get("/processus/").catch(() => []),
    ]).then(([rqs, procs]) => {
      setRisques(Array.isArray(rqs) ? rqs : []);
      setProcessusList(Array.isArray(procs) ? procs : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = (created) => {
    setRisques((prev) => [created, ...prev]);
    setShowModal(false);
  };

  /* map API risque fields to display fields */
  const mapped = risques.map(r => ({
    ...r,
    id_display: r.reference || `R-${String(r.id).padStart(3, "0")}`,
    processus_display: r.processus_nom || `P-${r.processus_id}`,
    statut_display: mapStatutDisplay(r.statut),
    criticite_display: CRITICITE_MAP[r.criticite] || { label: r.criticite, color: "#6b7280", bg: "#f3f4f6" },
    responsable_display: r.responsable ? `${r.responsable.prenom} ${r.responsable.nom}` : "—",
    echeance_display: fmtDate(r.date_echeance),
    mesure_display: r.plan_attenuation || "—",
  }));

  const filtered = mapped.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.titre.toLowerCase().includes(q) || r.processus_display.toLowerCase().includes(q);
    const matchFilter = filter === "Tous" || r.statut_display === filter;
    return matchSearch && matchFilter;
  });

  const kpi = [
    { label: "Risques identifiés", value: risques.length,                                          color: "#1e40af", bg: "#dbeafe" },
    { label: "Ouverts",            value: mapped.filter(r => r.statut_display === "Ouvert").length, color: "#991b1b", bg: "#fee2e2" },
    { label: "En traitement",      value: mapped.filter(r => r.statut_display === "En cours").length, color: "#92400e", bg: "#fef3c7" },
    { label: "Traités",            value: mapped.filter(r => r.statut_display === "Traité").length, color: "#166534", bg: "#dcfce7" },
    { label: "Criticité moy. RPN", value: risques.length ? Math.round(risques.reduce((s, r) => s + (r.rpn || 0), 0) / risques.length) : 0, color: "#6b21a8", bg: "#f3e8ff" },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .rq-wrap { padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px; min-height:100vh; background:#eaf5eb; font-family:'Plus Jakarta Sans',sans-serif; }
        .rq-topbar { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e8ede9; border-radius:clamp(12px,1.3vw,16px); height:clamp(52px,6vw,62px); padding:0 clamp(12px,1.5vw,20px); margin-bottom:clamp(16px,2vw,24px); box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.3s ease; gap:10px; }
        .rq-tb-r { display:flex; align-items:center; gap:clamp(6px,0.9vw,12px); }
        .rq-icon-btn { height:34px; min-width:34px; border-radius:10px; border:1px solid #e8eaed; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; padding:0 10px; position:relative; transition:background 0.15s; }
        .rq-icon-btn:hover { background:#f3f5f7; }
        .rq-n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .rq-u-chip { display:flex; align-items:center; gap:8px; background:#f3f5f7; border:1px solid #e8eaed; border-radius:11px; padding:4px 10px 4px 5px; cursor:pointer; transition:background 0.15s; }
        .rq-u-chip:hover { background:#ebeef1; }
        .rq-u-av { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#5ecf7a,#2d9e5f); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:900; font-size:10px; color:#152b21; }
        .rq-kpi { display:grid; grid-template-columns:repeat(5,1fr); gap:clamp(10px,1.2vw,14px); margin-bottom:clamp(16px,2vw,22px); }
        .rq-card { background:#fff; border-radius:clamp(14px,1.5vw,18px); overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,0.06); animation:fadeUp 0.4s ease 0.1s both; }
        .rq-row:hover td { background:#f8fcf9 !important; }
        .rq-tbl { width:100%; border-collapse:collapse; min-width:700px; }
        .rq-tbl thead th { padding:10px 16px; text-align:left; font-size:10.5px; font-weight:700; color:#9ca3af; letter-spacing:0.9px; text-transform:uppercase; background:#fafafa; border-bottom:1px solid #f0f2f4; white-space:nowrap; }
        .rq-tbl tbody td { padding:11px 16px; font-size:13px; color:#374151; border-top:1px solid #f0f2f4; }
        .rq-filter-btn { padding:6px 13px; border-radius:9px; border:1.5px solid #e8eaed; background:white; color:#6b7280; cursor:pointer; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .rq-filter-btn.active { border-color:#1e3d2f; background:#1e3d2f; color:white; }
        @media (max-width:1200px) { .rq-kpi { grid-template-columns:repeat(3,1fr); } }
        @media (max-width:768px)  { .rq-kpi { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      {showModal && <RisqueModal onClose={() => setShowModal(false)} onSave={handleSave} processusList={processusList} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}

      <div className="rq-wrap">
        {/* ── Topbar ── */}
        <div className="rq-topbar">
          <div style={{ fontSize: 13.5, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>Tableau de bord</span>
            <span style={{ color: C.border }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Gestion des risques</span>
          </div>
          <div className="rq-tb-r">
            <div className="rq-icon-btn" onClick={() => setShowNotifs((v) => !v)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unread > 0 && <span className="rq-n-dot" />}
            </div>
            <div className="rq-u-chip" onClick={() => navigate("/parametres")}>
              <div className="rq-u-av">{initials}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{user?.nom_complet || "Utilisateur"}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{user?.role || ""}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22, animation: "fadeUp 0.3s ease 0.05s both" }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: "clamp(20px,2.5vw,28px)", color: "#111", lineHeight: 1.1 }}>Gestion des risques</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>ISO 9001:2015 § 6.1 — Identification, évaluation et traitement (méthode AMDEC)</div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #2d9e5f, #1e6b42)", border: "none", borderRadius: 11, padding: "11px 20px", cursor: "pointer", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 4px 14px rgba(45,158,95,0.35)", transition: "transform 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nouveau risque
          </button>
        </div>

        {/* ── KPIs ── */}
        <div className="rq-kpi">
          {kpi.map((k, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14, animation: `fadeUp 0.35s ease ${0.05 + i * 0.05}s both`, border: `1px solid ${k.bg}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: k.color, display: "block" }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "#111", lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 3 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="rq-card">
          <div style={{ display: "flex", borderBottom: `1px solid #f0f2f4`, background: "#f7fbf8", overflowX: "auto" }}>
            {["Registre des risques", "Matrice de criticité", "Opportunités"].map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{ padding: "13px 22px", fontSize: 13, fontWeight: tab === i ? 700 : 500, color: tab === i ? C.primary : C.muted, background: tab === i ? "#fff" : "none", border: "none", borderBottom: tab === i ? `2px solid ${C.primary}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "all 0.15s" }}>{t}</button>
            ))}
          </div>

          {/* TAB 0 : Registre */}
          {tab === 0 && (
            <>
              <div style={{ padding: "14px 20px 12px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, borderBottom: "1px solid #f0f2f4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 10, padding: "7px 13px", flex: 1, minWidth: 160, maxWidth: 300 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4c8d1" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un risque…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 12.5, color: "#333", width: "100%", fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
                </div>
                {["Tous", "Ouvert", "En cours", "Traité"].map((f) => (
                  <button key={f} className={`rq-filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>
                  <b style={{ color: "#374151" }}>{filtered.length}</b> risque{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>Chargement…</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="rq-tbl">
                    <thead>
                      <tr>{["ID", "Risque", "Processus", "P", "G", "D", "RPN", "Criticité", "Mesure", "Responsable", "Échéance", "Statut"].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={i} className="rq-row">
                          <td style={{ fontWeight: 700, color: "#9ca3af", fontSize: 12 }}>{r.id_display}</td>
                          <td style={{ fontWeight: 600, color: "#111", maxWidth: 200 }}>{r.titre}</td>
                          <td style={{ color: "#6b7280" }}>{r.processus_display}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, fontFamily: "'Outfit',sans-serif", fontSize: 15 }}>{r.probabilite}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, fontFamily: "'Outfit',sans-serif", fontSize: 15 }}>{r.gravite}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, fontFamily: "'Outfit',sans-serif", fontSize: 15 }}>{r.detectabilite}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 15, color: r.criticite_display.color }}>{Math.round(r.rpn || 0)}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: r.criticite_display.color, background: r.criticite_display.bg, padding: "2px 7px", borderRadius: 20 }}>{r.criticite_display.label}</span>
                          </td>
                          <td style={{ maxWidth: 180, color: "#374151", fontSize: 12 }}>{r.mesure_display}</td>
                          <td style={{ color: "#6b7280" }}>{r.responsable_display}</td>
                          <td style={{ color: "#9ca3af", whiteSpace: "nowrap", fontSize: 12 }}>{r.echeance_display}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statutStyle(r.statut).color, background: statutStyle(r.statut).bg, padding: "3px 9px", borderRadius: 20 }}>{r.statut_display}</span>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && !loading && (
                        <tr><td colSpan={12} style={{ textAlign: "center", padding: "40px", color: C.muted, fontSize: 13 }}>Aucun risque trouvé.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 1 : Matrice */}
          {tab === 1 && (
            <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>Matrice Probabilité × Gravité</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Les cercles indiquent le nombre de risques par cellule</div>
                <MatriceRisque risques={risques} />
                <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
                  {[
                    { label: "Critique  ≥ 12", color: "#991b1b", bg: "#fee2e2" },
                    { label: "Élevé     6–11",  color: "#92400e", bg: "#fef3c7" },
                    { label: "Modéré    3–5",   color: "#1e40af", bg: "#dbeafe" },
                    { label: "Faible    1–2",   color: "#166534", bg: "#dcfce7" },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}40`, display: "block" }} />
                      <span style={{ fontSize: 11, color: C.text }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["Critique", "Élevé", "Modéré", "Faible"].map(niveau => {
                  const list = mapped.filter(r => r.criticite_display.label === niveau);
                  if (!list.length) return null;
                  const nc = list[0].criticite_display;
                  return (
                    <div key={niveau} style={{ border: `1px solid ${nc.color}25`, borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ padding: "9px 16px", background: nc.bg, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: nc.color }}>{niveau}</span>
                        <span style={{ fontSize: 11, color: nc.color, opacity: 0.7 }}>— {list.length} risque{list.length > 1 ? "s" : ""}</span>
                      </div>
                      {list.map((r, i) => (
                        <div key={i} style={{ padding: "10px 16px", borderTop: i > 0 ? "1px solid #f8f9fa" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
                          <div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", marginRight: 8 }}>{r.id_display}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111" }}>{r.titre}</span>
                            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{r.processus_display}</span>
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: statutStyle(r.statut).color, background: statutStyle(r.statut).bg, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{r.statut_display}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {mapped.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Aucun risque à afficher.</div>}
              </div>
            </div>
          )}

          {/* TAB 2 : Opportunités */}
          {tab === 2 && (
            <div style={{ padding: "24px 28px" }}>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Référence ISO 9001:2015 § 6.1</div>
                  <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
                    L'organisme doit identifier les risques et opportunités liés à son contexte (§ 4.1) et aux parties intéressées (§ 4.2), planifier les actions pour y faire face, et intégrer ces actions dans ses processus.
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                La gestion des opportunités sera disponible dans une prochaine version du module.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
