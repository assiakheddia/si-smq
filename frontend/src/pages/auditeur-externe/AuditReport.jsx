import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const PROCESSES = ["Gestion des achats","Gestion des non-conformités","Audit interne"];

const REPORT_DATA = {
  "Gestion des achats": {
    auditor:"Benmoussa Sarah", auditDate:"23/06/2026", scope:"De l'expression du besoin à la réception fournisseur.",
    clauses:["8.4","7.5","4.1","9.1","7.1"],
    findings:[
      { clause:"8.4", status:"Non-conforme",         desc:"Absence de critères d'évaluation fournisseurs documentés." },
      { clause:"7.5", status:"Partiellement conforme",desc:"Références documentaires non mises à jour." },
      { clause:"4.1", status:"Conforme",              desc:"Analyse de contexte présente mais succincte." },
      { clause:"9.1", status:"Conforme",              desc:"Indicateurs de performance définis et suivis." },
      { clause:"7.1", status:"Conforme",              desc:"Ressources allouées au processus correctement documentées." },
    ],
    majorNC:1, minorNC:1, observations:1, recommendations:1,
  },
};

const VERDICT_OPTS = [
  { value:"recommande",          label:"Recommandé",                     color:"#166534", bg:"#dcfce7" },
  { value:"recommande-reserves", label:"Recommandé avec réserves",       color:"#92400e", bg:"#fef3c7" },
  { value:"non-recommande",      label:"Non recommandé",                 color:"#991b1b", bg:"#fee2e2" },
];

const CLAUSE_STATUS_STYLE = {
  "Conforme":              { bg:"#dcfce7", color:"#166534" },
  "Partiellement conforme":{ bg:"#fef3c7", color:"#92400e" },
  "Non-conforme":          { bg:"#fee2e2", color:"#991b1b" },
};

const S = {
  page: { minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding:"28px 32px", maxWidth:1100 },
  card: { background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"24px 28px", marginBottom:20 },
  sectionTitle: { fontSize:14, fontWeight:800, color:"#1a2e22", marginBottom:14, paddingBottom:10, borderBottom:"1px solid #f0f2f4" },
};

