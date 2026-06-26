import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const STATUS = {
  soumis:    { label: "En attente", bg: "#fef3c7", color: "#92400e" },
  brouillon: { label: "Brouillon", bg: "#dbeafe", color: "#1e40af" },
  valide:    { label: "Validée", bg: "#dcfce7", color: "#166534" },
  archive:   { label: "Archivée", bg: "#f3f4f6", color: "#374151" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}22`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }),
};

function Badge({ status }) {
  const s = STATUS[status] || STATUS.brouillon;
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

function ISOBadge({ clause }) {
  return <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{clause}</span>;
}

function FicheDetail({ fiche, onClose, onActionDone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obsText, setObsText] = useState("");
  const [corrText, setCorrText] = useState("");
  const [showObsForm, setShowObsForm] = useState(false);
  const [showCorrForm, setShowCorrForm] = useState(false);
  const [submitted, setSubmitted] = useState({ obs: false, corr: false });
  const [saving, setSaving] = useState(false);
  const [scoreCible, setScoreCible] = useState(85);
  const [evaluating, setEvaluating] = useState(false);
  const [submittingDiag, setSubmittingDiag] = useState(false);
  const [evalError, setEvalError] = useState("");

  const reloadDetail = () => api.get(`/diagnostics/${fiche.id}`).then(setDetail).catch(() => {});

  useEffect(() => {
    reloadDetail().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiche.id]);

  const evaluerToutesClauses = async () => {
    setEvaluating(true);
    setEvalError("");
    try {
      await api.post(`/diagnostics/${fiche.id}/evaluer-toutes-clauses`, { score_cible: Number(scoreCible) });
      await reloadDetail();
      onActionDone?.();
    } catch (err) {
      setEvalError(err?.message || "Erreur lors de l'évaluation des clauses.");
    } finally {
      setEvaluating(false);
    }
  };

  const soumettreDiagnostic = async () => {
    setSubmittingDiag(true);
    try {
      await api.post(`/diagnostics/${fiche.id}/soumettre`, {});
      await reloadDetail();
      onActionDone?.();
    } catch (err) {
      setEvalError(err?.message || "Erreur lors de la soumission.");
    } finally {
      setSubmittingDiag(false);
    }
  };

  const clauses = detail?.clauses_evaluees || [];
  const isoClauses = [...new Set(clauses.map((c) => c.clause?.code).filter(Boolean))];
  const ecarts = clauses.filter((c) => c.type_ecart);

  const submitAction = async (type, text) => {
    setSaving(true);
    try {
      await api.post("/actions/", {
        titre: type === "corrective" ? `Correction demandée — ${fiche.name}` : `Observation — ${fiche.name}`,
        description: text,
        type,
        priorite: "normale",
        processus_id: fiche.processus_id,
        origine: "diagnostic",
        diagnostic_clause_id: clauses[0]?.id,
      });
    } catch {
      // origine diagnostic requires diagnostic_clause_id; fall back to manuelle if no clause
      if (!clauses[0]?.id) {
        await api.post("/actions/", {
          titre: type === "corrective" ? `Correction demandée — ${fiche.name}` : `Observation — ${fiche.name}`,
          description: text,
          type,
          priorite: "normale",
          processus_id: fiche.processus_id,
          origine: "manuelle",
        }).catch(() => {});
      }
    } finally {
      setSaving(false);
      if (type === "corrective") setSubmitted((s) => ({ ...s, corr: true }));
      else setSubmitted((s) => ({ ...s, obs: true }));
      setShowObsForm(false);
      setShowCorrForm(false);
      onActionDone?.();
    }
  };

  return (
    <div style={{ background: "#f8fffe", border: "1px solid #d4e9d7", borderRadius: 12, padding: 24, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2e22" }}>{fiche.name} — Détails complets</div>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>✕ Fermer</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Chargement des détails...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              ["Auditeur", fiche.owner], ["Score global", `${detail?.score_global ?? fiche.score_global ?? 0}%`],
              ["Période couverte", detail?.periode_couverte || "—"], ["Clauses évaluées", String(detail?.nb_clauses_evaluees ?? 0)],
              ["Clauses conformes", String(detail?.nb_clauses_conformes ?? 0)], ["Écarts majeurs", String(detail?.nb_ecarts_majeurs ?? 0)],
              ["Commentaire global", detail?.commentaire_global || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8f0eb" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#1a2e22" }}>{val}</div>
              </div>
            ))}
            <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8f0eb" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Clauses ISO liées</div>
              {isoClauses.length === 0 ? <span style={{ fontSize: 12, color: "#9ca3af" }}>Aucune</span> : isoClauses.map((c) => <ISOBadge key={c} clause={c} />)}
            </div>
          </div>

          {detail?.statut === "brouillon" && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                Évaluation des clauses ISO ({detail?.nb_clauses_evaluees ?? 0} clauses)
              </div>
              <div style={{ fontSize: 12, color: "#4b6358", marginBottom: 12 }}>
                Note les {detail?.nb_clauses_evaluees ?? 0} clauses ISO autour d'un score cible (avec une dispersion réaliste), pour produire une évaluation complète sans saisie clause par clause.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label style={{ fontSize: 12, color: "#1e40af", fontWeight: 600 }}>Score cible (%)</label>
                <input
                  type="number" min={0} max={100} value={scoreCible}
                  onChange={(e) => setScoreCible(e.target.value)}
                  style={{ width: 70, padding: "6px 10px", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 13 }}
                />
                <button onClick={evaluerToutesClauses} disabled={evaluating} style={S.btn("#fff", "#2563eb")}>
                  {evaluating ? "Évaluation…" : "Évaluer toutes les clauses"}
                </button>
                <button onClick={soumettreDiagnostic} disabled={submittingDiag || (detail?.nb_clauses_evaluees ?? 0) === 0} style={S.btn("#fff", "#166534")}>
                  {submittingDiag ? "Soumission…" : "Soumettre pour validation"}
                </button>
              </div>
              {evalError && <div style={{ color: "#991b1b", fontSize: 12, marginTop: 8 }}>{evalError}</div>}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", marginBottom: 10 }}>Écarts identifiés</div>
            {ecarts.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Aucun écart relevé.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ecarts.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e8f0eb" }}>
                    <span style={{ background: c.type_ecart === "majeur" ? "#fee2e2" : "#fef3c7", color: c.type_ecart === "majeur" ? "#991b1b" : "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {c.clause?.code || "—"}
                    </span>
                    <span style={{ fontSize: 12, color: "#4b6358", flex: 1 }}>{c.description_ecart || c.recommandation_finale || "—"}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>score {c.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button onClick={() => { setShowObsForm(!showObsForm); setShowCorrForm(false); }} style={S.btn("#1e40af", "#dbeafe")}>+ Ajouter une observation</button>
            <button onClick={() => { setShowCorrForm(!showCorrForm); setShowObsForm(false); }} style={S.btn("#991b1b", "#fee2e2")}>⚠ Demander des corrections</button>
          </div>

          {showObsForm && !submitted.obs && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 10 }}>Nouvelle observation</div>
              <textarea value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Décrivez votre observation..." style={{ width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid #bfdbfe", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => submitAction("amelioration", obsText)} style={S.btn("#1e40af", "#2563eb")} disabled={!obsText.trim() || saving}>Soumettre l'observation</button>
                <button onClick={() => setShowObsForm(false)} style={S.btn("#6b7280", "#f3f4f6")}>Annuler</button>
              </div>
            </div>
          )}

          {showCorrForm && !submitted.corr && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>Demande de corrections</div>
              <textarea value={corrText} onChange={(e) => setCorrText(e.target.value)} placeholder="Décrivez les corrections requises et les clauses ISO non respectées..." style={{ width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid #fed7aa", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => submitAction("corrective", corrText)} style={S.btn("#fff", "#92400e")} disabled={!corrText.trim() || saving}>Envoyer au Préparateur</button>
                <button onClick={() => setShowCorrForm(false)} style={S.btn("#6b7280", "#f3f4f6")}>Annuler</button>
              </div>
            </div>
          )}

          {(submitted.obs || submitted.corr) && (
            <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>
                {submitted.obs ? "Observation envoyée au Préparateur." : "Demande de corrections envoyée au Préparateur."}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReviewFiches() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const initials = (user?.nom_complet || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const loadFiches = () => {
    api.get("/diagnostics/")
      .then((diags) => setFiches(Array.isArray(diags) ? diags : []))
      .catch(() => setFiches([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFiches(); }, []);

  const mapped = fiches.map((d) => ({
    id: d.id,
    name: d.processus?.nom || `Processus ${d.processus_id}`,
    processus_id: d.processus_id,
    owner: d.auditeur ? `${d.auditeur.prenom || ""} ${d.auditeur.nom || ""}`.trim() : "—",
    submitted: d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString("fr-FR") : "—",
    status: d.statut,
    score_global: d.score_global,
    reference: d.reference,
  }));

  const filtered = mapped.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={S.page}>
      <Topbar title="Révision des fiches de processus" userName={user?.nom_complet || "—"} userRole="Auditeur Interne" userInitials={initials} />
      <div style={S.inner}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Fiches de processus soumises</h1>
          <p style={{ fontSize: 13, color: "#5a7a66" }}>{mapped.length} fiches au total — {mapped.filter(f => f.status === "soumis").length} en attente de votre révision</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher par nom ou propriétaire..."
            style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <option value="all">Tous les statuts</option>
            <option value="soumis">En attente</option>
            <option value="brouillon">Brouillon</option>
            <option value="valide">Validée</option>
            <option value="archive">Archivée</option>
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} résultat(s)</span>
        </div>

        {loading ? (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Chargement des fiches...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2e22" }}>Aucune fiche trouvée</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Modifiez vos filtres de recherche.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((fiche) => (
              <div key={fiche.id} style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 2 }}>{fiche.name}</div>
                    <div style={{ fontSize: 12, color: "#6b8c75" }}>Auditeur : {fiche.owner} · Soumis le {fiche.submitted}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ background: "#1e40af22", color: "#1e40af", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{fiche.reference || `#${fiche.id}`}</span>
                    <Badge status={fiche.status} />
                    <button
                      onClick={() => navigate(`/ai/fiche-processus/${fiche.processus_id}`)}
                      style={{ background: "#fff", color: "#2D604F", border: "1px solid #2D604F", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      📄 Voir la fiche complète
                    </button>
                    <button
                      onClick={() => setExpanded(expanded === fiche.id ? null : fiche.id)}
                      style={{ background: expanded === fiche.id ? "#f0fdf4" : "#2D604F", color: expanded === fiche.id ? "#2D604F" : "#fff", border: `1px solid ${expanded === fiche.id ? "#86efac" : "#2D604F"}`, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      {expanded === fiche.id ? "Fermer" : "Réviser"}
                    </button>
                  </div>
                </div>
                {expanded === fiche.id && (
                  <div style={{ padding: "0 24px 24px" }}>
                    <FicheDetail fiche={fiche} onClose={() => setExpanded(null)} onActionDone={loadFiches} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
