import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const OPTIONS = [
  { value: "conforme", label: "Conforme" },
  { value: "mineur", label: "Écart mineur" },
  { value: "majeur", label: "Écart majeur" },
  { value: "observation", label: "Observation" },
];
const OPT_COLORS = { conforme: "#166534", mineur: "#92400e", majeur: "#991b1b", observation: "#374151" };
const OPT_BG =    { conforme: "#dcfce7", mineur: "#fef3c7", majeur: "#fee2e2", observation: "#f3f4f6" };

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
};

function scoreFromEcart(type) {
  if (type === "conforme") return 100;
  if (type === "observation") return 80;
  if (type === "mineur") return 50;
  if (type === "majeur") return 10;
  return 0;
}

export default function ProcessEvaluation() {
  const user = getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [diagnostics, setDiagnostics] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("diagId") || "");
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState({});
  const [pendingType, setPendingType] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/diagnostics/").catch(() => []).then((diags) => {
      const all = Array.isArray(diags) ? diags : [];
      const mine = all.filter((d) => d.auditeur?.id === user?.id);
      const list = mine.length > 0 ? mine : all;
      setDiagnostics(list);
      if (!selectedId && list.length > 0) setSelectedId(String(list[0].id));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/diagnostics/${selectedId}`).then(setDetail).catch(() => setDetail(null));
  }, [selectedId]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setSearchParams(id ? { diagId: id } : {});
    setDetail(null);
    setComments({});
    setPendingType({});
    setSaved(false);
  };

  const clauses = detail?.clauses_evaluees || [];
  const answered = clauses.filter((c) => c.type_ecart !== null && c.type_ecart !== undefined);
  const conformes = answered.filter((c) => c.type_ecart === "conforme").length;
  const score = Math.round(detail?.score_global || 0);

  const saveClause = async (clauseEval, typeEcart, description) => {
    setSaving(clauseEval.id);
    try {
      const payload = {
        clause_id: clauseEval.clause_id,
        score: scoreFromEcart(typeEcart),
        poids: clauseEval.poids ?? 1.0,
        est_applicable: clauseEval.est_applicable ?? true,
        type_ecart: typeEcart === "conforme" ? null : typeEcart,
        description_ecart: description ?? clauseEval.description_ecart ?? null,
        preuves_existantes: clauseEval.preuves_existantes ?? null,
        recommandation_manuelle: clauseEval.recommandation_manuelle ?? null,
      };
      const updated = await api.patch(`/diagnostics/${selectedId}/clauses/${clauseEval.id}`, payload);
      setDetail((prev) => ({
        ...prev,
        clauses_evaluees: prev.clauses_evaluees.map((c) => c.id === clauseEval.id ? updated : c),
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Évaluation de la clause échouée:", err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Évaluation des processus" userName={user?.nom_complet} userRole="Auditeur Externe" />
        <div style={S.inner}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Topbar title="Évaluation des processus" userName={user?.nom_complet} userRole="Auditeur Externe" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Évaluation de conformité</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Évaluez chaque clause ISO 9001 pour le diagnostic sélectionné.</p>
          </div>
          <select value={selectedId} onChange={(e) => handleSelect(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e8f0eb", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit", background: "#fff", cursor: "pointer" }}>
            <option value="">Sélectionner un diagnostic...</option>
            {diagnostics.map((d) => (
              <option key={d.id} value={d.id}>{d.processus?.nom || "—"} — {d.reference || d.id}</option>
            ))}
          </select>
        </div>

        {!selectedId && (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22" }}>Sélectionnez un diagnostic pour commencer l'évaluation</div>
          </div>
        )}

        {selectedId && !detail && (
          <div style={S.card}>Chargement du diagnostic…</div>
        )}

        {selectedId && detail && (
          <>
            <div style={{ ...S.card, marginBottom: 20, border: "1px solid #fde68a", background: "#fffbeb" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Fiche processus — Lecture seule</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  ["Processus", detail.processus?.nom || "—"],
                  ["Référence", detail.reference || "—"],
                  ["Auditeur", detail.auditeur ? `${detail.auditeur.prenom} ${detail.auditeur.nom}` : "—"],
                  ["Période", detail.periode_couverte || "—"],
                  ["Statut", detail.statut],
                  ["Niveau global", detail.niveau_global],
                ].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 3 }}>{k}</div><div style={{ fontSize: 13, color: "#1a2e22" }}>{v}</div></div>
                ))}
              </div>
            </div>

            {clauses.length > 0 && (
              <div style={{ ...S.card, marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", flexShrink: 0 }}>Score de conformité</div>
                <div style={{ flex: 1, height: 12, background: "#f0f2f4", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${score}%`, height: "100%", background: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 6, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: score >= 80 ? "#166534" : score >= 60 ? "#92400e" : "#991b1b", flexShrink: 0 }}>{score}%</div>
                <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>{conformes}/{clauses.length} clauses conformes</div>
              </div>
            )}

            <div style={S.card}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 }}>Grille d'évaluation ISO 9001</div>
              {clauses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Aucune clause initialisée pour ce diagnostic.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {clauses.map((c) => {
                    const currentType = c.type_ecart || (c.score >= 75 ? "conforme" : null);
                    const pending = pendingType[c.id] ?? currentType;
                    return (
                      <div key={c.id} style={{ padding: "16px 18px", background: pending ? OPT_BG[pending] + "40" : "#fafafa", borderRadius: 10, border: `1px solid ${pending ? OPT_BG[pending] : "#f0f2f4"}` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", marginBottom: 10 }}>{c.clause?.code} — {c.clause?.titre}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          {OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => setPendingType((prev) => ({ ...prev, [c.id]: opt.value }))}
                              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${pending === opt.value ? OPT_COLORS[opt.value] : "#e5e7eb"}`, background: pending === opt.value ? OPT_BG[opt.value] : "#fff", color: pending === opt.value ? OPT_COLORS[opt.value] : "#6b7280", transition: "all 0.15s" }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={comments[c.id] ?? c.description_ecart ?? ""}
                          onChange={(e) => setComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="Commentaires, éléments de preuve..."
                          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", minHeight: 56, boxSizing: "border-box", background: "#fff", marginBottom: 10 }} />
                        <button
                          disabled={!pending || saving === c.id}
                          onClick={() => saveClause(c, pending, comments[c.id] ?? c.description_ecart)}
                          style={{ background: "#2D604F", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: (!pending || saving === c.id) ? "not-allowed" : "pointer", opacity: (!pending || saving === c.id) ? 0.6 : 1 }}>
                          {saving === c.id ? "Enregistrement…" : "Enregistrer cette clause"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {saved && <div style={{ marginTop: 12, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#166534", fontWeight: 600 }}>✅ Évaluation enregistrée avec succès.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
