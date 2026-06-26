import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

function getInitials(name) {
  if (!name) return "DG";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const STAGES = ["Brouillon","Soumis","Validé","Audit externe","Archivé"];
const STAGE_COLORS = ["#9ca3af","#92400e","#1e40af","#7c3aed","#166534"];
const STAGE_MAP = { brouillon:0, soumis:1, valide:2, audit_externe:3, archive:4 };

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1280 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"20px 24px" },
};

export default function GlobalMonitoring() {
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState("activite");
  const [processus, setProcessus] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [risques, setRisques] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/processus/").catch(() => []),
      api.get("/diagnostics/").catch(() => []),
      api.get("/risques/").catch(() => []),
      api.get("/actions/").catch(() => []),
    ]).then(([procs, diags, rqs, acts]) => {
      setProcessus(Array.isArray(procs) ? procs : (procs?.items || []));
      setDiagnostics(Array.isArray(diags) ? diags : (diags?.items || []));
      setRisques(Array.isArray(rqs) ? rqs : (rqs?.items || []));
      setActions(Array.isArray(acts) ? acts : (acts?.items || []));
      setLoading(false);
    });
  }, []);

  const activityFeed = [
    ...diagnostics.map(d => ({
      action: d.statut === "valide" ? "Diagnostic validé" : d.statut === "soumis" ? "Diagnostic soumis" : "Diagnostic créé",
      process: d.processus?.nom || "—",
      role: d.auditeur ? `${d.auditeur.prenom} ${d.auditeur.nom}` : "Auditeur",
      date: d.date_diagnostic,
      color: d.statut === "valide" ? "#166534" : "#1e40af",
      icon: d.statut === "valide" ? "✅" : "📝",
    })),
    ...actions.map(a => ({
      action: `Action ${a.statut}`,
      process: a.processus_nom || "—",
      role: a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "Responsable",
      date: a.date_creation,
      color: a.statut === "close" ? "#166534" : "#92400e",
      icon: a.statut === "close" ? "✅" : "🔄",
    })),
  ].filter(a => a.date).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const processStages = processus.map(p => {
    const procDiags = diagnostics.filter(d => d.processus_id === p.id);
    const latest = procDiags.sort((a,b) => new Date(b.date_diagnostic) - new Date(a.date_diagnostic))[0];
    const stage = latest ? (STAGE_MAP[latest.statut] ?? 0) : 0;
    const nc = latest ? (latest.nb_ecarts_majeurs || 0) : 0;
    return {
      name: p.nom,
      stage,
      stageLabel: STAGES[stage],
      score: latest ? Math.round(latest.score_global) : Math.round(p.score_maturite || 0),
      nc,
    };
  });

  const alerts = [];
  risques.filter(r => r.criticite === "critique" && r.est_actif !== false).forEach(r => {
    alerts.push({ type:"urgent", title:`Risque critique : ${r.titre}`, desc:`${r.processus_nom || ""} — RPN ${r.rpn}.`, date: r.date_identification });
  });
  actions.filter(a => a.est_en_retard).forEach(a => {
    alerts.push({ type:"warning", title:`Action en retard : ${a.titre}`, desc:`${a.processus_nom || ""} — échéance dépassée.`, date: a.date_echeance });
  });
  diagnostics.filter(d => d.statut === "soumis" && d.nb_ecarts_majeurs > 0).forEach(d => {
    alerts.push({ type:"info", title:`Diagnostic en attente de validation`, desc:`${d.processus?.nom || ""} — ${d.nb_ecarts_majeurs} écart(s) majeur(s).`, date: d.date_diagnostic });
  });

  const tabs = [
    { key:"activite",  label:"Activité des processus" },
    { key:"processus", label:"Vue par processus" },
    { key:"alertes",   label:"Alertes & anomalies", badge: alerts.length },
  ];

  const stageCounts = STAGES.map((_, i) => processStages.filter(p => p.stage === i).length);

  return (
    <div style={S.page}>
      <Topbar title="Supervision globale" userName={user?.nom_complet || "Direction"} userRole="Direction" userInitials={getInitials(user?.nom_complet)} />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Supervision globale</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Activité en temps réel de tous les rôles et processus.</p>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Pipeline des diagnostics ISO 9001</div>
          <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto" }}>
            {STAGES.map((stage, i) => (
              <div key={stage} style={{ display:"flex", alignItems:"center", flex:1, minWidth:120 }}>
                <div style={{ flex:1, textAlign:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:STAGE_COLORS[i], color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, margin:"0 auto 6px" }}>{i+1}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:STAGE_COLORS[i] }}>{stage}</div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{stageCounts[i]} processus</div>
                </div>
                {i < STAGES.length - 1 && <div style={{ width:32, height:2, background:`linear-gradient(90deg,${STAGE_COLORS[i]},${STAGE_COLORS[i+1]})`, flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:4, marginBottom:16, background:"#fff", borderRadius:10, padding:4, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", width:"fit-content" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:"8px 18px", borderRadius:8, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", background:activeTab===t.key?"#f0fdf4":"transparent", color:activeTab===t.key?"#166534":"#9ca3af", display:"flex", alignItems:"center", gap:6 }}>
              {t.label}
              {t.badge > 0 && <span style={{ background:"#fee2e2", color:"#991b1b", borderRadius:20, padding:"0 7px", fontSize:10, fontWeight:800 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {activeTab === "activite" && (
          <div style={S.card}>
            {activityFeed.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px", color:"#9ca3af" }}>{loading ? "Chargement..." : "Aucune activité récente."}</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {activityFeed.map((a, i) => (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 0", borderBottom: i < activityFeed.length-1 ? "1px solid #f0f2f4" : "none" }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${a.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a2e22" }}>{a.action}</div>
                      <div style={{ fontSize:12, color:"#6b8c75" }}>{a.process}</div>
                      <div style={{ fontSize:11, color:a.color, fontWeight:600, marginTop:2 }}>{a.role}</div>
                    </div>
                    <span style={{ fontSize:11, color:"#9ca3af", flexShrink:0 }}>{new Date(a.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "processus" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {processStages.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", color:"#9ca3af" }}>Aucun processus.</div>
            ) : processStages.map((p) => (
              <div key={p.name} style={{ ...S.card, display:"flex", alignItems:"center", gap:16, padding:"18px 24px", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22" }}>{p.name}</div>
                </div>
                <div style={{ display:"flex", gap:2, alignItems:"center" }}>
                  {STAGES.map((s, i) => (
                    <div key={s} style={{ display:"flex", alignItems:"center", gap:2 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background: i <= p.stage ? STAGE_COLORS[i] : "#e5e7eb" }} title={s} />
                      {i < STAGES.length-1 && <div style={{ width:16, height:2, background: i < p.stage ? "#22c55e" : "#e5e7eb" }} />}
                    </div>
                  ))}
                </div>
                <span style={{ background:`${STAGE_COLORS[p.stage]}18`, color:STAGE_COLORS[p.stage], borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{p.stageLabel}</span>
                <div style={{ fontSize:13, fontWeight:700, color: p.score >= 80?"#166534":p.score>=60?"#92400e":"#991b1b" }}>{p.score}%</div>
                {p.nc > 0 && <span style={{ background:"#fee2e2", color:"#991b1b", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{p.nc} NC</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "alertes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {alerts.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", color:"#9ca3af" }}>Aucune alerte active.</div>
            ) : alerts.map((a, i) => {
              const styles = { urgent:{ border:"#fecaca", bg:"#fff5f5", icon:"🚨", color:"#991b1b" }, warning:{ border:"#fde68a", bg:"#fffbeb", icon:"⚠️", color:"#92400e" }, info:{ border:"#bfdbfe", bg:"#eff6ff", icon:"ℹ️", color:"#1e40af" } };
              const s = styles[a.type];
              return (
                <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:"16px 20px", display:"flex", gap:12, alignItems:"flex-start" }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:s.color, marginBottom:4 }}>{a.title}</div>
                    <div style={{ fontSize:13, color:"#4b6358" }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#9ca3af", flexShrink:0 }}>{a.date ? new Date(a.date).toLocaleDateString("fr-FR") : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
