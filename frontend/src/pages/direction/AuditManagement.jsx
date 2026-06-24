import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const AUDITORS_EXT = ["Benmoussa Sarah","Khelifi Rachid","Benali Mounia"];

const READY = [
  { id:1, name:"Formation du personnel", validatedBy:"Meziani Karim", validatedDate:"15/06/2026", cycles:3, score:91 },
  { id:2, name:"Gestion des NC",         validatedBy:"Meziani Karim", validatedDate:"14/06/2026", cycles:2, score:81 },
  { id:3, name:"Audit interne",          validatedBy:"Meziani Karim", validatedDate:"10/06/2026", cycles:1, score:88 },
  { id:4, name:"Contrôle qualité labo",  validatedBy:"Meziani Karim", validatedDate:"18/06/2026", cycles:1, score:79 },
];

const IN_PROGRESS = [
  { id:5, name:"Gestion des achats", auditor:"Benmoussa Sarah", startDate:"20/06/2026", dueDate:"30/06/2026", progress:60 },
  { id:6, name:"Gestion des NC",     auditor:"Khelifi Rachid",  startDate:"10/06/2026", dueDate:"20/06/2026", progress:85 },
];

const COMPLETED = [
  { id:7, name:"Audit interne",  auditor:"Benmoussa Sarah", completedDate:"05/06/2026", verdict:"Recommandé",               score:88 },
  { id:8, name:"Processus achat v1", auditor:"Khelifi Rachid", completedDate:"01/05/2026", verdict:"Recommandé avec réserves", score:72 },
  { id:9, name:"Formation 2025", auditor:"Benali Mounia", completedDate:"15/04/2026", verdict:"Recommandé",               score:91 },
];

const VERDICT_STYLE = {
  "Recommandé":              { bg:"#dcfce7", color:"#166534" },
  "Recommandé avec réserves":{ bg:"#fef3c7", color:"#92400e" },
  "Non recommandé":          { bg:"#fee2e2", color:"#991b1b" },
};

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1280 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"22px 26px", marginBottom:20 },
  btn:(color,bg)=>({ background:bg, color, border:`1px solid ${color}33`, borderRadius:8, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }),
};

