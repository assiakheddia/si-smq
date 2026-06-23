import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "../components/NotificationsPanel.jsx";
import { api, getCurrentUser } from "../lib/api.js";

/* ── statuts ── */
const STATUTS = {
  planifie:  { label: "Planifié",  bg: "#dbeafe", color: "#1e40af" },
  en_cours:  { label: "En cours",  bg: "#fef3c7", color: "#92400e" },
  valide:    { label: "Validé",    bg: "#d1fae5", color: "#065f46" },
  clos:      { label: "Clos",      bg: "#f3f4f6", color: "#374151" },
  retard:    { label: "Retard",    bg: "#fee2e2", color: "#991b1b" },
};
const NC_STATUTS = {
  ouvert:       { label: "Ouvert",       bg: "#fee2e2", color: "#991b1b" },
  en_cours:     { label: "En cours",     bg: "#fef3c7", color: "#92400e" },
  verification: { label: "Vérification", bg: "#ede9fe", color: "#5b21b6" },
  clos:         { label: "Clos",         bg: "#dcfce7", color: "#166534" },
};
const NC_GRAVITE = {
  Critique: { bg: "#fee2e2", color: "#991b1b" },
  Majeure:  { bg: "#fef3c7", color: "#92400e" },
  Mineure:  { bg: "#dbeafe", color: "#1e40af" },
};
const CLAUSES_ISO = [
  "4.1 Contexte", "4.2 Parties intéressées", "5.1 Leadership", "6.1 Risques",
  "6.2 Objectifs qualité", "7.1 Ressources", "7.2 Compétences",
  "7.5 Documents", "8.1 Planification", "8.4 Processus externes",
  "9.1 Surveillance", "9.2 Audit interne", "9.3 Revue de direction", "10.2 NC",
];

/* ── statut backend → frontend ── */
function mapStatut(s) {
  if (s === "brouillon") return "planifie";
  if (s === "soumis")    return "en_cours";
  if (s === "valide")    return "valide";
  if (s === "archive")   return "clos";
  return "planifie";
}

/* ── endpoint pour avancer le statut ── */
const STATUT_ENDPOINT = { en_cours: "soumettre", valide: "valider", clos: "archiver" };

function mapDiagToAudit(d) {
  const audNom = d.auditeur
    ? `${d.auditeur.prenom || ""} ${d.auditeur.nom || ""}`.trim()
    : "—";
  return {
    id: d.id,
    ref: d.reference || `DIAG-${String(d.id).padStart(3,"0")}`,
    titre: `Diagnostic ISO — ${d.processus?.nom || "Processus " + d.processus_id}`,
    processus: d.processus?.nom || `P-${d.processus_id}`,
    processus_id: d.processus_id,
    type: "Interne",
    auditeur: audNom,
    datePlan: d.date_diagnostic ? d.date_diagnostic.split("T")[0] : null,
    dateFin: d.date_validation ? d.date_validation.split("T")[0] : null,
    statut: mapStatut(d.statut),
    score: d.score_global > 0 ? d.score_global : null,
    ncMajeurs: d.nb_ecarts_majeurs || 0,
    ncMineurs: d.nb_ecarts_mineurs || 0,
  };
}

/* ── helpers ── */
const StatBadge = ({ statut }) => {
  const s = STATUTS[statut] || { label: statut, bg: "#f3f4f6", color: "#374151" };
  return <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{s.label}</span>;
};
const TypeBadge = ({ type }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: type === "Externe" ? "#92400e" : "#1e40af", background: type === "Externe" ? "#fef3c7" : "#dbeafe", padding: "2px 8px", borderRadius: 20 }}>{type}</span>
);
const fmtDate = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); };
function getInitials(name) { if (!name) return "??"; return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(); }

/* ── Charts ── */
function DonutChart({ segments, size = 100, stroke = 18 }) {
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f2f4" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset * circ / total + circ / 4} style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }} />;
        offset += seg.value;
        return el;
      })}
    </svg>
  );
}

function MiniBar({ data, color = "#2d9e5f", height = 60 }) {
  const max = Math.max(...data.map(d => d.v), 1);
  const w = 220, bw = Math.floor((w - (data.length - 1) * 4) / data.length);
  return (
    <svg width={w} height={height + 16} viewBox={`0 0 ${w} ${height + 16}`}>
      {data.map((d, i) => { const bh = Math.max((d.v / max) * height, 2), x = i * (bw + 4); return <g key={i}><rect x={x} y={height - bh} width={bw} height={bh} rx={3} fill={color} opacity={0.85} /><text x={x + bw / 2} y={height + 12} textAnchor="middle" fontSize={7} fill="#9ca3af">{d.l}</text></g>; })}
    </svg>
  );
}

