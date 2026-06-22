import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const STATUS = {
  "en-attente":  { label: "En attente", bg: "#fef3c7", color: "#92400e" },
  "en-revision": { label: "En révision", bg: "#dbeafe", color: "#1e40af" },
  "corrigee":    { label: "Corrigée", bg: "#ede9fe", color: "#5b21b6" },
  "validee":     { label: "Validée", bg: "#dcfce7", color: "#166534" },
};

const ISO_CLAUSES_LIST = ["4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "6.1", "6.2", "7.1", "7.2", "7.5", "8.1", "8.4", "9.1", "9.2", "10.1", "10.2"];

const MOCK_FICHES = [
  {
    id: 1, name: "Gestion des achats", owner: "Benchikh Mohamed", version: 2, submitted: "20/06/2026",
    status: "en-attente", scope: "Couvre l'ensemble du processus d'achat, de l'expression du besoin jusqu'à la réception.",
    inputs: "Demandes d'achat internes, catalogue fournisseurs", outputs: "Bons de commande, réceptions validées",
    resources: "Service achat, ERP SAP", risks: "Délais fournisseurs, non-conformité des livraisons",
    isoClauses: ["7.1", "8.4", "8.1"], versions: [
      { v: 1, date: "10/06/2026", note: "Version initiale" },
      { v: 2, date: "20/06/2026", note: "Ajout des critères fournisseurs" },
    ],
  },
  {
    id: 2, name: "Contrôle qualité laboratoire", owner: "Sahraoui Nadia", version: 1, submitted: "18/06/2026",
    status: "en-revision", scope: "Procédures de contrôle des échantillons et rapports de test.",
    inputs: "Échantillons, protocoles de test", outputs: "Rapports de conformité, certificats",
    resources: "Laboratoire, équipements certifiés", risks: "Erreurs de manipulation, équipements non calibrés",
    isoClauses: ["9.1", "7.1", "4.1"], versions: [
      { v: 1, date: "18/06/2026", note: "Version initiale" },
    ],
  },
  {
    id: 3, name: "Formation du personnel", owner: "Hadj Ali Farida", version: 3, submitted: "15/06/2026",
    status: "corrigee", scope: "Identification des besoins en formation et plan de développement des compétences.",
    inputs: "Fiches de poste, évaluations annuelles", outputs: "Plan de formation, attestations",
    resources: "DRH, formateurs internes/externes", risks: "Budget insuffisant, indisponibilité",
    isoClauses: ["7.2", "5.1", "6.1"], versions: [
      { v: 1, date: "01/06/2026", note: "Première ébauche" },
      { v: 2, date: "08/06/2026", note: "Corrections suite observations AI" },
      { v: 3, date: "15/06/2026", note: "Révision majeure — ajout indicateurs" },
    ],
  },
  {
    id: 4, name: "Gestion des non-conformités", owner: "Mekki Younes", version: 2, submitted: "12/06/2026",
    status: "en-attente", scope: "Détection, traitement et suivi des non-conformités produit et processus.",
    inputs: "Résultats d'audits, retours clients, inspections", outputs: "Actions correctives, rapports NC",
    resources: "Responsables processus, outil de suivi", risks: "Non-détection, récidive",
    isoClauses: ["10.2", "9.1", "8.1"], versions: [
      { v: 1, date: "01/06/2026", note: "Version initiale" },
      { v: 2, date: "12/06/2026", note: "Ajout du suivi des actions correctives" },
    ],
  },
  {
    id: 5, name: "Audit interne", owner: "Bensalem Hocine", version: 1, submitted: "10/06/2026",
    status: "validee", scope: "Programme annuel d'audits internes selon ISO 9001.",
    inputs: "Programme d'audit, critères d'audit", outputs: "Rapports d'audit, actions correctives",
    resources: "Auditeurs internes certifiés", risks: "Conflits d'intérêts, non-objectivité",
    isoClauses: ["9.2", "5.2", "4.3"], versions: [
      { v: 1, date: "10/06/2026", note: "Version soumise et validée" },
    ],
  },
];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  btn: (color, bg) => ({ background: bg, color, border: `1px solid ${color}22`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }),
};

