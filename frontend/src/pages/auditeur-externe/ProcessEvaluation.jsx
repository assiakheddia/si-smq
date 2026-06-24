import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const PROCESSES = ["Gestion des achats","Gestion des non-conformités","Audit interne","Formation du personnel","Contrôle qualité labo"];

const CLAUSES = [
  { id: "4.1", label: "4.1 — Compréhension de l'organisme et de son contexte" },
  { id: "4.2", label: "4.2 — Compréhension des besoins des parties intéressées" },
  { id: "4.4", label: "4.4 — Système de management de la qualité et ses processus" },
  { id: "5.1", label: "5.1 — Leadership et engagement" },
  { id: "5.2", label: "5.2 — Politique qualité" },
  { id: "6.1", label: "6.1 — Actions face aux risques et opportunités" },
  { id: "6.2", label: "6.2 — Objectifs qualité et planification" },
  { id: "7.1", label: "7.1 — Ressources" },
  { id: "7.2", label: "7.2 — Compétences" },
  { id: "7.5", label: "7.5 — Informations documentées" },
  { id: "8.1", label: "8.1 — Planification et maîtrise opérationnelles" },
  { id: "8.4", label: "8.4 — Maîtrise des processus externes" },
  { id: "9.1", label: "9.1 — Surveillance, mesure, analyse et évaluation" },
  { id: "9.2", label: "9.2 — Audit interne" },
  { id: "10.1", label: "10.1 — Généralités amélioration" },
  { id: "10.2", label: "10.2 — Non-conformité et actions correctives" },
];

const OPTIONS = ["Conforme","Non-conforme","Partiellement conforme","N/A"];
const OPT_COLORS = { "Conforme": "#166534", "Non-conforme": "#991b1b", "Partiellement conforme": "#92400e", "N/A": "#374151" };
const OPT_BG =    { "Conforme": "#dcfce7", "Non-conforme": "#fee2e2", "Partiellement conforme": "#fef3c7", "N/A": "#f3f4f6" };

const PROCESS_INFO = {
  "Gestion des achats": { owner: "Benchikh Mohamed", scope: "De l'expression du besoin à la réception.", inputs: "Demandes d'achat internes", outputs: "Bons de commande, réceptions", resources: "Service achat, ERP SAP" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
};

export default function ProcessEvaluation() {
  const [selectedProcess, setSelectedProcess] = useState("Gestion des achats");
  const [assessments, setAssessments] = useState({});
  const [comments, setComments] = useState({});
  const [saved, setSaved] = useState(false);

  const setAssessment = (clauseId, value) => setAssessments((prev) => ({ ...prev, [clauseId]: value }));
  const setComment = (clauseId, value) => setComments((prev) => ({ ...prev, [clauseId]: value }));

  const answered = CLAUSES.filter((c) => assessments[c.id] && assessments[c.id] !== "N/A");
  const conformes = answered.filter((c) => assessments[c.id] === "Conforme").length;
  const partial = answered.filter((c) => assessments[c.id] === "Partiellement conforme").length;
  const score = answered.length > 0 ? Math.round(((conformes + partial * 0.5) / answered.length) * 100) : 0;

  const info = PROCESS_INFO[selectedProcess] || { owner: "—", scope: "—", inputs: "—", outputs: "—", resources: "—" };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div style={S.page}>
      <Topbar title="Évaluation des processus" userName="Benmoussa Sarah" userRole="Auditeur Externe" userInitials="BS" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Évaluation de conformité</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Évaluez chaque clause ISO 9001 pour le processus sélectionné.</p>
          </div>
          <select value={selectedProcess} onChange={(e) => { setSelectedProcess(e.target.value); setAssessments({}); setComments({}); setSaved(false); }}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e8f0eb", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
            {PROCESSES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Read-only process info */}
        <div style={{ ...S.card, marginBottom: 20, border: "1px solid #fde68a", background: "#fffbeb" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Fiche processus — Lecture seule</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[["Processus", selectedProcess],["Propriétaire", info.owner],["Portée", info.scope],["Entrées", info.inputs],["Sorties", info.outputs],["Ressources", info.resources]].map(([k,v]) => (
              <div key={k}><div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>{k}</div><div style={{ fontSize: 13, color: "#1a2e22" }}>{v}</div></div>
            ))}
          </div>
        </div>

        {/* Score bar */}
        {answered.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", flexShrink: 0 }}>Score de conformité</div>
            <div style={{ flex: 1, height: 12, background: "#f0f2f4", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${score}%`, height: "100%", background: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 6, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: score >= 80 ? "#166534" : score >= 60 ? "#92400e" : "#991b1b", flexShrink: 0 }}>{score}%</div>
            <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{answered.length}/{CLAUSES.length} clauses évaluées</div>
          </div>
        )}

        {/* Clauses table */}
        <div style={S.card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 }}>Grille d'évaluation ISO 9001</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CLAUSES.map((clause) => {
              const assessed = assessments[clause.id];
              return (
                <div key={clause.id} style={{ padding: "16px 18px", background: assessed ? (assessed === "N/A" ? "#f9fafb" : OPT_BG[assessed] + "40") : "#fafafa", borderRadius: 10, border: `1px solid ${assessed ? OPT_BG[assessed] : "#f0f2f4"}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", marginBottom: 10 }}>{clause.label}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: assessed && assessed !== "N/A" ? 10 : 0 }}>
                    {OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setAssessment(clause.id, opt)}
                        style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${assessed === opt ? OPT_COLORS[opt] : "#e5e7eb"}`, background: assessed === opt ? OPT_BG[opt] : "#fff", color: assessed === opt ? OPT_COLORS[opt] : "#6b7280", transition: "all 0.15s" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {assessed && assessed !== "N/A" && (
                    <textarea value={comments[clause.id] || ""} onChange={(e) => setComment(clause.id, e.target.value)}
                      placeholder="Commentaires, éléments de preuve..."
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", minHeight: 56, boxSizing: "border-box", background: "#fff" }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button onClick={handleSave} style={{ background: "#2D604F", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💾 Enregistrer l'évaluation</button>
          </div>
          {saved && <div style={{ marginTop: 12, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#166534", fontWeight: 600 }}>✅ Évaluation enregistrée avec succès.</div>}
        </div>
      </div>
    </div>
  );
}
