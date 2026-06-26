import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

function getInitials(name) {
  if (!name) return "DG";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const VERDICT_STYLE = {
  "Recommandé":              { bg:"#dcfce7", color:"#166534" },
  "Recommandé avec réserves":{ bg:"#fef3c7", color:"#92400e" },
  "Non recommandé":          { bg:"#fee2e2", color:"#991b1b" },
};

function verdictFor(score) {
  if (score >= 85) return "Recommandé";
  if (score >= 60) return "Recommandé avec réserves";
  return "Non recommandé";
}

const S = {
  page:{ minHeight:"100vh", background:"#eaf5eb", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner:{ padding:"28px 32px", maxWidth:1280 },
  card:{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:"22px 26px", marginBottom:20 },
  btn:(color,bg)=>({ background:bg, color, border:`1px solid ${color}33`, borderRadius:8, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }),
};

export default function AuditManagement() {
  const user = getCurrentUser();
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(null);

  const reload = () => {
    api.get("/diagnostics/").catch(() => []).then((diags) => {
      setDiagnostics(Array.isArray(diags) ? diags : (diags?.items || []));
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const ready = diagnostics.filter(d => d.statut === "soumis");
  const readyForExternal = diagnostics.filter(d => d.statut === "valide");
  const inExternalAudit = diagnostics.filter(d => d.statut === "audit_externe");
  const completed = diagnostics.filter(d => d.statut === "archive");

  const lancerAuditExterneGlobal = async () => {
    setLaunching(true);
    try {
      await api.post("/diagnostics/lancer-audit-externe", {});
      reload();
    } catch (err) {
      window.alert(err?.message || "Erreur lors du lancement de l'audit externe.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={S.page}>
      <Topbar title="Gestion des audits" userName={user?.nom_complet || "Direction"} userRole="Direction" userInitials={getInitials(user?.nom_complet)} />
      <div style={S.inner}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1a2e22", marginBottom:4 }}>Gestion des audits</h1>
          <p style={{ fontSize:13, color:"#5a7a66" }}>Vue d'ensemble des audits ISO 9001 réalisés par les auditeurs.</p>
        </div>

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:"#1e40af", display:"inline-block" }} />
            Soumis — en attente de validation interne ({ready.length})
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:"32px 20px", color:"#9ca3af" }}>Chargement...</div>
          ) : ready.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
              <div style={{ fontWeight:600 }}>Aucun audit en attente.</div>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f0f2f4", background:"#fafafa" }}>
                  {["Processus","Auditeur","Date","Écarts majeurs","Score"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 14px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ready.map((d) => (
                  <tr key={d.id} style={{ borderBottom:"1px solid #f8f9fa" }}>
                    <td style={{ padding:"14px", fontWeight:700, color:"#1a2e22" }}>{d.processus?.nom || "—"}</td>
                    <td style={{ padding:"14px", color:"#4b6358" }}>{d.auditeur ? `${d.auditeur.prenom} ${d.auditeur.nom}` : "—"}</td>
                    <td style={{ padding:"14px", color:"#9ca3af", fontSize:12 }}>{new Date(d.date_diagnostic).toLocaleDateString("fr-FR")}</td>
                    <td style={{ padding:"14px", textAlign:"center" }}><span style={{ background: d.nb_ecarts_majeurs>0?"#fee2e2":"#f3f4f6", color: d.nb_ecarts_majeurs>0?"#991b1b":"#374151", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{d.nb_ecarts_majeurs}</span></td>
                    <td style={{ padding:"14px" }}><span style={{ fontWeight:800, color: d.score_global>=85?"#166534":d.score_global>=70?"#92400e":"#991b1b", fontSize:14 }}>{Math.round(d.score_global)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#1e40af" }}>🚀 Validés en interne — prêts pour l'audit externe ({readyForExternal.length})</div>
            {readyForExternal.length > 0 && (
              <button
                type="button"
                disabled={launching}
                onClick={lancerAuditExterneGlobal}
                style={{ ...S.btn("#fff", "#1e40af"), padding:"10px 20px", fontSize:13 }}
              >
                {launching ? "Lancement…" : `🚀 Lancer l'audit externe (${readyForExternal.length} processus)`}
              </button>
            )}
          </div>
          {ready.length > 0 && readyForExternal.length > 0 && (
            <div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#92400e" }}>
              ⚠ {ready.length} processus sont encore en attente de validation interne et ne seront pas inclus dans cet audit externe.
            </div>
          )}
          {readyForExternal.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px", color:"#9ca3af" }}>Aucun audit prêt pour l'audit externe.</div>
          ) : (
            <div style={{ fontSize:12, color:"#6b8c75", marginBottom:8 }}>
              L'audit externe ISO 9001 porte sur le périmètre complet du SMQ — un seul lancement couvre tous les processus ci-dessous.
            </div>
          )}
          {readyForExternal.map((d) => (
            <div key={d.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom:"1px solid #f0f2f4", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:700, color:"#1a2e22" }}>{d.processus?.nom || "—"}</div>
                <div style={{ fontSize:12, color:"#6b8c75" }}>Auditeur : {d.auditeur ? `${d.auditeur.prenom} ${d.auditeur.nom}` : "—"} · Score {Math.round(d.score_global)}%</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#92400e", marginBottom:16 }}>🔍 Audit externe en cours ({inExternalAudit.length})</div>
          {inExternalAudit.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px", color:"#9ca3af" }}>Aucun audit externe en cours.</div>
          ) : inExternalAudit.map((d) => (
            <div key={d.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid #f0f2f4", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:700, color:"#1a2e22" }}>{d.processus?.nom || "—"}</div>
                <div style={{ fontSize:12, color:"#6b8c75" }}>Auditeur : {d.auditeur ? `${d.auditeur.prenom} ${d.auditeur.nom}` : "—"}</div>
              </div>
              <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:20, padding:"2px 12px", fontSize:11, fontWeight:700 }}>Audit externe en cours</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#166534", marginBottom:16 }}>✅ Audits archivés ({completed.length})</div>
          {completed.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px", color:"#9ca3af" }}>Aucun audit clôturé.</div>
          ) : completed.map((d) => {
            const verdict = verdictFor(d.score_global);
            const vs = VERDICT_STYLE[verdict];
            return (
              <div key={d.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid #f0f2f4", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontWeight:700, color:"#1a2e22" }}>{d.processus?.nom || "—"}</div>
                  <div style={{ fontSize:12, color:"#6b8c75" }}>Auditeur : {d.auditeur ? `${d.auditeur.prenom} ${d.auditeur.nom}` : "—"} · {d.date_validation ? new Date(d.date_validation).toLocaleDateString("fr-FR") : new Date(d.date_diagnostic).toLocaleDateString("fr-FR")}</div>
                </div>
                <span style={{ fontWeight:800, color: d.score_global>=85?"#166534":d.score_global>=70?"#92400e":"#991b1b" }}>{Math.round(d.score_global)}%</span>
                <span style={{ background:vs.bg, color:vs.color, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{verdict}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
