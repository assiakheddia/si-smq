import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

function getInitials(name) {
  if (!name) return "DG";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function MiniLineChart({ data, color="#22c55e", w=220, h=60 }) {
  if (!data || data.length < 2) return <div style={{ color:"#9ca3af", fontSize:12, padding:10 }}>Pas assez de données</div>;
  const max=Math.max(...data), min=Math.min(...data)-2, range=max-min||1;
  const pts=data.map((v,i)=>{const x=(i/(data.length-1))*(w-10)+5;const y=h-((v-min)/range)*(h-10)-5;return`${x},${y}`;}).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{data.map((v,i)=>{const x=(i/(data.length-1))*(w-10)+5;const y=h-((v-min)/range)*(h-10)-5;return<circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>;})}</svg>;
}

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1280 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"22px 26px" },
};

function MaturityStars({ level }) {
  return (
    <div style={{ display:"flex", gap:3 }}>
      {[1,2,3,4,5].map((s) => (
        <div key={s} style={{ width:14, height:14, borderRadius:3, background:s<=level?"#f59e0b":"#f0f2f4" }} />
      ))}
    </div>
  );
}

function levelFromScore(score) {
  if (score >= 80) return 5;
  if (score >= 65) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

function recoFromScore(score) {
  if (score >= 80) return "Maintenir et documenter les bonnes pratiques.";
  if (score >= 65) return "Consolider les points faibles restants.";
  if (score >= 50) return "Plan d'action requis sur les écarts identifiés.";
  return "Action corrective prioritaire — risque de non-conformité.";
}

export default function KPIAnalytics() {
  const user = getCurrentUser();
  const [processus, setProcessus] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [indicateurs, setIndicateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/processus/").catch(() => []),
      api.get("/diagnostics/").catch(() => []),
      api.get("/indicateurs/").catch(() => []),
    ]).then(([procs, diags, inds]) => {
      setProcessus(Array.isArray(procs) ? procs : (procs?.items || []));
      setDiagnostics(Array.isArray(diags) ? diags : (diags?.items || []));
      setIndicateurs(Array.isArray(inds) ? inds : (inds?.items || []));
      setLoading(false);
    });
  }, []);

  const totalClauses = diagnostics.reduce((s,d) => s + (d.nb_clauses_evaluees || 0), 0);
  const totalConformes = diagnostics.reduce((s,d) => s + (d.nb_clauses_conformes || 0), 0);
  const globalCompliancePct = totalClauses ? Math.round((totalConformes / totalClauses) * 100) : 0;

  const maturity = processus.map(p => {
    const procDiags = diagnostics.filter(d => d.processus_id === p.id);
    const best = procDiags.sort((a,b) => b.score_global - a.score_global)[0];
    const score = best ? Math.round(best.score_global) : Math.round(p.score_maturite || 0);
    return {
      process: p.nom,
      owner: p.pilote ? `${p.pilote.prenom} ${p.pilote.nom}` : "—",
      level: levelFromScore(score),
      score,
      rec: recoFromScore(score),
    };
  }).sort((a,b) => b.score - a.score);

  const sortedDiags = [...diagnostics].sort((a,b) => new Date(a.date_diagnostic) - new Date(b.date_diagnostic));
  const last6 = sortedDiags.slice(-6);
  const complianceTrend = last6.map(d => Math.round(d.score_global));
  const complianceMonths = last6.map(d => new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { month:"short" }));

  const ncByDiag = {};
  diagnostics.forEach(d => {
    const m = new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { month:"short" });
    ncByDiag[m] = (ncByDiag[m] || 0) + (d.nb_ecarts_majeurs || 0);
  });
  const ncMonths = Object.keys(ncByDiag).slice(-6);
  const ncTrend = ncMonths.map(m => ncByDiag[m]);

  const internes = diagnostics.length;
  const internesSuccess = diagnostics.filter(d => d.score_global >= 70).length;
  const internesRate = internes ? Math.round((internesSuccess / internes) * 100) : 0;
  const internesAvgDays = "—";

  const kpiAlertes = indicateurs.filter(k => k.statut_alerte_actuel === "alerte").length;
  const kpiAttention = indicateurs.filter(k => k.statut_alerte_actuel === "attention").length;

  return (
    <div style={S.page}>
      <Topbar title="Analytique KPI" userName={user?.nom_complet || "Direction"} userRole="Direction" userInitials={getInitials(user?.nom_complet)} />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Analytique avancée</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Indicateurs stratégiques de performance qualité.</p>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Conformité globale des clauses évaluées</div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ fontSize:40, fontWeight:800, color: globalCompliancePct>=80?"#166534":globalCompliancePct>=65?"#92400e":"#991b1b" }}>{globalCompliancePct}%</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:"#4b6358", marginBottom:6 }}>{totalConformes} clauses conformes sur {totalClauses} évaluées (tous diagnostics)</div>
              <div style={{ height:10, background:"#f0f2f4", borderRadius:5, overflow:"hidden" }}>
                <div style={{ width:`${globalCompliancePct}%`, height:"100%", background:globalCompliancePct>=80?"#22c55e":globalCompliancePct>=65?"#f59e0b":"#ef4444", borderRadius:5 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Matrice de maturité des processus</div>
          {maturity.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px", color:"#9ca3af" }}>{loading ? "Chargement..." : "Aucun processus."}</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                  {["Processus","Propriétaire","Niveau (1–5)","Score","Recommandation"].map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maturity.map((m) => (
                  <tr key={m.process} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"13px 14px", fontWeight:700, color:"#1a2e22" }}>{m.process}</td>
                    <td style={{ padding:"13px 14px", color:"#4b6358" }}>{m.owner}</td>
                    <td style={{ padding:"13px 14px" }}><MaturityStars level={m.level} /></td>
                    <td style={{ padding:"13px 14px", fontWeight:800, color: m.score>=80?"#166534":m.score>=65?"#92400e":"#991b1b" }}>{m.score}%</td>
                    <td style={{ padding:"13px 14px", fontSize:12, color:"#4b6358" }}>{m.rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:4 }}>Évolution conformité (diagnostics)</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>{complianceTrend.length} derniers diagnostics</div>
            <MiniLineChart data={complianceTrend} color="#22c55e" w={320} h={80} />
            {complianceTrend.length > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                {complianceMonths.map((m,i) => (
                  <div key={i} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>{m}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#166534" }}>{complianceTrend[i]}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:4 }}>Non-conformités majeures</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>Par mois des diagnostics</div>
            <MiniLineChart data={ncTrend} color="#ef4444" w={320} h={80} />
            {ncTrend.length > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                {ncMonths.map((m,i) => (
                  <div key={i} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>{m}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#991b1b" }}>{ncTrend[i]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Performance des diagnostics & KPI</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div style={{ background:"#fafafa", borderRadius:12, padding:"18px 20px", border:"1px solid #f0f2f4" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#1e40af", marginBottom:14 }}>Diagnostics ISO 9001</div>
              {[["Réalisés",internes],["Score ≥ 70%",internesSuccess],["Taux de réussite",`${internesRate}%`]].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:13, color:"#4b6358" }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1e40af" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:10, height:8, background:"#f0f2f4", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${internesRate}%`, height:"100%", background:"#1e40af", borderRadius:4 }} />
              </div>
            </div>
            <div style={{ background:"#fafafa", borderRadius:12, padding:"18px 20px", border:"1px solid #f0f2f4" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#7c3aed", marginBottom:14 }}>Indicateurs (KPI)</div>
              {[["Total KPI",indicateurs.length],["En attention",kpiAttention],["En alerte",kpiAlertes]].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:13, color:"#4b6358" }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:700, color: k==="En alerte" && v>0 ? "#991b1b" : k==="En attention" && v>0 ? "#92400e" : "#7c3aed" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
