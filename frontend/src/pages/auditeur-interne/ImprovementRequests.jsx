import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";

const PROCESSES = ["Gestion des achats", "Contrôle qualité labo", "Formation du personnel", "Gestion des non-conformités", "Audit interne"];
const ISO_CLAUSES = ["4.1", "4.2", "4.4", "5.1", "5.2", "6.1", "6.2", "7.1", "7.2", "7.5", "8.1", "8.4", "9.1", "9.2", "10.1", "10.2"];

const INITIAL_ITEMS = {
  observations: [
    { id: 1, process: "Gestion des achats", clause: "8.4", date: "20/06/2026", status: "en-attente", text: "Les critères d'évaluation des fournisseurs ne sont pas formalisés. Il est recommandé de créer une grille d'évaluation standardisée avec des seuils minimaux de performance.", response: null },
    { id: 2, process: "Formation du personnel", clause: "7.2", date: "17/06/2026", status: "prise-en-compte", text: "Le plan de formation 2026 ne précise pas les modalités d'évaluation post-formation. Des critères de validation des acquis doivent être définis.", response: "Ajouté dans la version 3 — grille d'évaluation post-formation incluse." },
  ],
  recommandations: [
    { id: 3, process: "Contrôle qualité labo", clause: "9.1", date: "18/06/2026", status: "en-attente", text: "Il est recommandé d'automatiser le suivi des résultats d'analyse via le LIMS existant pour réduire les erreurs de saisie manuelle et améliorer la traçabilité.", response: null },
    { id: 4, process: "Gestion des non-conformités", clause: "10.2", date: "14/06/2026", status: "cloturee", text: "Mettre en place un système de suivi des actions correctives avec des délais définis et des responsables identifiés pour chaque non-conformité.", response: "Système de suivi implémenté. Tableau de bord NC créé." },
  ],
  corrections: [
    { id: 5, process: "Gestion des achats", clause: "7.5", date: "19/06/2026", status: "en-attente", text: "La fiche ne contient aucune référence aux documents de maîtrise requis par la clause 7.5. Les procédures P-ACH-001 et P-ACH-002 doivent être listées et référencées.", response: null },
    { id: 6, process: "Contrôle qualité labo", clause: "4.1", date: "16/06/2026", status: "prise-en-compte", text: "L'analyse du contexte (parties intéressées, enjeux internes/externes) est absente de la fiche. Cette section est obligatoire selon ISO 9001 clause 4.1.", response: "Section contexte ajoutée en version 2. Analyse SWOT incluse." },
  ],
};

const STATUS_MAP = {
  "en-attente":     { label: "En attente réponse", bg: "#fef3c7", color: "#92400e" },
  "prise-en-compte":{ label: "Prise en compte", bg: "#dcfce7", color: "#166534" },
  "cloturee":       { label: "Clôturée", bg: "#f3f4f6", color: "#374151" },
};

