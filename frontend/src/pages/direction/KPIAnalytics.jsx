import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const CLAUSE_COMPLIANCE = [
  { group:"4.x Contexte",      req:8,  met:7,  pct:87 },
  { group:"5.x Leadership",    req:6,  met:5,  pct:83 },
  { group:"6.x Planification", req:6,  met:4,  pct:67 },
  { group:"7.x Support",       req:10, met:7,  pct:70 },
  { group:"8.x Réalisation",   req:14, met:9,  pct:64 },
  { group:"9.x Évaluation",    req:8,  met:7,  pct:87 },
  { group:"10.x Amélioration", req:4,  met:3,  pct:75 },
];

const MATURITY = [
  { process:"Formation du personnel",     owner:"Hadj Ali Farida",  level:4, score:91, rec:"Maintenir et documenter les bonnes pratiques." },
  { process:"Audit interne",              owner:"Bensalem Hocine",  level:4, score:88, rec:"Étendre le programme à tous les départements." },
  { process:"Gestion des NC",            owner:"Mekki Younes",     level:3, score:81, rec:"Améliorer les délais de clôture des NC." },
  { process:"Gestion des achats",        owner:"Benchikh Mohamed", level:2, score:62, rec:"Formaliser les critères fournisseurs (§8.4)." },
  { process:"Contrôle qualité labo",     owner:"Sahraoui Nadia",   level:2, score:65, rec:"Documenter les protocoles et calibrations." },
];

const TREND_DATA = {
  compliance:[65,68,70,72,75,78],
  nc:[8,6,5,7,4,3],
  months:["Jan","Fév","Mar","Avr","Mai","Juin"],
};

function MiniLineChart({ data, color="#22c55e", w=220, h=60 }) {
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

export default function KPIAnalytics() {
  const [dateRange, setDateRange] = useState("mois");

  return (
    <div style={S.page}>
      <Topbar title="Analytique KPI" userName="Directeur Général" userRole="Direction" userInitials="DG" />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Analytique avancée</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Indicateurs stratégiques de performance qualité.</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ padding:"9px 16px", borderRadius:10, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit", background:"#fff" }}>
              <option value="mois">Ce mois</option>
              <option value="trimestre">Ce trimestre</option>
              <option value="annee">Cette année</option>
            </select>
            <button style={{ background:"#2D604F", color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontSize:12, fontWeight:700, cursor:"pointer" }}>📥 Exporter</button>
          </div>
        </div>

        {/* Section 1 — ISO Clause compliance */}
        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Conformité par groupe de clauses ISO 9001</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                {["Groupe de clauses","Exigences totales","Satisfaites","% Conformité","Tendance"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLAUSE_COMPLIANCE.map((c) => (
                <tr key={c.group} style={{ borderBottom:"1px solid #f8f9fa" }}>
                  <td style={{ padding:"13px 14px", fontWeight:600, color:"#1a2e22" }}>{c.group}</td>
                  <td style={{ padding:"13px 14px", textAlign:"center", color:"#4b6358" }}>{c.req}</td>
                  <td style={{ padding:"13px 14px", textAlign:"center", fontWeight:700, color:"#166534" }}>{c.met}</td>
                  <td style={{ padding:"13px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, height:8, background:"#f0f2f4", borderRadius:4, overflow:"hidden" }}>
                        <div style={{ width:`${c.pct}%`, height:"100%", background:c.pct>=80?"#22c55e":c.pct>=65?"#f59e0b":"#ef4444", borderRadius:4 }} />
                      </div>
                      <span style={{ fontWeight:800, fontSize:13, color:c.pct>=80?"#166534":c.pct>=65?"#92400e":"#991b1b", minWidth:36 }}>{c.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"13px 14px", color:c.pct>=75?"#166534":"#991b1b", fontWeight:700, fontSize:16 }}>{c.pct>=75?"↑":"↓"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2 — Process maturity */}
        <div style={{ ...S.card, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Matrice de maturité des processus</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                {["Processus","Propriétaire","Niveau (1–5)","Score","Recommandation"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATURITY.map((m) => (
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
        </div>

        {/* Section 3 — Trend charts */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:4 }}>Évolution conformité</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>6 derniers mois · +13 points</div>
            <MiniLineChart data={TREND_DATA.compliance} color="#22c55e" w={320} h={80} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              {TREND_DATA.months.map((m,i) => (
                <div key={m} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>{m}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#166534" }}>{TREND_DATA.compliance[i]}%</div>
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:4 }}>Non-conformités mensuelles</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>6 derniers mois · tendance baissière ↓</div>
            <MiniLineChart data={TREND_DATA.nc} color="#ef4444" w={320} h={80} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              {TREND_DATA.months.map((m,i) => (
                <div key={m} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>{m}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#991b1b" }}>{TREND_DATA.nc[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4 — Audit performance */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Performance des audits — Comparatif Interne vs Externe</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[
              { type:"Audits Internes", done:12, success:10, rate:83, avgDays:14, color:"#1e40af" },
              { type:"Audits Externes", done:4,  success:3,  rate:75, avgDays:21, color:"#7c3aed" },
            ].map((a) => (
              <div key={a.type} style={{ background:"#fafafa", borderRadius:12, padding:"18px 20px", border:"1px solid #f0f2f4" }}>
                <div style={{ fontSize:14, fontWeight:700, color:a.color, marginBottom:14 }}>{a.type}</div>
                {[["Réalisés",a.done],["Succès",a.success],["Taux de réussite",`${a.rate}%`],["Durée moyenne",`${a.avgDays} jours`]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:13, color:"#4b6358" }}>{k}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:a.color }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:10, height:8, background:"#f0f2f4", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${a.rate}%`, height:"100%", background:a.color, borderRadius:4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