export default function AuditReport() {
  const [process, setProcess] = useState("Gestion des achats");
  const [conclusion, setConclusion] = useState("");
  const [verdict, setVerdict] = useState("");
  const [generated, setGenerated] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const data = REPORT_DATA[process] || REPORT_DATA["Gestion des achats"];
  const conformes = data.findings.filter(f => f.status === "Conforme").length;
  const score = Math.round((conformes / data.findings.length) * 100);

  const handleGenerate = () => { setGenerated(true); setTimeout(() => setGenerated(false), 3000); };
  const handleSubmit = () => { setSubmitted(true); };

  return (
    <div style={S.page}>
      <Topbar title="Rapport d'audit" userName="Benmoussa Sarah" userRole="Auditeur Externe" userInitials="BS" />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Rapport d'audit externe</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Générez le rapport structuré et soumettez-le à la Direction.</p>
          </div>
          <select value={process} onChange={(e) => { setProcess(e.target.value); setVerdict(""); setConclusion(""); setSubmitted(false); }}
            style={{ padding:"10px 16px", borderRadius:10, border:"1px solid #e8f0eb", fontSize:13, fontWeight:600, outline:"none", fontFamily:"inherit", background:"#fff" }}>
            {PROCESSES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {submitted && (
          <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:12, padding:"20px 24px", marginBottom:24, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📤</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#166534" }}>Rapport soumis à la Direction</div>
            <div style={{ fontSize:13, color:"#4b6358", marginTop:4 }}>La Direction a été notifiée et peut consulter votre rapport.</div>
          </div>
        )}

        {/* Section 1 — Infos générales */}
        <div style={S.card}>
          <div style={S.sectionTitle}>1. Informations générales</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:14 }}>
            {[["Processus audité",process],["Auditeur",data.auditor],["Date d'audit",data.auditDate],["Portée",data.scope],["Organisation","AQIPP — ESI"],["Référentiel","ISO 9001:2015"]].map(([k,v]) => (
              <div key={k} style={{ background:"#f8fffe", borderRadius:8, padding:"12px 14px", border:"1px solid #e8f5e1" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a2e22" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 — Clauses évaluées */}
        <div style={S.card}>
          <div style={S.sectionTitle}>2. Clauses ISO évaluées</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {data.clauses.map((c) => <span key={c} style={{ background:"#ede9fe", color:"#5b21b6", borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{c}</span>)}
          </div>
        </div>

        {/* Section 3 — Findings */}
        <div style={S.card}>
          <div style={S.sectionTitle}>3. Constats par clause</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {data.findings.map((f, i) => {
              const fs = CLAUSE_STATUS_STYLE[f.status] || {};
              return (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:"#fafafa", borderRadius:10, border:"1px solid #f0f2f4" }}>
                  <span style={{ background:"#ede9fe", color:"#5b21b6", borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, flexShrink:0 }}>{f.clause}</span>
                  <span style={{ background:fs.bg, color:fs.color, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, flexShrink:0 }}>{f.status}</span>
                  <span style={{ fontSize:13, color:"#4b6358", flex:1 }}>{f.desc}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:16, padding:"12px 16px", background:"#f0fdf4", borderRadius:10, border:"1px solid #86efac", display:"flex", gap:24 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#1a2e22" }}>Score global : <strong style={{ color: score >= 80 ? "#166534" : score >= 60 ? "#92400e" : "#991b1b" }}>{score}%</strong></span>
            <span style={{ fontSize:12, color:"#4b6358" }}>{conformes}/{data.findings.length} clauses conformes</span>
          </div>
        </div>

        {/* Section 4 — Non-conformités */}
        <div style={S.card}>
          <div style={S.sectionTitle}>4. Synthèse des non-conformités</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[["NC Majeures",data.majorNC,"#991b1b","#fee2e2"],["NC Mineures",data.minorNC,"#92400e","#fef3c7"],["Observations",data.observations,"#374151","#f3f4f6"],["Recommandations",data.recommendations,"#5b21b6","#ede9fe"]].map(([l,v,c,bg]) => (
              <div key={l} style={{ background:bg, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
                <div style={{ fontSize:28, fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:11, fontWeight:700, color:c, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Conclusion */}
        <div style={S.card}>
          <div style={S.sectionTitle}>5. Conclusion générale</div>
          <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={5}
            placeholder="Rédigez votre conclusion d'audit. Résumez les points forts, les axes d'amélioration et votre appréciation globale..."
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1px solid #e8f0eb", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box" }} />
        </div>

        {/* Section 6 — Verdict */}
        <div style={S.card}>
          <div style={S.sectionTitle}>6. Verdict final</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {VERDICT_OPTS.map((opt) => (
              <button key={opt.value} onClick={() => setVerdict(opt.value)}
                style={{ padding:"12px 24px", borderRadius:10, border:`2px solid ${verdict===opt.value ? opt.color : "#e5e7eb"}`, background:verdict===opt.value ? opt.bg : "#fff", color:verdict===opt.value ? opt.color : "#6b7280", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button onClick={handleGenerate} style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            📄 Générer le rapport PDF
          </button>
          <button onClick={handleSubmit} disabled={!verdict || !conclusion.trim() || submitted}
            style={{ background: (!verdict||!conclusion.trim()||submitted) ? "#9ca3af" : "#2D604F", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:13, fontWeight:700, cursor:(!verdict||!conclusion.trim()||submitted)?"not-allowed":"pointer" }}>
            📤 Soumettre à la Direction
          </button>
        </div>
        {generated && <div style={{ marginTop:14, background:"#dbeafe", border:"1px solid #93c5fd", borderRadius:10, padding:"12px 18px", fontSize:13, fontWeight:600, color:"#1e40af" }}>✅ Rapport PDF généré — prêt pour téléchargement.</div>}
      </div>
    </div>
  );
}
