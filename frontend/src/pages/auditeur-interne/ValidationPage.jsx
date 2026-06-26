import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
};

function ScoreBadge({ score }) {
  const color = score >= 85 ? "#166534" : score >= 70 ? "#92400e" : "#991b1b";
  const bg = score >= 85 ? "#dcfce7" : score >= 70 ? "#fef3c7" : "#fee2e2";
  return <span style={{ background: bg, color, borderRadius: 8, padding: "3px 12px", fontSize: 13, fontWeight: 800 }}>{Math.round(score)}%</span>;
}

function ConfirmModal({ fiche, onConfirm, onClose, validating }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 460, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>✅</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a2e22", textAlign: "center", marginBottom: 8 }}>Confirmer la validation pour l'audit externe</h3>
        <p style={{ fontSize: 13, color: "#5a7a66", textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Vous êtes sur le point de valider en interne la fiche <strong>"{fiche.name}"</strong>.<br />
          Elle sera marquée comme conforme et transmise à la Direction, seule habilitée à lancer l'audit externe.
        </p>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#166534" }}>
            <strong>Score de conformité :</strong> {Math.round(fiche.score)}% · <strong>Clauses évaluées :</strong> {fiche.nb_clauses_evaluees} · <strong>Clauses conformes :</strong> {fiche.nb_clauses_conformes}/{fiche.nb_clauses_evaluees}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onConfirm} disabled={validating} style={S.btn("#fff", "#166534")}>{validating ? "Validation..." : "Confirmer la validation"}</button>
          <button onClick={onClose} style={S.btn("#6b7280", "#f3f4f6")}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const user = getCurrentUser();
  const initials = (user?.nom_complet || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmFiche, setConfirmFiche] = useState(null);
  const [validating, setValidating] = useState(false);

  const load = () => {
    Promise.all([
      api.get("/diagnostics/?statut=soumis").catch(() => []),
      api.get("/diagnostics/?statut=valide").catch(() => []),
    ]).then(([soumis, valides]) => {
      const map = (d, status) => ({
        id: d.id,
        name: d.processus?.nom || `Processus ${d.processus_id}`,
        owner: d.auditeur ? `${d.auditeur.prenom || ""} ${d.auditeur.nom || ""}`.trim() : "—",
        score: d.score_global || 0,
        nb_clauses_evaluees: d.nb_clauses_evaluees || 0,
        nb_clauses_conformes: d.nb_clauses_conformes || 0,
        nb_ecarts_majeurs: d.nb_ecarts_majeurs || 0,
        status,
      });
      const readyList = soumis.map((d) => map(d, d.nb_ecarts_majeurs > 0 ? "pending-obs" : "ready"));
      const validatedList = valides.map((d) => map(d, "validated"));
      setFiches([...readyList, ...validatedList]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const validate = async (id) => {
    setValidating(true);
    try {
      await api.post(`/diagnostics/${id}/valider`, {});
      setFiches((prev) => prev.map((f) => f.id === id ? { ...f, status: "validated" } : f));
    } catch {
      // leave as-is on failure
    } finally {
      setValidating(false);
      setConfirmFiche(null);
    }
  };

  const validated = fiches.filter((f) => f.status === "validated");
  const ready = fiches.filter((f) => f.status === "ready");
  const pendingObs = fiches.filter((f) => f.status === "pending-obs");

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Validation interne" userName={user?.nom_complet || "—"} userRole="Auditeur Interne" userInitials={initials} />
        <div style={S.inner}>
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {confirmFiche && <ConfirmModal fiche={confirmFiche} onConfirm={() => validate(confirmFiche.id)} onClose={() => setConfirmFiche(null)} validating={validating} />}
      <Topbar title="Validation interne" userName={user?.nom_complet || "—"} userRole="Auditeur Interne" userInitials={initials} />
      <div style={S.inner}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "En attente de validation", value: ready.length, color: "#92400e", bg: "#fef3c7" },
            { label: "Validées — transmises à la Direction", value: validated.length, color: "#166534", bg: "#dcfce7" },
          ].map((s) => (
            <div key={s.label} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4b6358" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {ready.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              Prêtes pour validation ({ready.length})
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f2f4" }}>
                  {["Processus", "Auditeur", "Clauses évaluées", "Clauses conformes", "Score conformité", "Action"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ready.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "14px 12px", fontWeight: 700, color: "#1a2e22" }}>{f.name}</td>
                    <td style={{ padding: "14px 12px", color: "#4b6358" }}>{f.owner}</td>
                    <td style={{ padding: "14px 12px", textAlign: "center" }}>
                      <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{f.nb_clauses_evaluees}</span>
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: f.nb_clauses_conformes === f.nb_clauses_evaluees ? "#166534" : "#92400e" }}>
                        {f.nb_clauses_conformes}/{f.nb_clauses_evaluees}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}><ScoreBadge score={f.score} /></td>
                    <td style={{ padding: "14px 12px" }}>
                      <button onClick={() => setConfirmFiche(f)} style={{ background: "#2D604F", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ✅ Valider pour audit externe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendingObs.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#92400e", marginBottom: 12 }}>
              ⏳ Écarts majeurs non résolus — validation déconseillée
            </div>
            {pendingObs.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #fef3c7" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1a2e22" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{f.nb_ecarts_majeurs} écart(s) majeur(s) identifié(s)</div>
                </div>
                <ScoreBadge score={f.score} />
              </div>
            ))}
          </div>
        )}

        {validated.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#166534", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>✅</span> Validées — en attente de lancement de l'audit externe par la Direction ({validated.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {validated.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "#fafafa", borderRadius: 10, border: "1px solid #e8f0eb", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: "#1a2e22" }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{f.owner} · Score : {Math.round(f.score)}%</div>
                  </div>
                  <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>Validé ✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ready.length === 0 && pendingObs.length === 0 && validated.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2e22" }}>Aucune fiche prête pour validation</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Les Préparateurs doivent d'abord soumettre des diagnostics.</div>
          </div>
        )}
      </div>
    </div>
  );
}
