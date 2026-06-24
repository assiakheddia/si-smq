import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const MOCK_AUDITS = [
  { id: 1, process: "Gestion des achats",         owner: "Benchikh Mohamed", validatedDate: "20/06/2026", auditDate: "25/06/2026", status: "en-cours",  progress: 60 },
  { id: 2, process: "Gestion des non-conformités",owner: "Mekki Younes",     validatedDate: "14/06/2026", auditDate: "10/06/2026", status: "termine",   progress: 100},
  { id: 3, process: "Audit interne",              owner: "Bensalem Hocine",  validatedDate: "10/06/2026", auditDate: "05/06/2026", status: "termine",   progress: 100},
  { id: 4, process: "Formation du personnel",     owner: "Hadj Ali Farida",  validatedDate: "15/06/2026", auditDate: "28/06/2026", status: "planifie",  progress: 0  },
  { id: 5, process: "Contrôle qualité labo",      owner: "Sahraoui Nadia",   validatedDate: "18/06/2026", auditDate: "30/06/2026", status: "planifie",  progress: 0  },
];

const STATUS_MAP = {
  "planifie": { label: "En attente",  bg: "#fef3c7", color: "#92400e" },
  "en-cours": { label: "En cours",    bg: "#dbeafe", color: "#1e40af" },
  "termine":  { label: "Terminé",     bg: "#dcfce7", color: "#166534" },
};

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }),
};

export default function AssignedAudits() {
  const [audits, setAudits] = useState(MOCK_AUDITS);
  const [filter, setFilter] = useState("all");

  const start = (id) => setAudits((prev) => prev.map((a) => a.id === id ? { ...a, status: "en-cours", progress: 10 } : a));

  const filtered = filter === "all" ? audits : audits.filter((a) => a.status === filter);

  return (
    <div style={S.page}>
      <Topbar title="Audits assignés" userName="Benmoussa Sarah" userRole="Auditeur Externe" userInitials="BS" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Audits assignés</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Processus validés internement et prêts pour l'audit externe.</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all","Tous"],["planifie","En attente"],["en-cours","En cours"],["termine","Terminés"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filter === val ? "#2D604F" : "#fff", color: filter === val ? "#fff" : "#4b6358", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((audit) => {
            const ss = STATUS_MAP[audit.status];
            return (
              <div key={audit.id} style={S.card}>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>{audit.process}</div>
                      <div style={{ fontSize: 12, color: "#6b8c75" }}>
                        Responsable : <strong>{audit.owner}</strong> · Validé le {audit.validatedDate} · Prévu le {audit.auditDate}
                      </div>
                    </div>

                    {/* Status + progress */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{ss.label}</span>
                      {audit.status !== "planifie" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                          <div style={{ flex: 1, height: 8, background: "#f0f2f4", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${audit.progress}%`, height: "100%", background: audit.progress === 100 ? "#22c55e" : "#3b82f6", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#4b6358" }}>{audit.progress}%</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {audit.status === "planifie" && (
                        <button onClick={() => start(audit.id)} style={S.btn("#fff", "#2D604F")}>▶ Démarrer l'audit</button>
                      )}
                      {audit.status === "en-cours" && (
                        <button style={S.btn("#1e40af", "#dbeafe")}>✏ Continuer l'évaluation</button>
                      )}
                      {audit.status === "termine" && (
                        <button style={S.btn("#166534", "#dcfce7")}>📄 Voir le rapport</button>
                      )}
                    </div>
                  </div>

                  {/* Permission reminder */}
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
