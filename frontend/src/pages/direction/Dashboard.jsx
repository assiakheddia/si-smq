import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const QUALITY_KPI = [
  { label:"Taux de conformité",      value:"78%",  trend:"+3%",  up:true,  color:"#166534", bg:"#dcfce7" },
  { label:"Fiches validées",          value:"7",    trend:"+2",   up:true,  color:"#1e40af", bg:"#dbeafe" },
  { label:"Non-conformités ouvertes", value:"5",    trend:"-2",   up:false, color:"#991b1b", bg:"#fee2e2" },
  { label:"Actions correctives",      value:"3",    trend:"=",    up:null,  color:"#92400e", bg:"#fef3c7" },
];
const AUDIT_KPI = [
  { label:"Audits internes complétés", value:"12", color:"#166534", bg:"#dcfce7" },
  { label:"Audits externes complétés", value:"4",  color:"#5b21b6", bg:"#ede9fe" },
  { label:"Audits en attente",         value:"3",  color:"#92400e", bg:"#fef3c7" },
  { label:"Taux de réussite",          value:"85%",color:"#166534", bg:"#dcfce7" },
];

const PROCESS_TABLE = [
  { name:"Formation du personnel",     owner:"Hadj Ali Farida",  status:"Validé",     versions:3, updated:"20/06/2026", internalVal:"Oui", externalAudit:"Non démarré" },
  { name:"Audit interne",              owner:"Bensalem Hocine",  status:"Certifié",   versions:1, updated:"10/06/2026", internalVal:"Oui", externalAudit:"Terminé" },
  { name:"Gestion des achats",         owner:"Benchikh Mohamed", status:"En révision",versions:2, updated:"23/06/2026", internalVal:"Non", externalAudit:"—" },
  { name:"Gestion des NC",             owner:"Mekki Younes",     status:"Validé",     versions:2, updated:"15/06/2026", internalVal:"Oui", externalAudit:"En cours" },
  { name:"Contrôle qualité labo",      owner:"Sahraoui Nadia",   status:"En révision",versions:1, updated:"18/06/2026", internalVal:"Non", externalAudit:"—" },
];

// Simple inline SVG line chart
function LineChart({ data, width=380, height=100, color="#22c55e" }) {
  const max = Math.max(...data);
  const min = Math.min(...data) - 5;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 20) + 10;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * (width - 20) + 10;
        const y = height - ((v - min) / range) * (height - 20) - 10;
        return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="2"/>;
      })}
    </svg>
  );
}

function BarChart({ data, labels, width=380, height=80, color="#3b82f6" }) {
  const max = Math.max(...data);
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
  "Validé":     { bg:"#dcfce7", color:"#166534" },
  "Certifié":   { bg:"#dbeafe", color:"#1e40af" },
  "En révision":{ bg:"#fef3c7", color:"#92400e" },
  "Brouillon":  { bg:"#f3f4f6", color:"#374151" },
};

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1360 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"20px 24px" },
  h2:{ fontSize:13, fontWeight:700, color:"#6b8c75", textTransform:"uppercase", letterSpacing:1, marginBottom:14 },
};

export default function DirDashboard() {
  return (
    <div style={S.page}>
      <Topbar title="Tableau de bord exécutif" userName="Directeur Général" userRole="Direction" userInitials="DG" />
      <div style={S.inner}>

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Vue exécutive — Qualité ISO 9001</h1>
          <p style={{ fontSize:13.5, color:"#5a7a66" }}>Supervision globale du système de management de la qualité · Juin 2026</p>
        </div>

        {/* Quality KPIs */}
        <div style={S.h2}>Indicateurs qualité</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {QUALITY_KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft:`4px solid ${k.color}`, padding:"18px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{k.label}</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:10 }}>
                <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                {k.up !== null && <span style={{ fontSize:12, fontWeight:700, color:k.up?"#166534":"#991b1b", marginBottom:4 }}>{k.trend}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Audit KPIs */}
        <div style={S.h2}>Indicateurs d'audit</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
          {AUDIT_KPI.map((k) => (
            <div key={k.label} style={{ ...S.card, borderLeft:`4px solid ${k.color}`, padding:"18px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>{k.label}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Évolution de la conformité (6 mois)</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9ca3af", marginBottom:8 }}>
              {["Jan","Fév","Mar","Avr","Mai","Juin"].map(m => <span key={m}>{m}</span>)}
            </div>
            <LineChart data={[65,68,70,72,75,78]} color="#22c55e" />
            <div style={{ display:"flex", gap:16, marginTop:12 }}>
              {[65,68,70,72,75,78].map((v,i) => (
                <div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:11, fontWeight:700, color:"#166534" }}>{v}%</div></div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Non-conformités mensuelles</div>
            <BarChart data={[8,6,5,7,4,3]} labels={["Jan","Fév","Mar","Avr","Mai","Juin"]} color="#ef4444" />
          </div>
        </div>

        {/* Process overview */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Vue d'ensemble des processus</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                {["Processus","Propriétaire","Statut","Versions","Dernière MàJ","Validé AI","Audit Externe"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROCESS_TABLE.map((p, i) => {
                const bs = STATUS_BADGE[p.status] || STATUS_BADGE["Brouillon"];
                return (
                  <tr key={i} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"13px 14px", fontWeight:700, color:"#1a2e22" }}>{p.name}</td>
                    <td style={{ padding:"13px 14px", color:"#4b6358" }}>{p.owner}</td>
                    <td style={{ padding:"13px 14px" }}><span style={{ background:bs.bg, color:bs.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{p.status}</span></td>
                    <td style={{ padding:"13px 14px", textAlign:"center" }}><span style={{ background:"#f3f4f6", color:"#374151", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>v{p.versions}</span></td>
                    <td style={{ padding:"13px 14px", color:"#9ca3af", fontSize:12 }}>{p.updated}</td>
                    <td style={{ padding:"13px 14px" }}><span style={{ color:p.internalVal==="Oui"?"#166534":"#9ca3af", fontWeight:700, fontSize:12 }}>{p.internalVal==="Oui"?"✓ Oui":"—"}</span></td>
                    <td style={{ padding:"13px 14px", fontSize:12, color:"#4b6358" }}>{p.externalAudit}</td>
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