function Badge({ status }) {
  const s = STATUS[status] || STATUS["en-attente"];
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

function ISOBadge({ clause }) {
  return <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>{clause}</span>;
}

function FicheDetail({ fiche, onClose }) {
  const [showCompare, setShowCompare] = useState(false);
  const [obsText, setObsText] = useState("");
  const [corrText, setCorrText] = useState("");
  const [showObsForm, setShowObsForm] = useState(false);
  const [showCorrForm, setShowCorrForm] = useState(false);
  const [submitted, setSubmitted] = useState({ obs: false, corr: false });

  return (
    <div style={{ background: "#f8fffe", border: "1px solid #d4e9d7", borderRadius: 12, padding: 24, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a2e22" }}>{fiche.name} — Détails complets</div>
        <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>✕ Fermer</button>
      </div>

      {/* Sheet info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          ["Propriétaire", fiche.owner], ["Version actuelle", `v${fiche.version}`],
          ["Portée", fiche.scope], ["Entrées", fiche.inputs],
          ["Sorties", fiche.outputs], ["Ressources", fiche.resources],
          ["Risques", fiche.risks],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8f0eb" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, color: "#1a2e22" }}>{val}</div>
          </div>
        ))}
        <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8f0eb" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }}>Clauses ISO liées</div>
          {fiche.isoClauses.map((c) => <ISOBadge key={c} clause={c} />)}
        </div>
      </div>

      {/* Version history */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", marginBottom: 10 }}>Historique des versions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fiche.versions.map((v) => (
            <div key={v.v} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e8f0eb" }}>
              <span style={{ background: "#1e40af", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>v{v.v}</span>
              <span style={{ fontSize: 12, color: "#4b6358", flex: 1 }}>{v.note}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{v.date}</span>
            </div>
          ))}
        </div>
        {fiche.versions.length > 1 && (
          <button onClick={() => setShowCompare(!showCompare)} style={{ marginTop: 10, background: "none", border: "1px solid #d4e9d7", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#2D604F", fontWeight: 600, cursor: "pointer" }}>
            {showCompare ? "Masquer" : "Comparer"} v{fiche.versions.length - 1} → v{fiche.versions.length}
          </button>
        )}
        {showCompare && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={{ background: "#fee2e2", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>v{fiche.versions.length - 1} — Précédente</div>
              <div style={{ fontSize: 12, color: "#7f1d1d" }}>— Absence de critères de sélection fournisseurs<br />— Indicateurs non définis</div>
            </div>
            <div style={{ background: "#dcfce7", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 8 }}>v{fiche.versions.length} — Actuelle</div>
              <div style={{ fontSize: 12, color: "#14532d" }}>+ Critères fournisseurs ajoutés (§8.4)<br />+ KPIs définis : délai livraison, taux conformité</div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => { setShowObsForm(!showObsForm); setShowCorrForm(false); }} style={S.btn("#1e40af", "#dbeafe")}>+ Ajouter une observation</button>
        <button onClick={() => { setShowCorrForm(!showCorrForm); setShowObsForm(false); }} style={S.btn("#991b1b", "#fee2e2")}>⚠ Demander des corrections</button>
      </div>

      {/* Observation form */}
      {showObsForm && !submitted.obs && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 10 }}>Nouvelle observation</div>
          <textarea value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Décrivez votre observation..." style={{ width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid #bfdbfe", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setSubmitted({ ...submitted, obs: true }); setShowObsForm(false); }} style={S.btn("#1e40af", "#2563eb")} disabled={!obsText.trim()}>Soumettre l'observation</button>
            <button onClick={() => setShowObsForm(false)} style={S.btn("#6b7280", "#f3f4f6")}>Annuler</button>
          </div>
        </div>
      )}

      {/* Correction form */}
      {showCorrForm && !submitted.corr && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>Demande de corrections</div>
          <textarea value={corrText} onChange={(e) => setCorrText(e.target.value)} placeholder="Décrivez les corrections requises et les clauses ISO non respectées..." style={{ width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid #fed7aa", padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setSubmitted({ ...submitted, corr: true }); setShowCorrForm(false); }} style={S.btn("#fff", "#92400e")} disabled={!corrText.trim()}>Envoyer au Préparateur</button>
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
    </div>
  );
}

export default function ReviewFiches() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = MOCK_FICHES.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={S.page}>
      <Topbar title="Révision des fiches de processus" userName="Meziani Karim" userRole="Auditeur Interne" userInitials="MK" />
      <div style={S.inner}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Fiches de processus soumises</h1>
          <p style={{ fontSize: 13, color: "#5a7a66" }}>{MOCK_FICHES.length} fiches au total — {MOCK_FICHES.filter(f => f.status === "en-attente").length} en attente de votre révision</p>
        </div>

        {/* Filters */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher par nom ou propriétaire..."
            style={{ flex: 1, minWidth: 220, padding: "9px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <option value="all">Tous les statuts</option>
            <option value="en-attente">En attente</option>
            <option value="en-revision">En révision</option>
            <option value="corrigee">Corrigée</option>
            <option value="validee">Validée</option>
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} résultat(s)</span>
        </div>

        {/* Fiches list */}
        {filtered.length === 0 ? (
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
                    <div style={{ fontSize: 12, color: "#6b8c75" }}>Propriétaire : {fiche.owner} · Soumis le {fiche.submitted}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ background: "#1e40af22", color: "#1e40af", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>v{fiche.version}</span>
                    <Badge status={fiche.status} />
                    <div style={{ display: "flex", gap: 6 }}>
                      {fiche.isoClauses.slice(0, 2).map((c) => <ISOBadge key={c} clause={c} />)}
                      {fiche.isoClauses.length > 2 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{fiche.isoClauses.length - 2}</span>}
                    </div>
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
                    <FicheDetail fiche={fiche} onClose={() => setExpanded(null)} />
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
