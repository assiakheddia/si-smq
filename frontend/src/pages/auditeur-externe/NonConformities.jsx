import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const PROCESSES = ["Gestion des achats","Gestion des non-conformités","Audit interne"];
const ISO_CLAUSES = ["4.1","4.2","4.4","5.1","5.2","6.1","6.2","7.1","7.2","7.5","8.1","8.4","9.1","9.2","10.1","10.2"];
const TYPES = ["Non-conformité majeure","Non-conformité mineure","Observation","Recommandation"];
const PRIORITIES = ["Critique","Haute","Moyenne","Faible"];

const INITIAL_FINDINGS = [
  { id:1, process:"Gestion des achats",   type:"Non-conformité majeure", clause:"8.4", desc:"Absence de critères d'évaluation fournisseurs documentés.",   evidence:"Aucun enregistrement trouvé lors de l'audit.", priority:"Haute",   date:"23/06/2026", status:"ouverte" },
  { id:2, process:"Gestion des achats",   type:"Non-conformité mineure", clause:"7.5", desc:"Références documentaires non mises à jour dans la fiche.",      evidence:"P-ACH-001 indisponible lors de la vérification.", priority:"Moyenne", date:"23/06/2026", status:"ouverte" },
  { id:3, process:"Gestion des achats",   type:"Observation",            clause:"4.1", desc:"L'analyse de contexte n'est pas suffisamment détaillée.",       evidence:"Section contexte trop sommaire.",              priority:"Faible",   date:"23/06/2026", status:"ouverte" },
  { id:4, process:"Gestion des achats",   type:"Recommandation",         clause:"9.1", desc:"Mettre en place des indicateurs de performance fournisseur.",   evidence:"—",                                           priority:"Moyenne", date:"23/06/2026", status:"ouverte" },
  { id:5, process:"Gestion des NC",       type:"Observation",            clause:"10.2",desc:"Délais de clôture des NC non systématiquement respectés.",      evidence:"3 NC ouvertes depuis plus de 90 jours.",       priority:"Haute",   date:"10/06/2026", status:"en-cours" },
  { id:6, process:"Gestion des NC",       type:"Non-conformité mineure", clause:"10.1",desc:"Processus d'amélioration continue non formalisé.",              evidence:"Absence de plan d'action documenté.",          priority:"Moyenne", date:"10/06/2026", status:"en-cours" },
  { id:7, process:"Audit interne",        type:"Non-conformité mineure", clause:"5.2", desc:"Politique qualité non affichée dans tous les locaux.",         evidence:"3 zones de production sans affichage.",        priority:"Faible",   date:"05/06/2026", status:"cloturee"},
  { id:8, process:"Audit interne",        type:"Recommandation",         clause:"9.2", desc:"Recommandation d'élargir le programme d'audit à tous les processus.", evidence:"—",                                    priority:"Moyenne", date:"05/06/2026", status:"cloturee"},
];

const TYPE_STYLE = {
  "Non-conformité majeure": { bg:"#fee2e2", color:"#991b1b" },
  "Non-conformité mineure": { bg:"#fef3c7", color:"#92400e" },
  "Observation":            { bg:"#f3f4f6", color:"#374151" },
  "Recommandation":         { bg:"#ede9fe", color:"#5b21b6" },
};
const STATUS_STYLE = {
  "ouverte":  { label:"Ouverte",    bg:"#fee2e2", color:"#991b1b" },
  "en-cours": { label:"En cours",   bg:"#dbeafe", color:"#1e40af" },
  "cloturee": { label:"Clôturée",   bg:"#f3f4f6", color:"#374151" },
};
const PRIORITY_STYLE = {
  "Critique":{ color:"#991b1b" }, "Haute":{ color:"#b45309" }, "Moyenne":{ color:"#1e40af" }, "Faible":{ color:"#166534" },
};

const S = {
  page: { minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding:"28px 32px", maxWidth:1280 },
  card: { background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"20px 24px" },
  btn: (color, bg) => ({ background:bg, color, border:`1px solid ${color}33`, borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }),
};