function SparkLine({ pts, color = "#2d9e5f", width = 200, height = 50 }) {
  if (pts.length < 2) return null;
  const minV = Math.min(...pts), maxV = Math.max(...pts) || 1;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * width);
  const ys = pts.map(v => height - ((v - minV) / (maxV - minV || 1)) * (height - 8) - 4);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><path d={`${path} L${width},${height} L0,${height} Z`} fill={color} opacity={0.12} /><path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ── Tab: Tableau de bord ── */
function TabDashboard({ audits, ncs }) {
  const total   = audits.length;
  const enCours = audits.filter(a => a.statut === "en_cours").length;
  const planif  = audits.filter(a => a.statut === "planifie").length;
  const fermes  = audits.filter(a => ["clos","valide"].includes(a.statut)).length;
  const scores  = audits.filter(a => a.score !== null).map(a => a.score);
  const avgConf = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
  const ncOuv   = ncs.filter(n => n.statut !== "clos").length;

  const kpis = [
    { label: "Total diagnostics", value: total,                                   color: "#1e40af", bg: "#dbeafe" },
    { label: "En cours",          value: enCours,                                 color: "#92400e", bg: "#fef3c7" },
    { label: "Planifiés",         value: planif,                                  color: "#5b21b6", bg: "#ede9fe" },
    { label: "Clôturés",          value: fermes,                                  color: "#065f46", bg: "#d1fae5" },
    { label: "NC ouvertes",       value: ncOuv,                                   color: "#991b1b", bg: "#fee2e2" },
    { label: "Conformité moy.",   value: avgConf !== null ? `${avgConf}%` : "—", color: "#1e3d2f", bg: "#dcfce7" },
  ];

  const donutData = [
    { value: audits.filter(a=>a.statut==="planifie").length,  color: "#3b82f6" },
    { value: audits.filter(a=>a.statut==="en_cours").length,  color: "#f59e0b" },
    { value: audits.filter(a=>["valide","clos"].includes(a.statut)).length, color: "#22c55e" },
    { value: audits.filter(a=>a.statut==="retard").length,    color: "#ef4444" },
  ];

  const monthBars = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"].map((l, i) => ({
    l, v: audits.filter(a => a.datePlan && parseInt(a.datePlan.split("-")[1]) - 1 === i).length
  }));

  const confTrend = [72, 75, 78, 74, 82, 88, 76, 80, 85, avgConf || 82];
  const recent = [...audits].sort((a,b) => b.id - a.id).slice(0, 4);

  return (
    <div style={{ height: "calc(100vh - 56px)", overflow: "hidden", display: "flex", flexDirection: "column", padding: "14px 22px 12px", gap: 12, background: "#eaf5eb" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, flexShrink: 0 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: "white", borderRadius: 10, border: `1px solid ${k.bg}`, padding: "10px 13px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2 }}>Répartition par statut</div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 10 }}>Tous diagnostics</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", minHeight: 0 }}>
            <DonutChart segments={donutData} size={90} stroke={16} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[{label:"Planifié",color:"#3b82f6"},{label:"En cours",color:"#f59e0b"},{label:"Terminé",color:"#22c55e"},{label:"Retard",color:"#ef4444"}].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#374151" }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#111", marginLeft: "auto" }}>{donutData[i].value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2 }}>Diagnostics par mois</div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 10 }}>Programme annuel</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
            <MiniBar data={monthBars} color="#2d9e5f" height={55} />
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2 }}>Tendance conformité</div>
          <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>Score moyen sur 10 périodes</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0, gap: 6 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 32, color: "#2d9e5f", lineHeight: 1 }}>{avgConf !== null ? `${avgConf}%` : "—"}</div>
            <SparkLine pts={confTrend} color="#2d9e5f" width={180} height={40} />
            <div style={{ fontSize: 10, color: "#9ca3af" }}>Cible : 85%</div>
          </div>
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 12, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f2f4", fontWeight: 700, fontSize: 12, color: "#111" }}>Diagnostics récents</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Référence","Titre","Processus","Auditeur","Date","Statut","Score"].map(h=><th key={h} style={{ padding: "7px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", borderBottom: "1px solid #f0f2f4" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {recent.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#d1d5db" }}>Aucun diagnostic.</td></tr>
            : recent.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #fafafa" }}>
                <td style={{ padding: "8px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{a.ref}</td>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 200 }}>{a.titre}</td>
                <td style={{ padding: "8px 14px", fontSize: 11, color: "#6b7280" }}>{a.processus}</td>
                <td style={{ padding: "8px 14px", fontSize: 11, color: "#6b7280" }}>{a.auditeur}</td>
                <td style={{ padding: "8px 14px", fontSize: 11, color: "#6b7280" }}>{fmtDate(a.datePlan)}</td>
                <td style={{ padding: "8px 14px" }}><StatBadge statut={a.statut} /></td>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, color: a.score >= 80 ? "#166534" : a.score >= 60 ? "#92400e" : a.score !== null ? "#991b1b" : "#9ca3af" }}>{a.score !== null ? `${a.score}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Programme annuel ── */
function TabProgramme({ audits, processusList }) {
  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const procNames = [...new Set(audits.map(a => a.processus).filter(Boolean))];
  return (
    <div style={{ padding: "16px 22px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "white", borderRadius: 12, padding: "14px 16px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>Programme d'audit annuel</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 14 }}>Planification des diagnostics ISO 9001:2015 § 9.2</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #f0f2f4", background: "#fafafa" }}>Processus</th>
                {MONTHS.map(m=><th key={m} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", borderBottom: "1px solid #f0f2f4", whiteSpace: "nowrap", background: "#fafafa" }}>{m.slice(0,3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {procNames.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign: "center", padding: "24px", color: "#d1d5db" }}>Aucun diagnostic.</td></tr>
              ) : procNames.map(proc => {
                const procAudits = audits.filter(a => a.processus === proc);
                return (
                  <tr key={proc} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", whiteSpace: "nowrap" }}>{proc}</td>
                    {MONTHS.map((_, mi) => {
                      const monthAud = procAudits.filter(a => a.datePlan && parseInt(a.datePlan.split("-")[1]) - 1 === mi);
                      return (
                        <td key={mi} style={{ padding: "10px 6px", textAlign: "center" }}>
                          {monthAud.map(a => {
                            const s = STATUTS[a.statut] || {};
                            return <div key={a.id} title={a.titre} style={{ width: 22, height: 22, borderRadius: 5, background: s.bg || "#f3f4f6", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, fontWeight: 800, color: s.color || "#374151" }}>I</span></div>;
                          })}
                          {monthAud.length === 0 && <span style={{ color: "#f0f2f4", fontSize: 10 }}>·</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Calendrier ── */
function TabCalendrier({ audits }) {
  const now = new Date();
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const year = now.getFullYear();
  const firstDay = new Date(year, curMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, curMonth + 1, 0).getDate();
  const getAuditsForDay = (day) => {
    const dateStr = `${year}-${String(curMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return audits.filter(a => a.datePlan === dateStr);
  };
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const today = new Date();

  return (
    <div style={{ padding: "16px 22px 40px" }}>
      <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Calendrier des audits</div>
            <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{MONTHS[curMonth]} {year}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setCurMonth(m => Math.max(0, m-1))} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e8eaed", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 2.5L4 6l3 3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111", minWidth: 100, textAlign: "center" }}>{MONTHS[curMonth]}</span>
            <button onClick={() => setCurMonth(m => Math.min(11, m+1))} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e8eaed", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2.5L8 6l-3 3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS.map(d=><div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9ca3af", padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dayAudits = getAuditsForDay(day);
            const isToday = day === today.getDate() && curMonth === today.getMonth() && year === today.getFullYear();
            return (
              <div key={i} style={{ minHeight: 64, borderRadius: 8, background: isToday ? "#f0fdf4" : "#fafafa", border: `1px solid ${isToday ? "#5ecf7a" : "#f0f2f4"}`, padding: "6px 8px" }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: isToday ? "#1e3d2f" : "#374151", marginBottom: 4 }}>{day}</div>
                {dayAudits.slice(0,2).map(a => { const s = STATUTS[a.statut] || {}; return <div key={a.id} title={a.titre} style={{ fontSize: 9, fontWeight: 700, color: s.color||"#374151", background: s.bg||"#f3f4f6", borderRadius: 4, padding: "1px 5px", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titre.slice(0,16)}…</div>; })}
                {dayAudits.length > 2 && <div style={{ fontSize: 9, color: "#9ca3af" }}>+{dayAudits.length-2}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Drawer ── */
function AuditDrawer({ audit, ncs, onClose, onStatusChange }) {
  const [drawerTab, setDrawerTab] = useState(0);
  const auditNCs = ncs.filter(n => n.auditId === audit.id);
  const NEXT_STATUT = { planifie: "en_cours", en_cours: "valide", valide: "clos" };
  const NEXT_LABEL  = { planifie: "Soumettre l'audit", en_cours: "Valider l'audit", valide: "Clôturer" };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: "white", zIndex: 201, boxShadow: "-8px 0 32px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
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
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #e8eaed", borderRadius: 7, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 2, background: "#f3f5f7", borderRadius: 7, padding: 2, marginTop: 12 }}>
            {["Informations","Non-conformités","Actions"].map((t, i) => (
              <button key={i} onClick={() => setDrawerTab(i)} style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: drawerTab === i ? "white" : "transparent", color: drawerTab === i ? "#1e3d2f" : "#6b7280", boxShadow: drawerTab === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
          {drawerTab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Processus",       value: audit.processus },
                { label: "Auditeur",        value: audit.auditeur },
                { label: "Type",            value: audit.type },
                { label: "Date planifiée",  value: fmtDate(audit.datePlan) },
                { label: "Date de clôture", value: fmtDate(audit.dateFin) },
                { label: "Score",           value: audit.score !== null ? `${audit.score}%` : "Non évalué" },
                { label: "Écarts majeurs",  value: audit.ncMajeurs },
                { label: "Écarts mineurs",  value: audit.ncMineurs },
              ].map(f=>(
                <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8f9fa" }}>
                  <span style={{ fontSize: 11.5, color: "#6b7280" }}>{f.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{f.value}</span>
                </div>
              ))}
              {audit.score !== null && (
                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Score de conformité</div>
                  <div style={{ background: "#f0f2f4", borderRadius: 20, height: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${audit.score}%`, background: audit.score >= 80 ? "#22c55e" : audit.score >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 20, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>0%</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: audit.score >= 80 ? "#166534" : audit.score >= 60 ? "#92400e" : "#991b1b" }}>{audit.score}%</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>100%</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {drawerTab === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditNCs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: 12 }}>Aucune non-conformité enregistrée.</div>
              ) : auditNCs.map(nc => {
                const gs = NC_GRAVITE[nc.gravite] || {};
                const ss = NC_STATUTS[nc.statut] || {};
                return (
                  <div key={nc.id} style={{ background: "#fafafa", border: "1px solid #f0f2f4", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>{nc.ref}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: gs.color, background: gs.bg, padding: "1px 6px", borderRadius: 20 }}>{nc.gravite}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: ss.color, background: ss.bg, padding: "1px 6px", borderRadius: 20 }}>{ss.label || nc.statut}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>{nc.titre}</div>
                    {nc.action && <div style={{ fontSize: 10.5, color: "#374151", fontStyle: "italic" }}>Action : {nc.action}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {drawerTab === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditNCs.filter(n => n.action).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af", fontSize: 12 }}>Aucune action corrective définie.</div>
              ) : auditNCs.filter(n => n.action).map(nc => (
                <div key={nc.id} style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", marginBottom: 4 }}>{nc.ref}</div>
                  <div style={{ fontSize: 12, color: "#111" }}>{nc.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {NEXT_STATUT[audit.statut] && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f2f4", flexShrink: 0 }}>
            <button onClick={() => onStatusChange(audit.id, NEXT_STATUT[audit.statut])} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2d9e5f,#1e6b42)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {NEXT_LABEL[audit.statut]}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Tab: Liste audits ── */
function TabAudits({ audits, ncs, onAuditClick, onStatusChange }) {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const filtered = audits.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.titre.toLowerCase().includes(q) || a.processus.toLowerCase().includes(q) || a.auditeur.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q);
    const matchS = filterStatut === "Tous" || a.statut === filterStatut;
    return matchQ && matchS;
  });
  return (
    <div style={{ padding: "16px 22px 40px" }}>
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 9, padding: "7px 12px", flex: 1, minWidth: 160, maxWidth: 280 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#333", width: "100%", fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tous","planifie","en_cours","valide","clos"].map(f=>(
              <button key={f} onClick={()=>setFilterStatut(f)} style={{ padding: "5px 11px", borderRadius: 7, border: `1.5px solid ${filterStatut===f?"#1e3d2f":"#e8eaed"}`, background: filterStatut===f?"#1e3d2f":"white", color: filterStatut===f?"white":"#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {STATUTS[f]?.label || "Tous"}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}><b style={{ color: "#374151" }}>{filtered.length}</b> audit{filtered.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>{["Référence","Titre","Processus","Auditeur","Type","Date","Statut","Score","NC"].map(h=><th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", background: "#fafafa", borderBottom: "1px solid #f0f2f4", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#d1d5db", fontSize: 13 }}>Aucun audit trouvé.</td></tr>
              ) : filtered.map(a => {
                const nc = a.ncMajeurs + a.ncMineurs;
                return (
                  <tr key={a.id} onClick={()=>onAuditClick(a)} style={{ borderBottom: "1px solid #f8f9fa", cursor: "pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f8fcf9"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{a.ref}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 220 }}>{a.titre}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.processus}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{a.auditeur}</td>
                    <td style={{ padding: "10px 14px" }}><TypeBadge type={a.type} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{fmtDate(a.datePlan)}</td>
                    <td style={{ padding: "10px 14px" }}><StatBadge statut={a.statut} /></td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: a.score>=80?"#166534":a.score>=60?"#92400e":a.score!==null?"#991b1b":"#9ca3af" }}>{a.score !== null ? `${a.score}%` : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{nc > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "2px 8px", borderRadius: 20 }}>{nc} NC</span> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: NC ── */
function TabNC({ ncs, setNcs }) {
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterGrav, setFilterGrav] = useState("Tous");
  const filtered = ncs.filter(n => (filterStatut==="Tous"||n.statut===filterStatut) && (filterGrav==="Tous"||n.gravite===filterGrav));
  const advance = (id) => {
    const wf = { ouvert: "en_cours", en_cours: "verification", verification: "clos" };
    setNcs(prev => prev.map(n => n.id===id && wf[n.statut] ? { ...n, statut: wf[n.statut] } : n));
  };
  const advLabel = { ouvert: "Prendre en charge", en_cours: "Soumettre vérification", verification: "Clôturer" };
  return (
    <div style={{ padding: "16px 22px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Total NC",   value: ncs.length,                                    color: "#374151", bg: "#f3f4f6" },
          { label: "Ouvertes",   value: ncs.filter(n=>n.statut==="ouvert").length,     color: "#991b1b", bg: "#fee2e2" },
          { label: "En cours",   value: ncs.filter(n=>n.statut==="en_cours").length,   color: "#92400e", bg: "#fef3c7" },
          { label: "Clôturées",  value: ncs.filter(n=>n.statut==="clos").length,       color: "#065f46", bg: "#d1fae5" },
        ].map((k,i)=>(
          <div key={i} style={{ background: "white", borderRadius: 10, border: `1px solid ${k.bg}`, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 28, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>Non-conformités &amp; actions correctives</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {["Tous","ouvert","en_cours","verification","clos"].map(f=>(
              <button key={f} onClick={()=>setFilterStatut(f)} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${filterStatut===f?"#1e3d2f":"#e8eaed"}`, background: filterStatut===f?"#1e3d2f":"white", color: filterStatut===f?"white":"#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{NC_STATUTS[f]?.label||"Tous"}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tous","Critique","Majeure","Mineure"].map(f=>(
              <button key={f} onClick={()=>setFilterGrav(f)} style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${filterGrav===f?"#374151":"#e8eaed"}`, background: filterGrav===f?"#374151":"white", color: filterGrav===f?"white":"#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{f}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>{["Réf.","Non-conformité","Gravité","Audit","Statut","Action"].map(h=><th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", background: "#fafafa", borderBottom: "1px solid #f0f2f4", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#d1d5db", fontSize: 13 }}>Aucune non-conformité.</td></tr>
              ) : filtered.map(nc => {
                const gs = NC_GRAVITE[nc.gravite]||{};
                const ss = NC_STATUTS[nc.statut]||{};
                return (
                  <tr key={nc.id} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{nc.ref}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#111", maxWidth: 200 }}>{nc.titre}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, color: gs.color, background: gs.bg, padding: "2px 8px", borderRadius: 20 }}>{nc.gravite}</span></td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{nc.auditRef}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, color: ss.color, background: ss.bg, padding: "2px 8px", borderRadius: 20 }}>{ss.label||nc.statut}</span></td>
                    <td style={{ padding: "10px 14px" }}>
                      {nc.statut !== "clos" && (
                        <button onClick={()=>advance(nc.id)} style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: "#1e3d2f", color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{advLabel[nc.statut]}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Analytiques ── */
function TabAnalytiques({ audits, ncs }) {
  const scores = audits.filter(a=>a.score!==null).map(a=>({ ref: a.ref.slice(-3), score: a.score }));
  const clauseCounts = {};
  ncs.forEach(n => { clauseCounts[n.gravite] = (clauseCounts[n.gravite]||0)+1; });
  return (
    <div style={{ padding: "16px 22px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>Score de conformité par diagnostic</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 16 }}>Diagnostics évalués (score /100)</div>
        {scores.length === 0 ? <div style={{ color: "#d1d5db", fontSize: 12, textAlign: "center", padding: 20 }}>Aucune donnée</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scores.map(({ ref, score }) => (
              <div key={ref}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{ref}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: score>=80?"#166534":score>=60?"#92400e":"#991b1b" }}>{score}%</span>
                </div>
                <div style={{ background: "#f3f4f6", borderRadius: 20, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, background: score>=80?"#22c55e":score>=60?"#f59e0b":"#ef4444", borderRadius: 20 }} />
                </div>
              </div>
            ))}
          </div>
        }
      </div>
      <div style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>Non-conformités par gravité</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 16 }}>Distribution des NC détectées</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["Critique","Majeure","Mineure"].map(g=>{
            const count = ncs.filter(n=>n.gravite===g).length;
            const gs = NC_GRAVITE[g]||{};
            return (
              <div key={g}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: gs.color, background: gs.bg, padding: "1px 8px", borderRadius: 20 }}>{g}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: gs.color }}>{count}</span>
                </div>
                <div style={{ background: "#f3f4f6", borderRadius: 20, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count/Math.max(ncs.length,1))*100}%`, background: gs.color, borderRadius: 20 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>Répartition par statut</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginBottom: 16 }}>Tous les diagnostics</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center" }}>
          <DonutChart segments={[
            { value: audits.filter(a=>a.statut==="planifie").length, color: "#3b82f6" },
            { value: audits.filter(a=>a.statut==="en_cours").length, color: "#f59e0b" },
            { value: audits.filter(a=>["valide","clos"].includes(a.statut)).length, color: "#22c55e" },
          ]} size={100} stroke={20} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{label:"Planifié",color:"#3b82f6"},{label:"En cours",color:"#f59e0b"},{label:"Clôturé",color:"#22c55e"}].map((item,i)=>(
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#374151" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Wizard: Nouvel audit ── */
function NewAuditWizard({ onClose, onSave, processusList, usersList }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ processus_id: "", processus_nom: "", auditeur_id: "", auditeur_nom: "", datePlan: "", commentaire: "" });
  const [clauses, setClauses] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleClause = c => setClauses(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c]);

  const validate0 = () => {
    const e = {};
    if (!form.processus_id) e.processus_id = true;
    if (!form.datePlan) e.datePlan = true;
    setErrors(e); return !Object.keys(e).length;
  };

  const handleNext = () => {
    if (step === 0 && !validate0()) return;
    setStep(s => s + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        processus_id: parseInt(form.processus_id),
        auditeur_id: form.auditeur_id ? parseInt(form.auditeur_id) : null,
        periode_couverte: form.datePlan ? form.datePlan.slice(0, 7) : null,
        commentaire_global: form.commentaire || null,
        initialiser_toutes_clauses: true,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setErrors({ _api: err.message || "Erreur lors de la création" });
      setSaving(false);
    }
  };

  const STEPS = ["Informations", "Auditeur", "Clauses ISO", "Confirmer"];
  const inp = (err) => ({ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${err?"#ef4444":"#e8eaed"}`, background: err?"#fff5f5":"#f9fafb", fontSize: 13, outline: "none", fontFamily:"'Plus Jakarta Sans',sans-serif", boxSizing: "border-box", color: "#111" });
  const lbl = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(3px)" }}>
      <div style={{ background: "white", borderRadius: 18, width: "90%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily:"'Plus Jakarta Sans',sans-serif", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f2f4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>Nouveau diagnostic</div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #e8eaed", borderRadius: 7, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length-1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: i<step?"#2d9e5f":i===step?"#1e3d2f":"#f0f2f4", color: i<=step?"white":"#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                    {i<step?"✓":i+1}
                  </div>
                  <span style={{ fontSize: 9, color: i===step?"#1e3d2f":"#9ca3af", fontWeight: i===step?700:500, whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < STEPS.length-1 && <div style={{ flex: 1, height: 2, background: i<step?"#2d9e5f":"#f0f2f4", margin: "0 6px", marginBottom: 14 }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 24px", minHeight: 260 }}>
          {errors._api && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#991b1b", marginBottom: 12 }}>{errors._api}</div>}

          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Processus *</label>
                <select value={form.processus_id} onChange={e => { const p = processusList.find(p=>p.id===parseInt(e.target.value)); set("processus_id",e.target.value); set("processus_nom",p?.nom||""); }} style={{ ...inp(errors.processus_id), appearance: "none" }}>
                  <option value="">Sélectionner un processus…</option>
                  {processusList.map(p=><option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
                {errors.processus_id && <span style={{ fontSize: 10.5, color: "#ef4444", marginTop: 3, display: "block" }}>Champ requis</span>}
              </div>
              <div>
                <label style={lbl}>Date planifiée *</label>
                <input type="date" value={form.datePlan} onChange={e=>set("datePlan",e.target.value)} style={inp(errors.datePlan)} />
                {errors.datePlan && <span style={{ fontSize: 10.5, color: "#ef4444", marginTop: 3, display: "block" }}>Champ requis</span>}
              </div>
              <div>
                <label style={lbl}>Commentaire / Objectif</label>
                <textarea value={form.commentaire} onChange={e=>set("commentaire",e.target.value)} rows={3} placeholder="Objectif de ce diagnostic…" style={{ ...inp(false), resize: "vertical" }} />
              </div>
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Auditeur responsable</label>
                <select value={form.auditeur_id} onChange={e=>{ const u=usersList.find(u=>u.id===parseInt(e.target.value)); set("auditeur_id",e.target.value); set("auditeur_nom",u?`${u.prenom} ${u.nom}`:""); }} style={{ ...inp(false), appearance: "none" }}>
                  <option value="">— Optionnel —</option>
                  {usersList.map(u=><option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Sélectionnez les clauses ISO 9001 à vérifier :</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {CLAUSES_ISO.map(c=>(
                  <div key={c} onClick={()=>toggleClause(c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${clauses.includes(c)?"#2d9e5f":"#e8eaed"}`, background: clauses.includes(c)?"#f0fdf4":"white", cursor: "pointer" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${clauses.includes(c)?"#2d9e5f":"#d1d5db"}`, background: clauses.includes(c)?"#2d9e5f":"white", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {clauses.includes(c) && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 10.5, color: "#374151", fontWeight: clauses.includes(c)?700:400 }}>{c}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>{clauses.length} clause{clauses.length!==1?"s":""} sélectionnée{clauses.length!==1?"s":""}</div>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 10 }}>Récapitulatif</div>
                {[
                  { label: "Processus",     value: form.processus_nom },
                  { label: "Auditeur",      value: form.auditeur_nom || "Non défini" },
                  { label: "Date planif.",  value: form.datePlan ? new Date(form.datePlan).toLocaleDateString("fr-FR") : "—" },
                  { label: "Clauses",       value: clauses.length > 0 ? `${clauses.length} clauses sélectionnées` : "Toutes les clauses" },
                ].map(f=>(
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #dcfce7" }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{f.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{f.value||"—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #f0f2f4", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <button onClick={step===0?onClose:()=>setStep(s=>s-1)} style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e8eaed", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#6b7280", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {step===0?"Annuler":"Précédent"}
          </button>
          {step < 3 ? (
            <button onClick={handleNext} style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#2d9e5f,#1e6b42)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Suivant</button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#2d9e5f,#1e6b42)", color: "white", fontWeight: 700, fontSize: 13, cursor: saving?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", opacity: saving?0.7:1 }}>
              {saving?"Création…":"Créer le diagnostic"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function AuditsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [audits, setAudits] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [processusList, setProcessusList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [unread] = useState(() => getUnreadCount());

  const user = getCurrentUser();
  const initials = getInitials(user?.nom_complet);

  useEffect(() => {
    Promise.all([
      api.get("/diagnostics/").catch(() => []),
      api.get("/processus/").catch(() => []),
      api.get("/users/").catch(() => []),
    ]).then(([diags, procs, users]) => {
      const mappedAudits = (Array.isArray(diags) ? diags : []).map(mapDiagToAudit);
      setAudits(mappedAudits);
      const allNcs = mappedAudits.flatMap(a => {
        const list = [];
        const ref = a.ref;
        for (let i = 0; i < a.ncMajeurs; i++) list.push({ id: `${a.id}_maj_${i}`, auditId: a.id, auditRef: ref, ref: `EC-MAJ-${i+1}`, titre: `Écart majeur #${i+1}`, gravite: "Majeure", statut: "ouvert", action: "" });
        for (let i = 0; i < a.ncMineurs; i++) list.push({ id: `${a.id}_min_${i}`, auditId: a.id, auditRef: ref, ref: `EC-MIN-${i+1}`, titre: `Écart mineur #${i+1}`, gravite: "Mineure", statut: "ouvert", action: "" });
        return list;
      });
      setNcs(allNcs);
      setProcessusList(Array.isArray(procs) ? procs : []);
      setUsersList(Array.isArray(users) ? users : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleNewAudit = async (payload) => {
    const created = await api.post("/diagnostics/", payload);
    const newAudit = mapDiagToAudit(created);
    setAudits(prev => [newAudit, ...prev]);
  };

  const handleStatusChange = async (auditId, newStatut) => {
    const endpoint = STATUT_ENDPOINT[newStatut];
    if (!endpoint) return;
    try {
      await api.post(`/diagnostics/${auditId}/${endpoint}`, {});
      setAudits(prev => prev.map(a => a.id === auditId ? { ...a, statut: newStatut } : a));
      if (selectedAudit?.id === auditId) setSelectedAudit(prev => ({ ...prev, statut: newStatut }));
    } catch (err) {
      console.error("Transition statut échouée:", err);
    }
  };

  const TABS = ["Tableau de bord","Programme","Calendrier","Audits","NC & Actions","Analytiques"];

  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      {showWizard && <NewAuditWizard onClose={() => setShowWizard(false)} onSave={handleNewAudit} processusList={processusList} usersList={usersList} />}
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      {selectedAudit && <AuditDrawer audit={selectedAudit} ncs={ncs} onClose={() => setSelectedAudit(null)} onStatusChange={handleStatusChange} />}

      {/* Topbar */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ede9", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "sticky", top: 0, zIndex: 50, gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#111", lineHeight: 1 }}>Gestion des audits</div>
          <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>ISO 9001:2015 § 9.2 — Audit interne</div>
        </div>
        <div style={{ display: "flex", gap: 2, background: "#f3f5f7", borderRadius: 8, padding: 3, overflow: "hidden" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: "4px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", background: tab===i?"white":"transparent", color: tab===i?"#1e3d2f":"#6b7280", boxShadow: tab===i?"0 1px 3px rgba(0,0,0,0.08)":"none", whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowWizard(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e3d2f", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 11.5, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nouveau diagnostic
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifs(v=>!v)} style={{ width: 32, height: 32, border: "1px solid #e8eaed", borderRadius: 8, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              {unread > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, background: "#ef4444", borderRadius: "50%", border: "2px solid white" }} />}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 8, padding: "3px 8px 3px 3px", cursor: "pointer" }} onClick={() => navigate("/parametres")}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 9, color: "#152b21" }}>{initials}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>{user?.nom_complet || "Utilisateur"}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 13 }}>Chargement…</div>}
      {!loading && tab === 0 && <TabDashboard audits={audits} ncs={ncs} />}
      {!loading && tab === 1 && <TabProgramme audits={audits} processusList={processusList} />}
      {!loading && tab === 2 && <TabCalendrier audits={audits} />}
      {!loading && tab === 3 && <TabAudits audits={audits} ncs={ncs} onAuditClick={setSelectedAudit} onStatusChange={handleStatusChange} />}
      {!loading && tab === 4 && <TabNC ncs={ncs} setNcs={setNcs} />}
      {!loading && tab === 5 && <TabAnalytiques audits={audits} ncs={ncs} />}
    </div>
  );
}
