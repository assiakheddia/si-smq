import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const REPORT_TYPES = [
  { id:"perf-qualite", title:"Rapport de performance qualité", desc:"Vue complète des indicateurs qualité, taux de conformité, évolutions et plans d'actions.", icon:"📊", sections:["KPIs qualité","Taux de conformité","Non-conformités","Actions correctives","Tendances"] },
  { id:"conformite-iso", title:"Rapport de conformité ISO 9001", desc:"Analyse clause par clause de la conformité au référentiel ISO 9001:2015.", icon:"📋", sections:["Analyse par clause","Exigences non satisfaites","Points forts","Axes d'amélioration","Recommandations"] },
  { id:"audit-rapport", title:"Rapport d'audit (Interne + Externe)", desc:"Synthèse de tous les audits réalisés, constats, NC et recommandations.", icon:"🔍", sections:["Programme d'audit","Résultats audits internes","Résultats audits externes","NC par processus","Conclusions"] },
  { id:"amelioration", title:"Tableau de bord amélioration continue", desc:"Suivi des actions d'amélioration, PDCA, et efficacité des corrections.", icon:"🔄", sections:["Actions en cours","Actions clôturées","Efficacité PDCA","Récidives","Plan prévisionnel"] },
  { id:"revue-direction", title:"Rapport de revue de direction", desc:"Rapport de management review ISO 9001 — données d'entrée et décisions de direction.", icon:"🏛️", sections:["Contexte organisationnel","Performance SMQ","Audits","Satisfaction clients","Décisions de direction"] },
];