export default function NonConformities() {
  const [findings, setFindings] = useState(INITIAL_FINDINGS);
  const [filterType, setFilterType] = useState("all");
  const [filterProcess, setFilterProcess] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ process:"", type:"Non-conformité mineure", clause:"", desc:"", evidence:"", priority:"Moyenne" });
  const [saved, setSaved] = useState(false);

  const handleAdd = () => {
    if (!form.process || !form.clause || !form.desc.trim()) return;
    setFindings((prev) => [{ id: Date.now(), ...form, date: new Date().toLocaleDateString("fr-FR"), status:"ouverte" }, ...prev]);
    setShowForm(false); setSaved(true); setForm({ process:"", type:"Non-conformité mineure", clause:"", desc:"", evidence:"", priority:"Moyenne" });
    setTimeout(() => setSaved(false), 3000);
  };

  const filtered = findings.filter((f) =>
    (filterType === "all" || f.type === filterType) && (filterProcess === "all" || f.process === filterProcess)
  );

  const counts = {
    majorNC: findings.filter(f => f.type === "Non-conformité majeure").length,
    minorNC: findings.filter(f => f.type === "Non-conformité mineure").length,
    obs: findings.filter(f => f.type === "Observation").length,
    rec: findings.filter(f => f.type === "Recommandation").length,
  };

  return (
    <div style={S.page}>
      <Topbar title="Non-conformités" userName="Benmoussa Sarah" userRole="Auditeur Externe" userInitials="BS" />
      <div style={S.inner}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Gestion des non-conformités</h1>
            <p style={{ fontSize:13, color:"#5a7a66" }}>Constats, observations et recommandations issues de l'audit externe.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={S.btn("#fff","#2D604F")}>+ Créer un constat</button>
        </div>

        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
          {[["NC Majeures",counts.majorNC,"#991b1b","#fee2e2"],["NC Mineures",counts.minorNC,"#92400e","#fef3c7"],["Observations",counts.obs,"#374151","#f3f4f6"],["Recommandations",counts.rec,"#5b21b6","#ede9fe"]].map(([l,v,c,bg]) => (
            <div key={l} style={{ background:"#fff", borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:28, fontWeight:800, color:c }}>{v}</div>
            </div>
          ))}
        </div>

        {saved && <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:10, padding:"12px 18px", marginBottom:16, fontSize:13, fontWeight:600, color:"#166534" }}>✅ Constat créé et enregistré.</div>}

        {/* Form */}
        {showForm && (
          <div style={{ ...S.card, marginBottom:20, border:"1px solid #d4e9d7" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16 }}>Nouveau constat</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
              {[["Processus *","process",PROCESSES],["Type *","type",TYPES],["Clause ISO *","clause",ISO_CLAUSES],["Priorité *","priority",PRIORITIES]].map(([label,key,opts]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>{label}</label>
                  <select value={form[key]} onChange={(e) => setForm({...form,[key]:e.target.value})} style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
                    {key==="process"||key==="clause" ? <option value="">Sélectionner...</option> : null}
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Description *</label>
                <textarea value={form.desc} onChange={(e) => setForm({...form,desc:e.target.value})} rows={3} placeholder="Décrivez le constat..." style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Éléments de preuve</label>
                <textarea value={form.evidence} onChange={(e) => setForm({...form,evidence:e.target.value})} rows={3} placeholder="Observations, documents vérifiés..." style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleAdd} disabled={!form.process||!form.clause||!form.desc.trim()} style={{ ...S.btn("#fff","#2D604F"), opacity:(!form.process||!form.clause||!form.desc.trim())?0.5:1 }}>Enregistrer le constat</button>
              <button onClick={() => setShowForm(false)} style={S.btn("#6b7280","#f3f4f6")}>Annuler</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", marginBottom:16, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
            <option value="all">Tous les types</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
            <option value="all">Tous les processus</option>
            {PROCESSES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#9ca3af" }}>{filtered.length} constat(s)</span>
        </div>

        {/* Table */}
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                {["Type","Processus","Clause","Description","Priorité","Date","Statut"].map((h) => (
                  <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const ts = TYPE_STYLE[f.type]; const ss = STATUS_STYLE[f.status]; const ps = PRIORITY_STYLE[f.priority];
                return (
                  <tr key={f.id} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"13px 16px" }}><span style={{ background:ts.bg, color:ts.color, borderRadius:6, padding:"2px 9px", fontSize:10, fontWeight:700 }}>{f.type.replace("Non-conformité ","NC ")}</span></td>
                    <td style={{ padding:"13px 16px", fontWeight:600, color:"#1a2e22" }}>{f.process}</td>
                    <td style={{ padding:"13px 16px" }}><span style={{ background:"#ede9fe", color:"#5b21b6", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{f.clause}</span></td>
                    <td style={{ padding:"13px 16px", color:"#4b6358", maxWidth:220 }}><span title={f.desc}>{f.desc.length > 70 ? f.desc.slice(0,70)+"…" : f.desc}</span></td>
                    <td style={{ padding:"13px 16px", fontWeight:700, color:ps.color, fontSize:12 }}>{f.priority}</td>
                    <td style={{ padding:"13px 16px", color:"#9ca3af", fontSize:12 }}>{f.date}</td>
                    <td style={{ padding:"13px 16px" }}><span style={{ background:ss.bg, color:ss.color, borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700 }}>{ss.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:"48px 20px", color:"#9ca3af" }}>Aucun constat trouvé.</div>}
        </div>
      </div>
    </div>
  );
}
