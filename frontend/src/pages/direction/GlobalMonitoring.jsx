import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const ACTIVITY_FEED = [
  { role:"Auditeur Externe",  action:"Rapport d'audit soumis",            process:"Audit interne",         date:"Aujourd'hui, 14:20", icon:"📤", color:"#5b21b6" },
  { role:"Auditeur Interne",  action:"Fiche validée internement",         process:"Formation du personnel", date:"Aujourd'hui, 11:05", icon:"✅", color:"#166534" },
  { role:"Préparateur",       action:"Version 3 soumise",                 process:"Formation du personnel", date:"Hier, 16:42",        icon:"📝", color:"#1e40af" },
  { role:"Auditeur Interne",  action:"Corrections demandées",             process:"Gestion des achats",    date:"Hier, 10:17",        icon:"🔄", color:"#92400e" },
  { role:"Direction",         action:"Audit externe lancé",               process:"Gestion des NC",        date:"22/06/2026",         icon:"🚀", color:"#7c3aed" },
  { role:"Préparateur",       action:"Nouvelle fiche créée",              process:"Contrôle qualité labo", date:"21/06/2026",         icon:"📋", color:"#1e40af" },
  { role:"Auditeur Externe",  action:"Non-conformité majeure détectée",   process:"Gestion des achats",    date:"20/06/2026",         icon:"⚠️", color:"#991b1b" },
];

const PROCESS_STAGES = [
  { name:"Gestion des achats",         stage:3, stageLabel:"Audit externe",   score:62, nc:2 },
  { name:"Formation du personnel",     stage:2, stageLabel:"Validé AI",        score:91, nc:0 },
  { name:"Contrôle qualité labo",      stage:1, stageLabel:"Révision interne", score:65, nc:1 },
  { name:"Gestion des NC",             stage:3, stageLabel:"Audit externe",    score:81, nc:1 },
  { name:"Audit interne",              stage:4, stageLabel:"Certifié",         score:88, nc:0 },
];

const ALERTS = [
  { type:"urgent",  title:"2 NC majeures non traitées",       desc:"Gestion des achats — Clause 8.4 et 7.5. Action requise dans les 7 jours.", date:"23/06/2026" },
  { type:"warning", title:"3 audits externes non démarrés",    desc:"Formation du personnel, Contrôle qualité labo — Date prévue dépassée.",   date:"22/06/2026" },
  { type:"info",    title:"Rapport d'audit reçu",              desc:"Benmoussa Sarah a soumis le rapport d'audit — Audit interne.",           date:"Aujourd'hui" },
];

const STAGES = ["Brouillon","Révision AI","Validé AI","Audit Externe","Certifié"];
const STAGE_COLORS = ["#9ca3af","#92400e","#1e40af","#5b21b6","#166534"];

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1280 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"20px 24px" },
};

export default function GlobalMonitoring() {
  const [activeTab, setActiveTab] = useState("activite");
  const [dateFilter, setDateFilter] = useState("mois");

  const tabs = [
    { key:"activite",  label:"Activité des processus" },
    { key:"processus", label:"Vue par processus" },
    { key:"alertes",   label:"Alertes & anomalies", badge: ALERTS.length },
  ];

  return (
    <div style={S.page}>
      <Topbar title="Supervision globale" userName="Directeur Général" userRole="Direction" userInitials="DG" />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Supervision globale</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Activité en temps réel de tous les rôles et processus.</p>
          </div>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding:"9px 16px", borderRadius:10, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit", background:"#fff" }}>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>
        </div>

        {/* Workflow pipeline */}
        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Pipeline de certification ISO 9001</div>
          <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto" }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ display:"flex", alignItems:"center", flex:1, minWidth:120 }}>
                <div style={{ flex:1, textAlign:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:STAGE_COLORS[i], color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, margin:"0 auto 6px" }}>{i+1}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:STAGE_COLORS[i] }}>{stage}</div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>
                    {[5,5,2,2,1][i]} processus
                  </div>
                </div>
                {i < STAGES.length - 1 && <div style={{ width:32, height:2, background:`linear-gradient(90deg,${STAGE_COLORS[i]},${STAGE_COLORS[i+1]})`, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"#fff", borderRadius:10, padding:4, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", width:"fit-content" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:"8px 18px", borderRadius:8, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", background:activeTab===t.key?"#f0fdf4":"transparent", color:activeTab===t.key?"#166534":"#9ca3af", display:"flex", alignItems:"center", gap:6 }}>
              {t.label}
              {t.badge && <span style={{ background:"#fee2e2", color:"#991b1b", borderRadius:20, padding:"0 7px", fontSize:10, fontWeight:800 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* Activité */}
        {activeTab === "activite" && (
          <div style={S.card}>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {ACTIVITY_FEED.map((a, i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 0", borderBottom: i < ACTIVITY_FEED.length-1 ? "1px solid #f0f2f4" : "none" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${a.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1a2e22" }}>{a.action}</div>
                    <div style={{ fontSize:12, color:"#6b8c75" }}>{a.process}</div>
                    <div style={{ fontSize:11, color:a.color, fontWeight:600, marginTop:2 }}>{a.role}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#9ca3af", flexShrink:0 }}>{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vue processus */}
        {activeTab === "processus" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {PROCESS_STAGES.map((p) => (
              <div key={p.name} style={{ ...S.card, display:"flex", alignItems:"center", gap:16, padding:"18px 24px", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22" }}>{p.name}</div>
                </div>
                {/* Stage progress */}
                <div style={{ display:"flex", gap:2, alignItems:"center" }}>
                  {STAGES.map((s, i) => (
                    <div key={s} style={{ display:"flex", alignItems:"center", gap:2 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background: i < p.stage ? STAGE_COLORS[i] : (i===p.stage?"#e5e7eb":"#e5e7eb"), border: i===p.stage-1?`2px solid ${STAGE_COLORS[i]}`:"2px solid transparent" }} title={s} />
                      {i < STAGES.length-1 && <div style={{ width:16, height:2, background: i < p.stage-1 ? "#22c55e" : "#e5e7eb" }} />}
                    </div>
                  ))}
                </div>
                <span style={{ background:`${STAGE_COLORS[p.stage-1]}18`, color:STAGE_COLORS[p.stage-1], borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{p.stageLabel}</span>
                <div style={{ fontSize:13, fontWeight:700, color: p.score >= 80?"#166534":p.score>=60?"#92400e":"#991b1b" }}>{p.score}%</div>
                {p.nc > 0 && <span style={{ background:"#fee2e2", color:"#991b1b", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{p.nc} NC</span>}
              </div>
            ))}
          </div>
        )}

        {/* Alertes */}
        {activeTab === "alertes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {ALERTS.map((a, i) => {
              const styles = { urgent:{ border:"#fecaca", bg:"#fff5f5", icon:"🚨", color:"#991b1b" }, warning:{ border:"#fde68a", bg:"#fffbeb", icon:"⚠️", color:"#92400e" }, info:{ border:"#bfdbfe", bg:"#eff6ff", icon:"ℹ️", color:"#1e40af" } };
              const s = styles[a.type];
              return (
                <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:"16px 20px", display:"flex", gap:12, alignItems:"flex-start" }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:s.color, marginBottom:4 }}>{a.title}</div>
                    <div style={{ fontSize:13, color:"#4b6358" }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#9ca3af", flexShrink:0 }}>{a.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
