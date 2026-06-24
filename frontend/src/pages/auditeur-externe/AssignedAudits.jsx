import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const STATUS_MAP = {
  brouillon: { label: "En attente", bg: "#fef3c7", color: "#92400e" },
  soumis:    { label: "Soumis",     bg: "#dbeafe", color: "#1e40af" },
  valide:    { label: "Validé",     bg: "#dcfce7", color: "#166534" },
  archive:   { label: "Archivé",    bg: "#f3f4f6", color: "#374151" },
};

const FILTER_OPTS = [["all", "Tous"], ["brouillon", "En attente"], ["soumis", "Soumis"], ["valide", "Validés"]];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }),
};

function progressForStatut(statut) {
  if (statut === "valide" || statut === "archive") return 100;
  if (statut === "soumis") return 60;
  return 10;
}

export default function AssignedAudits() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [audits, setAudits] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/diagnostics/").catch(() => []).then((diags) => {
      const all = Array.isArray(diags) ? diags : [];
      const mine = all.filter((d) => d.auditeur?.id === user?.id);
      setAudits(mine.length > 0 ? mine : all);
    }).finally(() => setLoading(false));
  }, []);

  const start = async (id) => {
    try {
      await api.post(`/diagnostics/${id}/soumettre`, {});
      setAudits((prev) => prev.map((a) => a.id === id ? { ...a, statut: "soumis" } : a));
    } catch (err) {
      console.error("Démarrage de l'audit échoué:", err);
    }
  };

  const filtered = filter === "all" ? audits : audits.filter((a) => a.statut === filter);

  if (loading) {
    return (
      <div style={S.page}>
        <Topbar title="Audits assignés" userName={user?.nom_complet} userRole="Auditeur Externe" />
        <div style={S.inner}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <Topbar title="Audits assignés" userName={user?.nom_complet} userRole="Auditeur Externe" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Audits assignés</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Diagnostics ISO à votre charge en tant qu'auditeur externe.</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {FILTER_OPTS.map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === val ? "#2D604F" : "#fff", color: filter === val ? "#fff" : "#4b6358", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((audit) => {
            const ss = STATUS_MAP[audit.statut] || STATUS_MAP.brouillon;
            const progress = progressForStatut(audit.statut);
            return (
              <div key={audit.id} style={S.card}>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>{audit.processus?.nom || "—"}</div>
                      <div style={{ fontSize: 12, color: "#6b8c75" }}>
                        Référence : <strong>{audit.reference || "—"}</strong> · Diagnostiqué le {audit.date_diagnostic ? new Date(audit.date_diagnostic).toLocaleDateString("fr-FR") : "—"}
                        {audit.periode_couverte ? ` · Période ${audit.periode_couverte}` : ""}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{ss.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                        <div style={{ flex: 1, height: 8, background: "#f0f2f4", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#22c55e" : "#3b82f6", borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4b6358" }}>{progress}%</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {audit.statut === "brouillon" && (
                        <button onClick={() => start(audit.id)} style={S.btn("#fff", "#2D604F")}>▶ Démarrer l'audit</button>
                      )}
                      {audit.statut === "soumis" && (
                        <button onClick={() => navigate(`/ae/evaluation?diagId=${audit.id}`)} style={S.btn("#1e40af", "#dbeafe")}>✏ Continuer l'évaluation</button>
                      )}
                      {(audit.statut === "valide" || audit.statut === "archive") && (
                        <button onClick={() => navigate(`/ae/rapport?diagId=${audit.id}`)} style={S.btn("#166534", "#dcfce7")}>📄 Voir le rapport</button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, padding: "8px 12px", background: "#f8f9fa", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Lecture seule — vous ne pouvez pas modifier le contenu de cette fiche de processus.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "60px 20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2e22" }}>Aucun audit dans cette catégorie</div>
          </div>
        )}
      </div>
    </div>
  );
}