const HISTORY = [
  { date:"01/06/2026", type:"Rapport de conformité ISO 9001",          by:"Direction", format:"PDF",   size:"2.4 MB" },
  { date:"15/05/2026", type:"Rapport de performance qualité",           by:"Direction", format:"Excel", size:"1.8 MB" },
  { date:"01/05/2026", type:"Rapport d'audit (Interne + Externe)",      by:"Direction", format:"PDF",   size:"3.1 MB" },
  { date:"01/04/2026", type:"Rapport de revue de direction",            by:"Direction", format:"PDF",   size:"4.2 MB" },
];

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1100 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"22px 26px", marginBottom:20 },
  btn:(color,bg)=>({ background:bg, color, border:`1px solid ${color}33`, borderRadius:8, padding:"9px 20px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }),
};

export default function StrategicReports() {
  const [selected, setSelected] = useState(null);
  const [dateRange, setDateRange] = useState("trimestre");
  const [format, setFormat] = useState("PDF");
  const [sections, setSections] = useState({});
  const [generated, setGenerated] = useState(false);
  const [history, setHistory] = useState(HISTORY);

  const report = REPORT_TYPES.find((r) => r.id === selected);

  const toggleSection = (s) => setSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleGenerate = () => {
    setGenerated(true);
    if (report) {
      setHistory((prev) => [{ date:new Date().toLocaleDateString("fr-FR"), type:report.title, by:"Direction", format, size:"—" }, ...prev]);
    }
    setTimeout(() => setGenerated(false), 5000);
  };

  return (
    <div style={S.page}>
      <Topbar title="Rapports stratégiques" userName="Directeur Général" userRole="Direction" userInitials="DG" />
      <div style={S.inner}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Rapports stratégiques</h1>
          <p style={{ fontSize:13, color:"#5a7a66" }}>Générez des rapports de management pour la revue de direction et le pilotage qualité.</p>
        </div>

        {/* Report type selector */}
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:14 }}>Sélectionnez un type de rapport</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
            {REPORT_TYPES.map((r) => (
              <div key={r.id} onClick={() => { setSelected(r.id); setGenerated(false); setSections({}); }}
                style={{ padding:"16px 18px", borderRadius:12, border:`2px solid ${selected===r.id?"#7c3aed":"#e8f0eb"}`, background:selected===r.id?"#f5f3ff":"#fafafa", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ fontSize:26, marginBottom:8 }}>{r.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:selected===r.id?"#7c3aed":"#1a2e22", marginBottom:4 }}>{r.title}</div>
                <div style={{ fontSize:11, color:"#9ca3af", lineHeight:1.5 }}>{r.desc.slice(0,80)}…</div>
              </div>
            ))}
          </div>
        </div>

        {/* Config panel */}
        {report && (
          <div style={S.card}>
            <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
              <div style={{ fontSize:28 }}>{report.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:"#1a2e22" }}>{report.title}</div>
                <div style={{ fontSize:13, color:"#5a7a66", marginTop:2 }}>{report.desc}</div>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Période couverte</label>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
                  <option value="mois">Ce mois (Juin 2026)</option>
                  <option value="trimestre">Ce trimestre (T2 2026)</option>
                  <option value="semestre">Ce semestre (S1 2026)</option>
                  <option value="annee">Cette année (2026)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Format d'export</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["PDF","Excel","PowerPoint"].map((f) => (
                    <button key={f} onClick={() => setFormat(f)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`2px solid ${format===f?"#7c3aed":"#e8f0eb"}`, background:format===f?"#f5f3ff":"#fff", color:format===f?"#7c3aed":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#4b6358", marginBottom:10 }}>Sections à inclure</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {report.sections.map((s) => (
                  <label key={s} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                    <input type="checkbox" checked={sections[s] !== false} onChange={() => toggleSection(s)} style={{ width:16, height:16, accentColor:"#7c3aed", cursor:"pointer" }} />
                    <span style={{ fontSize:13, color:"#1a2e22" }}>{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background:"#fafafa", borderRadius:10, border:"1px solid #f0f2f4", padding:"16px 20px", marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", marginBottom:10 }}>Aperçu du contenu</div>
              <div style={{ fontSize:13, color:"#4b6358", lineHeight:1.8 }}>
                Ce rapport couvrira la période <strong>{dateRange === "mois" ? "Juin 2026" : dateRange === "trimestre" ? "T2 2026 (Avr–Juin)" : dateRange === "semestre" ? "S1 2026 (Jan–Juin)" : "Année 2026"}</strong> et inclura :<br />
                {report.sections.filter(s => sections[s] !== false).map((s, i) => <span key={s}>{i > 0 ? " · " : ""}{s}</span>)}<br /><br />
                <span style={{ color:"#9ca3af", fontSize:12 }}>Données extraites en temps réel du système SI-SMQ — {HISTORY.length} rapports générés précédemment.</span>
              </div>
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={handleGenerate} style={{ background:"#7c3aed", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                📄 Générer le rapport {format}
              </button>
            </div>

            {generated && (
              <div style={{ marginTop:16, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"16px 20px", display:"flex", gap:12, alignItems:"center" }}>
                <span style={{ fontSize:28 }}>✅</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#166534" }}>Rapport généré avec succès</div>
                  <div style={{ fontSize:12, color:"#4b6358", marginTop:2 }}>Le rapport est prêt. <span style={{ color:"#166534", fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>Télécharger le {format}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Historique des rapports générés</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                {["Date","Type de rapport","Généré par","Format","Taille","Actions"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #f8f9fa" }}>
                  <td style={{ padding:"12px 14px", color:"#9ca3af", fontSize:12 }}>{h.date}</td>
                  <td style={{ padding:"12px 14px", fontWeight:600, color:"#1a2e22" }}>{h.type}</td>
                  <td style={{ padding:"12px 14px", color:"#4b6358" }}>{h.by}</td>
                  <td style={{ padding:"12px 14px" }}><span style={{ background:"#ede9fe", color:"#5b21b6", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{h.format}</span></td>
                  <td style={{ padding:"12px 14px", color:"#9ca3af", fontSize:12 }}>{h.size}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <button style={{ background:"none", border:"1px solid #e8f0eb", borderRadius:8, padding:"5px 12px", fontSize:11, color:"#2D604F", fontWeight:600, cursor:"pointer" }}>↓ Télécharger</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