function LaunchModal({ fiche, onLaunch, onClose }) {
  const [auditor, setAuditor] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const ok = auditor && date;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:18, padding:32, maxWidth:480, width:"90%", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>🚀</div>
        <h3 style={{ fontSize:18, fontWeight:800, color:"#1a2e22", textAlign:"center", marginBottom:6 }}>Lancer l'audit externe</h3>
        <p style={{ fontSize:13, color:"#5a7a66", textAlign:"center", marginBottom:24 }}>
          Processus : <strong>"{fiche.name}"</strong> · Score AI : {fiche.score}%
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Auditeur Externe *</label>
            <select value={auditor} onChange={(e) => setAuditor(e.target.value)} style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit" }}>
              <option value="">Sélectionner un auditeur...</option>
              {AUDITORS_EXT.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Date d'audit prévue *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:"#4b6358", display:"block", marginBottom:5 }}>Notes / Périmètre</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Instructions spécifiques pour l'auditeur..." style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #e8f0eb", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={() => ok && onLaunch({ auditor, date, notes })} disabled={!ok} style={{ ...S.btn("#fff","#7c3aed"), opacity:ok?1:0.5 }}>Confirmer le lancement</button>
          <button onClick={onClose} style={S.btn("#6b7280","#f3f4f6")}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function AuditManagement() {
  const [readyFiches, setReadyFiches] = useState(READY);
  const [inProgress, setInProgress] = useState(IN_PROGRESS);
  const [launched, setLaunched] = useState([]);
  const [modalFiche, setModalFiche] = useState(null);
  const [toast, setToast] = useState(null);

  const handleLaunch = ({ auditor, date }) => {
    const fiche = modalFiche;
    setReadyFiches((prev) => prev.filter((f) => f.id !== fiche.id));
    setLaunched((prev) => [...prev, { ...fiche, auditor, auditDate: date, progress: 0 }]);
    setModalFiche(null);
    setToast(`Audit externe lancé pour "${fiche.name}" — assigné à ${auditor}`);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div style={S.page}>
      {modalFiche && <LaunchModal fiche={modalFiche} onLaunch={handleLaunch} onClose={() => setModalFiche(null)} />}
      <Topbar title="Gestion des audits" userName="Directeur Général" userRole="Direction" userInitials="DG" />
      <div style={S.inner}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Gestion des audits externes</h1>
          <p style={{ fontSize:13, color:"#5a7a66" }}>Lancez les audits externes pour les processus validés par l'Auditeur Interne.</p>
        </div>

        {toast && (
          <div style={{ background:"#ede9fe", border:"1px solid #c4b5fd", borderRadius:10, padding:"12px 18px", marginBottom:16, fontSize:13, fontWeight:600, color:"#7c3aed", display:"flex", gap:8, alignItems:"center" }}>
            <span>🚀</span>{toast}
          </div>
        )}

        {/* Ready for external audit */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
            Prêts pour audit externe ({readyFiches.length})
            <span style={{ fontSize:12, fontWeight:600, color:"#9ca3af", marginLeft:4 }}>— Validés par l'Auditeur Interne, en attente de votre décision</span>
          </div>
          {readyFiches.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
              <div style={{ fontWeight:600 }}>Tous les audits ont été lancés.</div>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                  {["Processus","Validé par","Date validation","Cycles","Score","Action"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readyFiches.map((f) => (
                  <tr key={f.id} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"14px", fontWeight:700, color:"#1a2e22" }}>{f.name}</td>
                    <td style={{ padding:"14px", color:"#4b6358" }}>{f.validatedBy}</td>
                    <td style={{ padding:"14px", color:"#9ca3af", fontSize:12 }}>{f.validatedDate}</td>
                    <td style={{ padding:"14px", textAlign:"center" }}><span style={{ background:"#ede9fe", color:"#5b21b6", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{f.cycles}</span></td>
                    <td style={{ padding:"14px" }}><span style={{ fontWeight:800, color: f.score>=85?"#166534":f.score>=70?"#92400e":"#991b1b", fontSize:14 }}>{f.score}%</span></td>
                    <td style={{ padding:"14px" }}>
                      <button onClick={() => setModalFiche(f)} style={{ background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        🚀 Lancer l'audit externe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* In progress */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1e40af", marginBottom:16 }}>🔄 Audits en cours ({inProgress.length + launched.length})</div>
          {[...inProgress, ...launched].map((a) => (
            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid #f0f2f4", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:700, color:"#1a2e22" }}>{a.name}</div>
                <div style={{ fontSize:12, color:"#6b8c75" }}>Auditeur : {a.auditor} · Prévu le {a.dueDate || a.auditDate}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:140 }}>
                <div style={{ flex:1, height:8, background:"#f0f2f4", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${a.progress}%`, height:"100%", background:"#3b82f6", borderRadius:4 }} />
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#1e40af" }}>{a.progress}%</span>
              </div>
              <span style={{ background:"#dbeafe", color:"#1e40af", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:700 }}>En cours</span>
            </div>
          ))}
        </div>

        {/* Completed */}
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#166534", marginBottom:16 }}>✅ Audits terminés ({COMPLETED.length})</div>
          {COMPLETED.map((a) => {
            const vs = VERDICT_STYLE[a.verdict] || {};
            return (
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid #f0f2f4", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontWeight:700, color:"#1a2e22" }}>{a.name}</div>
                  <div style={{ fontSize:12, color:"#6b8c75" }}>Auditeur : {a.auditor} · Terminé le {a.completedDate}</div>
                </div>
                <span style={{ fontWeight:800, color: a.score>=85?"#166534":a.score>=70?"#92400e":"#991b1b" }}>{a.score}%</span>
                <span style={{ background:vs.bg, color:vs.color, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{a.verdict}</span>
                <button style={{ background:"none", border:"1px solid #e8f0eb", borderRadius:8, padding:"6px 14px", fontSize:12, color:"#2D604F", fontWeight:600, cursor:"pointer" }}>Voir rapport</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
