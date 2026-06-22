import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const INITIAL_FICHES = [
  { id: 1, name: "Formation du personnel", owner: "Hadj Ali Farida", cycles: 3, obsResolved: 4, totalObs: 4, score: 91, status: "ready" },
  { id: 2, name: "Audit interne", owner: "Bensalem Hocine", cycles: 1, obsResolved: 2, totalObs: 2, score: 88, status: "ready" },
  { id: 3, name: "Gestion des achats", owner: "Benchikh Mohamed", cycles: 2, obsResolved: 3, totalObs: 3, score: 79, status: "ready" },
  { id: 4, name: "Contrôle qualité labo", owner: "Sahraoui Nadia", cycles: 1, obsResolved: 1, totalObs: 2, score: 65, status: "pending-obs" },
];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
};

function ScoreBadge({ score }) {
  const color = score >= 85 ? "#166534" : score >= 70 ? "#92400e" : "#991b1b";
  const bg = score >= 85 ? "#dcfce7" : score >= 70 ? "#fef3c7" : "#fee2e2";
  return <span style={{ background: bg, color, borderRadius: 8, padding: "3px 12px", fontSize: 13, fontWeight: 800 }}>{score}%</span>;
}

function ConfirmModal({ fiche, onConfirm, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 460, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>✅</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1a2e22", textAlign: "center", marginBottom: 8 }}>Confirmer la validation interne</h3>
        <p style={{ fontSize: 13, color: "#5a7a66", textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Vous êtes sur le point de valider internement la fiche <strong>"{fiche.name}"</strong>.<br />
          Elle sera marquée comme conforme et pourra être autorisée pour l'audit externe.
        </p>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#166534" }}>
            <strong>Score de conformité :</strong> {fiche.score}% · <strong>Cycles de révision :</strong> {fiche.cycles} · <strong>Observations résolues :</strong> {fiche.obsResolved}/{fiche.totalObs}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onConfirm} style={S.btn("#fff", "#166534")}>Confirmer la validation</button>
          <button onClick={onClose} style={S.btn("#6b7280", "#f3f4f6")}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const [fiches, setFiches] = useState(INITIAL_FICHES);
  const [confirmFiche, setConfirmFiche] = useState(null);
  const [authorizedIds, setAuthorizedIds] = useState([]);

  const validate = (id) => {
    setFiches((prev) => prev.map((f) => f.id === id ? { ...f, status: "validated" } : f));
    setConfirmFiche(null);
  };

  const toggleAuthorize = (id) => {
    setAuthorizedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const validated = fiches.filter((f) => f.status === "validated");
  const ready = fiches.filter((f) => f.status === "ready");
  const pendingObs = fiches.filter((f) => f.status === "pending-obs");

  return (
    <div style={S.page}>
      {confirmFiche && <ConfirmModal fiche={confirmFiche} onConfirm={() => validate(confirmFiche.id)} onClose={() => setConfirmFiche(null)} />}
      <Topbar title="Validation interne" userName="Meziani Karim" userRole="Auditeur Interne" userInitials="MK" />
      <div style={S.inner}>

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "En attente de validation", value: ready.length, color: "#92400e", bg: "#fef3c7" },
            { label: "Validées internement", value: validated.length, color: "#166534", bg: "#dcfce7" },
            { label: "Autorisées pour audit externe", value: authorizedIds.length, color: "#1e40af", bg: "#dbeafe" },
          ].map((s) => (
            <div key={s.label} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4b6358" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Fiches ready for validation */}
        {ready.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              Prêtes pour validation ({ready.length})
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f2f4" }}>
                  {["Processus", "Propriétaire", "Cycles de révision", "Observations résolues", "Score conformité", "Action"].map((h) => (
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
                      <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{f.cycles}</span>
                    </td>
                    <td style={{ padding: "14px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: f.obsResolved === f.totalObs ? "#166534" : "#92400e" }}>
                        {f.obsResolved}/{f.totalObs}
                      </span>
                    </td>
                    <td style={{ padding: "14px 12px" }}><ScoreBadge score={f.score} /></td>
                    <td style={{ padding: "14px 12px" }}>
                      <button onClick={() => setConfirmFiche(f)} style={{ background: "#2D604F", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ✅ Valider internement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending observations */}
        {pendingObs.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#92400e", marginBottom: 12 }}>
              ⏳ Observations non résolues — validation impossible
            </div>
            {pendingObs.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #fef3c7" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1a2e22" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{f.obsResolved}/{f.totalObs} observations résolues par le Préparateur</div>
                </div>
                <ScoreBadge score={f.score} />
              </div>
            ))}
          </div>
        )}

        {/* Validated fiches */}
        {validated.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#166534", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>✅</span> Validées internement ({validated.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {validated.map((f) => {
                const isAuth = authorizedIds.includes(f.id);
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: isAuth ? "#f0fdf4" : "#fafafa", borderRadius: 10, border: `1px solid ${isAuth ? "#86efac" : "#e8f0eb"}`, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: "#1a2e22" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{f.owner} · {f.cycles} cycle(s) · Score : {f.score}%</div>
                    </div>
                    <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>Validé ✓</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "#4b6358", fontWeight: 600 }}>Autoriser pour audit externe</span>
                      <div
                        onClick={() => toggleAuthorize(f.id)}
                        style={{ width: 44, height: 24, borderRadius: 12, background: isAuth ? "#22c55e" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                      >
                        <div style={{ position: "absolute", top: 3, left: isAuth ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                      </div>
                      {isAuth && <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>✓ Autorisé</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fiches.every((f) => f.status === "pending-obs") && validated.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2e22" }}>Aucune fiche prête pour validation</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Les Préparateurs doivent d'abord répondre à vos observations.</div>
          </div>
        )}
      </div>
    </div>
  );
}