const TAB_CONFIG = [
  { key: "observations",   label: "Observations",        count: 2, color: "#374151", bg: "#f3f4f6" },
  { key: "recommandations",label: "Recommandations",     count: 2, color: "#5b21b6", bg: "#ede9fe" },
  { key: "corrections",    label: "Demandes de correction", count: 2, color: "#991b1b", bg: "#fee2e2" },
];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  btn: (color, bg, border) => ({ background: bg, color, border: `1px solid ${border || color + "33"}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
};

function ItemCard({ item, type }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_MAP[item.status];
  const typeColors = {
    observations:    { icon: "💬", color: "#374151", bg: "#f3f4f6" },
    recommandations: { icon: "💡", color: "#5b21b6", bg: "#ede9fe" },
    corrections:     { icon: "⚠️", color: "#991b1b", bg: "#fee2e2" },
  };
  const tc = typeColors[type];

  return (
    <div style={{ background: "#fff", border: "1px solid #f0f2f4", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{tc.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22" }}>{item.process}</span>
            <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{item.clause}</span>
            <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "1px 10px", fontSize: 10, fontWeight: 700 }}>{s.label}</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{item.date}</span>
          </div>
          <p style={{ fontSize: 13, color: "#4b6358", margin: 0, lineHeight: 1.6 }}>
            {expanded ? item.text : item.text.slice(0, 120) + (item.text.length > 120 ? "..." : "")}
          </p>
          {item.text.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#2D604F", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4, fontWeight: 600 }}>
              {expanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
          {item.response && (
            <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 3 }}>Réponse du Préparateur</div>
              <div style={{ fontSize: 12, color: "#14532d" }}>{item.response}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImprovementRequests() {
  const [activeTab, setActiveTab] = useState("observations");
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ process: "", type: "observations", clause: "", text: "" });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!form.process || !form.clause || !form.text.trim()) return;
    const newItem = { id: Date.now(), process: form.process, clause: form.clause, date: new Date().toLocaleDateString("fr-FR"), status: "en-attente", text: form.text, response: null };
    setItems((prev) => ({ ...prev, [form.type]: [newItem, ...prev[form.type]] }));
    setActiveTab(form.type);
    setShowForm(false);
    setSaved(true);
    setForm({ process: "", type: "observations", clause: "", text: "" });
    setTimeout(() => setSaved(false), 3000);
  };

  const currentItems = items[activeTab] || [];

  return (
    <div style={S.page}>
      <Topbar title="Demandes d'amélioration" userName="Meziani Karim" userRole="Auditeur Interne" userInitials="MK" />
      <div style={S.inner}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2e22", marginBottom: 4 }}>Observations & demandes</h1>
            <p style={{ fontSize: 13, color: "#5a7a66" }}>Gérez vos observations, recommandations et demandes de corrections adressées aux Préparateurs.</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setSaved(false); }} style={S.btn("#fff", "#2D604F", "#2D604F")}>
            + Nouvelle demande
          </button>
        </div>

        {saved && (
          <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <span>✅</span><span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Demande enregistrée et envoyée au Préparateur.</span>
          </div>
        )}

        {/* New request form */}
        {showForm && (
          <div style={{ ...S.card, padding: 24, marginBottom: 20, border: "1px solid #d4e9d7" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 }}>Créer une nouvelle demande</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Processus concerné *</label>
                <select value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  <option value="">Sélectionner...</option>
                  {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Type *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  <option value="observations">Observation</option>
                  <option value="recommandations">Recommandation</option>
                  <option value="corrections">Demande de correction</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Clause ISO *</label>
                <select value={form.clause} onChange={(e) => setForm({ ...form, clause: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  <option value="">Sélectionner...</option>
                  {ISO_CLAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Description *</label>
              <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Décrivez précisément votre observation, recommandation ou les corrections requises..." rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSave} disabled={!form.process || !form.clause || !form.text.trim()} style={{ ...S.btn("#fff", "#2D604F", "#2D604F"), opacity: (!form.process || !form.clause || !form.text.trim()) ? 0.5 : 1 }}>Envoyer la demande</button>
              <button onClick={() => setShowForm(false)} style={S.btn("#6b7280", "#f3f4f6", "#e5e7eb")}>Annuler</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#fff", borderRadius: 10, padding: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", width: "fit-content" }}>
          {TAB_CONFIG.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: activeTab === tab.key ? tab.bg : "transparent", color: activeTab === tab.key ? tab.color : "#9ca3af", transition: "all 0.15s" }}>
              {tab.label}
              <span style={{ marginLeft: 6, background: activeTab === tab.key ? tab.color + "22" : "#f3f4f6", color: activeTab === tab.key ? tab.color : "#9ca3af", borderRadius: 20, padding: "0px 7px", fontSize: 10, fontWeight: 800 }}>
                {items[tab.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Items list */}
        {currentItems.length === 0 ? (
          <div style={{ ...S.card, padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22" }}>Aucun élément dans cet onglet</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Créez une nouvelle demande pour commencer.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentItems.map((item) => <ItemCard key={item.id} item={item} type={activeTab} />)}
          </div>
        )}
      </div>
    </div>
  );
}
