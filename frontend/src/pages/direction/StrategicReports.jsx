import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

function getInitials(name) {
  if (!name) return "DG";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1100 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"22px 26px", marginBottom:20 },
  btn:(color,bg)=>({ background:bg, color, border:`1px solid ${color}33`, borderRadius:8, padding:"9px 20px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }),
};

export default function StrategicReports() {
  const user = getCurrentUser();
  const [processus, setProcessus] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [risques, setRisques] = useState([]);
  const [actions, setActions] = useState([]);
  const [indicateurs, setIndicateurs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dateRange, setDateRange] = useState("trimestre");

  useEffect(() => {
    Promise.all([
      api.get("/processus/").catch(() => []),
      api.get("/diagnostics/").catch(() => []),
      api.get("/risques/").catch(() => []),
      api.get("/actions/").catch(() => []),
      api.get("/indicateurs/").catch(() => []),
      api.get("/documents/").catch(() => []),
    ]).then(([procs, diags, rqs, acts, inds, docs]) => {
      setProcessus(Array.isArray(procs) ? procs : (procs?.items || []));
      setDiagnostics(Array.isArray(diags) ? diags : (diags?.items || []));
      setRisques(Array.isArray(rqs) ? rqs : (rqs?.items || []));
      setActions(Array.isArray(acts) ? acts : (acts?.items || []));
      setIndicateurs(Array.isArray(inds) ? inds : (inds?.items || []));
      setDocuments(Array.isArray(docs) ? docs : (docs?.items || []));
      setLoading(false);
    });
  }, []);

  const scores = diagnostics.filter(d => d.score_global > 0).map(d => d.score_global);
  const tauxConformite = scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length) : 0;
  const ncMajeures = diagnostics.reduce((s,d) => s + (d.nb_ecarts_majeurs || 0), 0);
  const ncMineures = diagnostics.reduce((s,d) => s + (d.nb_ecarts_mineurs || 0), 0);
  const risquesCritiques = risques.filter(r => r.criticite === "critique" && r.est_actif !== false).length;
  const actionsOuvertes = actions.filter(a => !["close","annulee"].includes(a.statut)).length;
  const actionsEnRetard = actions.filter(a => a.est_en_retard).length;
  const topDiagnostics = [...diagnostics].sort((a,b) => b.score_global - a.score_global).slice(0, 5);
  const worstDiagnostics = [...diagnostics].sort((a,b) => a.score_global - b.score_global).slice(0, 5);

  const REPORT_TYPES = [
    {
      id:"perf-qualite", title:"Rapport de performance qualité", icon:"📊",
      desc:"Vue complète des indicateurs qualité, taux de conformité, évolutions et plans d'actions.",
      sections:["KPIs qualité","Taux de conformité","Non-conformités","Actions correctives"],
      build: () => ({
        "Taux de conformité moyen": `${tauxConformite}%`,
        "Diagnostics réalisés": diagnostics.length,
        "Écarts majeurs": ncMajeures,
        "Écarts mineurs": ncMineures,
        "Actions ouvertes": actionsOuvertes,
        "Actions en retard": actionsEnRetard,
      }),
    },
    {
      id:"conformite-iso", title:"Rapport de conformité ISO 9001", icon:"📋",
      desc:"Analyse de la conformité au référentiel ISO 9001:2015 à partir des diagnostics réalisés.",
      sections:["Diagnostics les plus conformes","Diagnostics les moins conformes","Synthèse globale"],
      build: () => ({
        "Processus évalués": new Set(diagnostics.map(d => d.processus_id)).size,
        "Score moyen": `${tauxConformite}%`,
        "Meilleur score": topDiagnostics[0] ? `${Math.round(topDiagnostics[0].score_global)}% (${topDiagnostics[0].processus?.nom})` : "—",
        "Score le plus faible": worstDiagnostics[0] ? `${Math.round(worstDiagnostics[0].score_global)}% (${worstDiagnostics[0].processus?.nom})` : "—",
      }),
    },
    {
      id:"audit-rapport", title:"Rapport d'audit", icon:"🔍",
      desc:"Synthèse de tous les diagnostics réalisés, constats et écarts par processus.",
      sections:["Diagnostics par statut","Écarts par processus","Auditeurs impliqués"],
      build: () => ({
        "Brouillons": diagnostics.filter(d => d.statut === "brouillon").length,
        "Soumis": diagnostics.filter(d => d.statut === "soumis").length,
        "Validés": diagnostics.filter(d => d.statut === "valide").length,
        "Archivés": diagnostics.filter(d => d.statut === "archive").length,
        "Auditeurs distincts": new Set(diagnostics.filter(d => d.auditeur_id).map(d => d.auditeur_id)).size,
      }),
    },
    {
      id:"amelioration", title:"Tableau de bord amélioration continue", icon:"🔄",
      desc:"Suivi des risques et actions correctives/préventives en cours.",
      sections:["Risques actifs","Actions par statut","Échéances dépassées"],
      build: () => ({
        "Risques actifs": risques.filter(r => r.est_actif !== false).length,
        "Risques critiques": risquesCritiques,
        "Actions planifiées": actions.filter(a => a.statut === "planifiee").length,
        "Actions en cours": actions.filter(a => a.statut === "en_cours").length,
        "Actions clôturées": actions.filter(a => a.statut === "close").length,
        "Actions en retard": actionsEnRetard,
      }),
    },
    {
      id:"revue-direction", title:"Rapport de revue de direction", icon:"🏛️",
      desc:"Données d'entrée pour la revue de direction ISO 9001 — performance SMQ globale.",
      sections:["Performance SMQ","Audits","KPI","Documents"],
      build: () => ({
        "Processus actifs": processus.filter(p => p.est_actif !== false).length,
        "Taux de conformité moyen": `${tauxConformite}%`,
        "KPI en alerte": indicateurs.filter(k => k.statut_alerte_actuel === "alerte").length,
        "KPI en attention": indicateurs.filter(k => k.statut_alerte_actuel === "attention").length,
        "Documents disponibles": documents.length,
      }),
    },
  ];

  const report = REPORT_TYPES.find((r) => r.id === selected);
  const reportData = report ? report.build() : null;

  return (
    <div style={S.page}>
      <Topbar title="Rapports stratégiques" userName={user?.nom_complet || "Direction"} userRole="Direction" userInitials={getInitials(user?.nom_complet)} />
      <div style={S.inner}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Rapports stratégiques</h1>
          <p style={{ fontSize:13, color:"#5a7a66" }}>Synthèses pour la revue de direction et le pilotage qualité, calculées en temps réel.</p>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1a2e22", marginBottom:14 }}>Sélectionnez un type de rapport</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
            {REPORT_TYPES.map((r) => (
              <div key={r.id} onClick={() => setSelected(r.id)}
                style={{ padding:"16px 18px", borderRadius:12, border:`2px solid ${selected===r.id?"#7c3aed":"#e8f0eb"}`, background:selected===r.id?"#f5f3ff":"#fafafa", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ fontSize:26, marginBottom:8 }}>{r.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:selected===r.id?"#7c3aed":"#1a2e22", marginBottom:4 }}>{r.title}</div>
                <div style={{ fontSize:11, color:"#9ca3af", lineHeight:1.5 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {report && (
          <div style={S.card}>
            <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
              <div style={{ fontSize:28 }}>{report.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:"#1a2e22" }}>{report.title}</div>
                <div style={{ fontSize:13, color:"#5a7a66", marginTop:2 }}>{report.desc}</div>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Période couverte</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width:240, padding:"10px 14px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
                <option value="mois">Ce mois</option>
                <option value="trimestre">Ce trimestre</option>
                <option value="semestre">Ce semestre</option>
                <option value="annee">Cette année</option>
              </select>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#4b6358", marginBottom:10 }}>Sections incluses</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {report.sections.map((s) => (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#7c3aed", display:"inline-block" }} />
                    <span style={{ fontSize:13, color:"#1a2e22" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:"#fafafa", borderRadius:10, border:"1px solid #f0f2f4", padding:"16px 20px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", marginBottom:12 }}>Données du rapport (temps réel)</div>
              {loading ? (
                <div style={{ color:"#9ca3af", fontSize:13 }}>Chargement des données...</div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {Object.entries(reportData).map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f0f2f4" }}>
                      <span style={{ fontSize:13, color:"#4b6358" }}>{k}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1a2e22" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Documents disponibles</div>
          {documents.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px", color:"#9ca3af" }}>Aucun document disponible dans le système pour le moment.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                  {["Nom","Type","Processus","Statut"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((d, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"12px 14px", fontWeight:600, color:"#1a2e22" }}>{d.nom || d.titre}</td>
                    <td style={{ padding:"12px 14px", color:"#4b6358" }}>{d.type}</td>
                    <td style={{ padding:"12px 14px", color:"#4b6358" }}>{d.processus_nom || "—"}</td>
                    <td style={{ padding:"12px 14px", color:"#4b6358" }}>{d.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
