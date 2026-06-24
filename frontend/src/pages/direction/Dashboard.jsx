import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

function getInitials(name) {
  if (!name) return "DG";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function LineChart({ data, width=380, height=100, color="#22c55e" }) {
  if (!data || !data.length) return <div style={{ color:"#9ca3af", fontSize:12, textAlign:"center", padding:20 }}>Aucune donnée</div>;
  const max = Math.max(...data);
  const min = Math.min(...data) - 5;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - 20) + 10;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v, i) => {
        const x = (i / (data.length - 1 || 1)) * (width - 20) + 10;
        const y = height - ((v - min) / range) * (height - 20) - 10;
        return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="2"/>;
      })}
    </svg>
  );
}

function BarChart({ data, labels, width=380, height=80, color="#3b82f6" }) {
  if (!data || !data.length) return <div style={{ color:"#9ca3af", fontSize:12, textAlign:"center", padding:20 }}>Aucune donnée</div>;
  const max = Math.max(...data, 1);
  const barW = (width - 20) / data.length - 8;
  return (
    <svg width={width} height={height + 20} style={{ overflow:"visible" }}>
      {data.map((v, i) => {
        const bh = (v / max) * height;
        const x = (i * (barW + 8)) + 10;
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={barW} height={bh} rx="4" fill={color} fillOpacity="0.8"/>
            <text x={x + barW/2} y={height + 16} textAnchor="middle" fontSize="10" fill="#9ca3af">{labels[i]}</text>
            <text x={x + barW/2} y={height - bh - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

const STATUS_BADGE = {
  "actif":     { bg:"#dcfce7", color:"#166534", label:"Actif" },
  "inactif":   { bg:"#f3f4f6", color:"#374151", label:"Inactif" },
  "brouillon": { bg:"#f3f4f6", color:"#374151", label:"Brouillon" },
};

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1360 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"20px 24px" },
  h2:{ fontSize:13, fontWeight:700, color:"#6b8c75", textTransform:"uppercase", letterSpacing:1, marginBottom:14 },
};

export default function DirDashboard() {
  const user = getCurrentUser();
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

  const scores = diagnostics.filter(d => d.score_global > 0).map(d => d.score_global);
  const tauxConformite = scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length) : 0;
  const fichesValidees = diagnostics.filter(d => ["valide","archive"].includes(d.statut)).length;
  const ncOuvertes = risques.filter(r => r.est_actif !== false && r.statut !== "clos").length;
  const actionsCorrectives = actions.filter(a => a.type === "corrective" && !["close","annulee"].includes(a.statut)).length;

  const auditsInternes = diagnostics.filter(d => ["valide","archive"].includes(d.statut)).length;
  const auditsExternes = diagnostics.filter(d => d.statut === "archive").length;
  const auditsEnAttente = diagnostics.filter(d => d.statut === "brouillon").length;
  const tauxReussite = diagnostics.length ? Math.round((diagnostics.filter(d => d.score_global >= 70).length / diagnostics.length) * 100) : 0;

  const QUALITY_KPI = [
    { label:"Taux de conformité",      value:`${tauxConformite}%`, color:"#166534", bg:"#dcfce7" },
    { label:"Fiches validées",          value:String(fichesValidees), color:"#1e40af", bg:"#dbeafe" },
    { label:"Non-conformités ouvertes", value:String(ncOuvertes), color:"#991b1b", bg:"#fee2e2" },
    { label:"Actions correctives",      value:String(actionsCorrectives), color:"#92400e", bg:"#fef3c7" },
  ];
  const AUDIT_KPI = [
    { label:"Audits internes complétés", value:String(auditsInternes), color:"#166534", bg:"#dcfce7" },
    { label:"Audits externes complétés", value:String(auditsExternes), color:"#5b21b6", bg:"#ede9fe" },
    { label:"Audits en attente",         value:String(auditsEnAttente), color:"#92400e", bg:"#fef3c7" },
    { label:"Taux de réussite",          value:`${tauxReussite}%`, color:"#166534", bg:"#dcfce7" },
  ];

  const sortedDiags = [...diagnostics].sort((a,b) => new Date(a.date_diagnostic) - new Date(b.date_diagnostic));
  const last6 = sortedDiags.slice(-6);
  const complianceTrend = last6.length ? last6.map(d => Math.round(d.score_global)) : [];
  const complianceMonths = last6.length ? last6.map(d => new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { month:"short" })) : [];

  const ncByMonth = {};
  diagnostics.forEach(d => {
    const m = new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { month:"short", year:"2-digit" });
    ncByMonth[m] = (ncByMonth[m] || 0) + (d.nb_ecarts_majeurs || 0);
  });
  const ncMonths = Object.keys(ncByMonth).slice(-6);
  const ncValues = ncMonths.map(m => ncByMonth[m]);

  const processTable = processus.slice(0, 8).map(p => ({
    name: p.nom,
    owner: p.pilote ? `${p.pilote.prenom} ${p.pilote.nom}` : "—",
    status: p.statut,
    versions: p.nb_diagnostics || 0,
    updated: "—",
    nbRisques: p.nb_risques_actifs || 0,
    nbActions: p.nb_actions_ouvertes || 0,
  }));

  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord exécutif" userName={user?.nom_complet || "Direction"} userRole="Direction" userInitials={getInitials(user?.nom_complet)} />
      <div style={S.inner}>

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Vue exécutive — Qualité ISO 9001</h1>
          <p style={{ fontSize:13.5, color:"#5a7a66" }}>Supervision globale du système de management de la qualité</p>
        </div>

        <div style={S.h2}>Indicateurs qualité</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {QUALITY_KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft:`4px solid ${k.color}`, padding:"18px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{loading ? "—" : k.value}</div>
            </div>
          ))}
        </div>

        <div style={S.h2}>Indicateurs d'audit</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {AUDIT_KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft:`4px solid ${k.color}`, padding:"18px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{loading ? "—" : k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Évolution de la conformité</div>
            {complianceTrend.length ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9ca3af", marginBottom:8 }}>
                  {complianceMonths.map((m,i) => <span key={i}>{m}</span>)}
                </div>
                <LineChart data={complianceTrend} color="#22c55e" />
                <div style={{ display:"flex", gap:16, marginTop:12 }}>
                  {complianceTrend.map((v,i) => (
                    <div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:11, fontWeight:700, color:"#166534" }}>{v}%</div></div>
                  ))}
                </div>
              </>
            ) : <div style={{ color:"#9ca3af", fontSize:12, textAlign:"center", padding:30 }}>Pas assez de diagnostics pour une tendance.</div>}
          </div>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Non-conformités majeures (diagnostics)</div>
            <BarChart data={ncValues} labels={ncMonths} color="#ef4444" />
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Vue d'ensemble des processus</div>
          {processTable.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px", color:"#9ca3af" }}>Aucun processus.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                  {["Processus","Propriétaire","Statut","Diagnostics","Risques actifs","Actions ouvertes"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processTable.map((p, i) => {
                  const bs = STATUS_BADGE[p.status] || STATUS_BADGE["brouillon"];
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid #f8f9fa" }}>
                      <td style={{ padding:"13px 14px", fontWeight:700, color:"#1a2e22" }}>{p.name}</td>
                      <td style={{ padding:"13px 14px", color:"#4b6358" }}>{p.owner}</td>
                      <td style={{ padding:"13px 14px" }}><span style={{ background:bs.bg, color:bs.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{bs.label}</span></td>
                      <td style={{ padding:"13px 14px", textAlign:"center" }}><span style={{ background:"#f3f4f6", color:"#374151", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{p.versions}</span></td>
                      <td style={{ padding:"13px 14px", textAlign:"center", color: p.nbRisques > 0 ? "#991b1b" : "#9ca3af", fontWeight:700 }}>{p.nbRisques}</td>
                      <td style={{ padding:"13px 14px", textAlign:"center", color: p.nbActions > 0 ? "#92400e" : "#9ca3af", fontWeight:700 }}>{p.nbActions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
