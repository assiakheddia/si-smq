import { useState, useEffect } from "react";
import Topbar from "../../components/Topbar.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

const TYPE_TO_TAB = { amelioration: "observations", preventive: "recommandations", corrective: "corrections", immediat: "corrections" };
const TAB_TO_TYPE = { observations: "amelioration", recommandations: "preventive", corrections: "corrective" };

const STATUS_MAP = {
  planifiee:       { label: "En attente réponse", bg: "#fef3c7", color: "#92400e" },
  en_cours:        { label: "En cours", bg: "#dbeafe", color: "#1e40af" },
  en_verification: { label: "Prise en compte", bg: "#dcfce7", color: "#166534" },
  close:           { label: "Clôturée", bg: "#f3f4f6", color: "#374151" },
  annulee:         { label: "Annulée", bg: "#fee2e2", color: "#991b1b" },
};

const TAB_CONFIG = [
  { key: "observations",    label: "Observations",           color: "#374151", bg: "#f3f4f6" },
  { key: "recommandations", label: "Recommandations",        color: "#5b21b6", bg: "#ede9fe" },
  { key: "corrections",     label: "Demandes de correction", color: "#991b1b", bg: "#fee2e2" },
];

const S = {
  page: { minHeight: "100vh", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" },
  inner: { padding: "28px 32px", maxWidth: 1280 },
  card: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  btn: (color, bg, border) => ({ background: bg, color, border: `1px solid ${border || color + "33"}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }),
};

function ItemCard({ item, type, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [editingEcheance, setEditingEcheance] = useState(false);
  const [echeanceDraft, setEcheanceDraft] = useState(item.date_echeance ? item.date_echeance.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const s = STATUS_MAP[item.statut] || STATUS_MAP.planifiee;
  const typeColors = {
    observations:    { icon: "💬", color: "#374151", bg: "#f3f4f6" },
    recommandations: { icon: "💡", color: "#5b21b6", bg: "#ede9fe" },
    corrections:     { icon: "⚠️", color: "#991b1b", bg: "#fee2e2" },
  };
  const tc = typeColors[type];
  const text = item.description || item.titre || "";

  const saveEcheance = async () => {
    setSaving(true);
    try {
      await api.put(`/actions/${item.id}`, {
        date_echeance: echeanceDraft ? `${echeanceDraft}T00:00:00` : null,
      });
      setEditingEcheance(false);
      onUpdated?.();
    } catch {
      // le champ reste ouvert pour réessayer
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #f0f2f4", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{tc.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22" }}>{item.processus_nom || "—"}</span>
            <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{item.reference || `#${item.id}`}</span>
            <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "1px 10px", fontSize: 10, fontWeight: 700 }}>{s.label}</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{item.date_creation ? new Date(item.date_creation).toLocaleDateString("fr-FR") : "—"}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e22", marginBottom: 4 }}>{item.titre}</div>
          <p style={{ fontSize: 13, color: "#4b6358", margin: 0, lineHeight: 1.6 }}>
            {expanded ? text : text.slice(0, 120) + (text.length > 120 ? "..." : "")}
          </p>
          {text.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#2D604F", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4, fontWeight: 600 }}>
              {expanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
          {item.responsable && (
            <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 3 }}>Responsable</div>
              <div style={{ fontSize: 12, color: "#14532d" }}>{item.responsable.prenom} {item.responsable.nom}</div>
            </div>
          )}
          {type === "corrections" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Échéance</span>
              {editingEcheance ? (
                <>
                  <input
                    type="date"
                    value={echeanceDraft}
                    onChange={(e) => setEcheanceDraft(e.target.value)}
                    style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid #e8f0eb" }}
                  />
                  <button onClick={saveEcheance} disabled={saving} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#2D604F", border: "none", borderRadius: 6, padding: "3px 8px", cursor: saving ? "not-allowed" : "pointer" }}>✓</button>
                  <button onClick={() => setEditingEcheance(false)} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </>
              ) : (
                <span
                  onClick={() => setEditingEcheance(true)}
                  style={{ fontSize: 12, color: "#1a2e22", cursor: "pointer" }}
                  title="Cliquer pour modifier l'échéance"
                >
                  {item.date_echeance ? new Date(item.date_echeance).toLocaleDateString("fr-FR") : "—"}
                  <span style={{ marginLeft: 4, color: "#9ca3af" }}>✎</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImprovementRequests() {
  const user = getCurrentUser();
  const initials = (user?.nom_complet || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";

  const [activeTab, setActiveTab] = useState("observations");
  const [actions, setActions] = useState([]);
  const [processusList, setProcessusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ processus_id: "", type: "observations", titre: "", text: "", priorite: "normale", date_echeance: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api.get("/actions/").catch(() => []),
      api.get("/processus/").catch(() => []),
    ]).then(([acts, procs]) => {
      setActions(Array.isArray(acts) ? acts : []);
      setProcessusList(Array.isArray(procs) ? procs : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.processus_id || !form.titre.trim() || !form.text.trim()) return;
    setSaving(true);
    try {
      await api.post("/actions/", {
        titre: form.titre,
        description: form.text,
        type: TAB_TO_TYPE[form.type],
        priorite: form.type === "corrections" ? form.priorite : "normale",
        date_echeance: form.type === "corrections" && form.date_echeance ? `${form.date_echeance}T00:00:00` : null,
        processus_id: Number(form.processus_id),
        origine: "manuelle",
      });
      setActiveTab(form.type);
      setShowForm(false);
      setSaved(true);
      setForm({ processus_id: "", type: "observations", titre: "", text: "", priorite: "normale", date_echeance: "" });
      load();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // swallow — error left to global handler
    } finally {
      setSaving(false);
    }
  };

  const grouped = { observations: [], recommandations: [], corrections: [] };
  actions.forEach((a) => {
    const tab = TYPE_TO_TAB[a.type] || "observations";
    grouped[tab].push(a);
  });

  const currentItems = grouped[activeTab] || [];

  return (
    <div style={S.page}>
      <Topbar title="Demandes d'amélioration" userName={user?.nom_complet || "—"} userRole="Auditeur Interne" userInitials={initials} />
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

        {showForm && (
          <div style={{ ...S.card, padding: 24, marginBottom: 20, border: "1px solid #d4e9d7" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22", marginBottom: 16 }}>Créer une nouvelle demande</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Processus concerné *</label>
                <select value={form.processus_id} onChange={(e) => setForm({ ...form, processus_id: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  <option value="">Sélectionner...</option>
                  {processusList.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
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
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Titre *</label>
                <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre court..." style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>
            {form.type === "corrections" && (
              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Gravité de la non-conformité *</label>
                  <select
                    value={form.priorite}
                    onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                    style={{ width: 220, padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  >
                    <option value="normale">Mineure</option>
                    <option value="haute">Majeure</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Date d'échéance</label>
                  <input
                    type="date"
                    value={form.date_echeance}
                    onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
                    style={{ width: 180, padding: "9px 12px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b6358", display: "block", marginBottom: 5 }}>Description *</label>
              <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Décrivez précisément votre observation, recommandation ou les corrections requises..." rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e8f0eb", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSave} disabled={!form.processus_id || !form.titre.trim() || !form.text.trim() || saving} style={{ ...S.btn("#fff", "#2D604F", "#2D604F"), opacity: (!form.processus_id || !form.titre.trim() || !form.text.trim() || saving) ? 0.5 : 1 }}>Envoyer la demande</button>
              <button onClick={() => setShowForm(false)} style={S.btn("#6b7280", "#f3f4f6", "#e5e7eb")}>Annuler</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#fff", borderRadius: 10, padding: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", width: "fit-content" }}>
          {TAB_CONFIG.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: activeTab === tab.key ? tab.bg : "transparent", color: activeTab === tab.key ? tab.color : "#9ca3af", transition: "all 0.15s" }}>
              {tab.label}
              <span style={{ marginLeft: 6, background: activeTab === tab.key ? tab.color + "22" : "#f3f4f6", color: activeTab === tab.key ? tab.color : "#9ca3af", borderRadius: 20, padding: "0px 7px", fontSize: 10, fontWeight: 800 }}>
                {grouped[tab.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...S.card, padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Chargement...</div>
          </div>
        ) : currentItems.length === 0 ? (
          <div style={{ ...S.card, padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2e22" }}>Aucun élément dans cet onglet</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Créez une nouvelle demande pour commencer.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentItems.map((item) => <ItemCard key={item.id} item={item} type={activeTab} onUpdated={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
