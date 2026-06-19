import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

/* ── Mapping: form label ↔ backend TypeProcessus enum ── */
const FORM_TO_TYPE = {
  "Management":  "strategique",
  "Réalisation": "operationnel",
  "Soutien":     "support",
};
const TYPE_TO_FORM = {
  strategique:  "Management",
  operationnel: "Réalisation",
  support:      "Soutien",
};

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════ */
const C = {
  dark: "#1e3d2f",
  primary: "#2D604F",
  accent: "#77D58F",
  lightBg: "#eaf5eb",
  softBg: "#F0FFEB",
  white: "#FAFAFA",
  border: "#d4e9d7",
  text: "#1a2e22",
  muted: "#6b8c75",
  danger: "#e53935",
  warn: "#f59e0b",
};

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: C.lightBg,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    height: 60,
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    flexShrink: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: C.muted,
  },
  breadcrumbActive: { color: C.text, fontWeight: 600 },
  topbarRight: { display: "flex", alignItems: "center", gap: 16 },
  topbarBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    color: C.muted,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: C.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  /* Header card */
  headerCard: {
    borderRadius: 16,
    background: `linear-gradient(135deg, ${C.primary} 0%, #3a7a62 60%, ${C.accent} 100%)`,
    padding: "24px 28px",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  headerCardBadges: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  badgeGreen: { background: C.accent, color: C.dark },
  headerCardBody: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerCardLeft: { flex: 1 },
  headerCardTitle: {
    fontSize: 26,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    marginBottom: 8,
    color: "#fff",
  },
  headerCardDesc: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 1.6,
    maxWidth: 520,
  },
  headerCardRight: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-end",
  },
  pilotBox: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "12px 18px",
    textAlign: "right",
    minWidth: 160,
    border: "1px solid rgba(255,255,255,0.25)",
  },
  pilotLabel: {
    fontSize: 10,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  pilotName: { fontSize: 15, fontWeight: 700 },
  pilotEmail: { fontSize: 11, opacity: 0.8, marginTop: 2 },
  kpiRow: { display: "flex", gap: 8 },
  kpiBox: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: "10px 16px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.2)",
    minWidth: 64,
  },
  kpiNum: { fontSize: 20, fontWeight: 800, display: "block" },
  kpiLbl: {
    fontSize: 10,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  /* Completion bar */
  completionCard: {
    background: C.white,
    borderRadius: 12,
    padding: "14px 20px",
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  completionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
    whiteSpace: "nowrap",
  },
  completionBarWrap: {
    flex: 1,
    height: 8,
    background: C.lightBg,
    borderRadius: 99,
    overflow: "hidden",
  },
  statusBadge: {
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 700,
    background: "#fff3cd",
    color: "#856404",
    border: "1px solid #ffc107",
    whiteSpace: "nowrap",
  },
  /* Tabs */
  tabsWrap: {
    background: C.white,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    overflow: "hidden",
  },
  tabsHeader: {
    display: "flex",
    borderBottom: `1px solid ${C.border}`,
    overflowX: "auto",
    background: "#f7fbf8",
  },
  tab: {
    padding: "14px 20px",
    fontSize: 13,
    fontWeight: 500,
    color: C.muted,
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  tabActive: {
    color: C.primary,
    fontWeight: 700,
    borderBottom: `2px solid ${C.primary}`,
    background: C.white,
  },
  tabContent: { padding: "28px 28px 32px" },
  /* Sections */
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  sectionNum: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: C.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    color: C.text,
  },
  sectionSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  /* Grid */
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px 28px",
  },
  gridFull: { gridColumn: "1 / -1" },
  /* Field */
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelRequired: { color: C.danger },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.softBg,
    fontSize: 14,
    color: C.text,
    outline: "none",
    transition: "border 0.2s",
    boxSizing: "border-box",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  inputError: { border: `1.5px solid ${C.danger}` },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.softBg,
    fontSize: 14,
    color: C.text,
    outline: "none",
    resize: "vertical",
    minHeight: 90,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: C.softBg,
    fontSize: 14,
    color: C.text,
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: "border-box",
  },
  errorMsg: { fontSize: 11, color: C.danger, marginTop: 2 },
  /* Tags */
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: "8px 10px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 10,
    background: C.softBg,
    minHeight: 42,
    cursor: "text",
  },
  tag: {
    background: C.lightBg,
    border: `1px solid ${C.accent}`,
    color: C.primary,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tagX: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: C.muted,
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
  },
  tagInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    flex: 1,
    minWidth: 100,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: C.text,
  },
  /* Dynamic list */
  dynItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: C.lightBg,
    borderRadius: 10,
    padding: "8px 12px",
    border: `1px solid ${C.border}`,
  },
  dynInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: C.text,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  dynRemove: {
    background: "none",
    border: "none",
    color: "#e57373",
    cursor: "pointer",
    fontSize: 16,
    padding: "0 4px",
  },
  addBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 10,
    border: `1.5px dashed ${C.accent}`,
    background: "rgba(119,213,143,0.07)",
    color: C.primary,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    transition: "all 0.2s",
  },
  /* KPI card */
  kpiCard: {
    background: C.lightBg,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: "16px 18px",
    marginBottom: 12,
  },
  kpiCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  kpiCardTitle: { fontSize: 13, fontWeight: 700, color: C.primary },
  removeCard: {
    background: "none",
    border: "none",
    color: "#e57373",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 8px",
    borderRadius: 6,
    fontWeight: 600,
  },
  /* Divider */
  divider: { height: 1, background: C.border, margin: "24px 0" },
  /* History placeholder */
  historyPlaceholder: {
    background: C.lightBg,
    borderRadius: 12,
    padding: "24px",
    border: `1.5px dashed ${C.border}`,
    textAlign: "center",
    color: C.muted,
    fontSize: 13,
  },
  /* RACI */
  raciGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px 20px",
  },
  /* Risk card */
  riskCard: {
    background: C.lightBg,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: "16px 18px",
    marginBottom: 12,
  },
  critBadge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 12,
  },
  /* Doc table */
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: C.lightBg,
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    border: `1px solid ${C.border}`,
  },
  td: {
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    color: C.text,
    verticalAlign: "top",
  },
  /* Dysfonctionnement card */
  dysfCard: {
    background: C.lightBg,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    padding: "18px 20px",
    marginBottom: 14,
  },
  /* Étape card */
  etapeCard: {
    display: "flex",
    gap: 16,
    background: C.lightBg,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: "14px 16px",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  etapeNum: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: C.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
    marginTop: 2,
  },
  /* BPMN box */
  bpmnBox: {
    border: `2px dashed ${C.accent}`,
    borderRadius: 14,
    background: "rgba(119,213,143,0.05)",
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
    marginTop: 16,
  },
  bpmnBtnRow: { display: "flex", gap: 12 },
  bpmnBtn: {
    padding: "10px 20px",
    borderRadius: 10,
    border: `1.5px solid ${C.primary}`,
    background: C.white,
    color: C.primary,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  /* Action bar */
  actionBar: {
    background: C.white,
    borderTop: `1px solid ${C.border}`,
    padding: "16px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  btnCancel: {
    padding: "10px 22px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: "transparent",
    color: C.muted,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnDraft: {
    padding: "10px 22px",
    borderRadius: 10,
    border: `1.5px solid ${C.primary}`,
    background: "transparent",
    color: C.primary,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnPreview: {
    padding: "10px 22px",
    borderRadius: 10,
    border: `1.5px solid ${C.accent}`,
    background: "rgba(119,213,143,0.1)",
    color: C.primary,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnPublish: {
    padding: "10px 28px",
    borderRadius: 10,
    border: "none",
    background: C.primary,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(45,96,79,0.3)",
    transition: "all 0.2s",
  },
  /* Toast */
  toast: {
    position: "fixed",
    bottom: 28,
    right: 28,
    borderRadius: 12,
    padding: "14px 22px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    zIndex: 9999,
    animation: "slideUp 0.3s ease",
  },
  fluxBox: {
    display: "grid",
    gridTemplateColumns: "1fr 40px 1fr",
    gap: 12,
    alignItems: "start",
    background: C.lightBg,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fluxArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.muted,
    fontSize: 22,
    paddingTop: 4,
  },
};

/* ═══════════════════════════════════════════════════════════════════
   REUSABLE FIELD COMPONENTS
═══════════════════════════════════════════════════════════════════ */
function Field({ label, required, error, children }) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>
        {label}
        {required && (
          <span style={{ ...styles.labelRequired, marginLeft: 3 }}>*</span>
        )}
      </label>
      {children}
      {error && <span style={styles.errorMsg}>⚠ {error}</span>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  readOnly,
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        ...styles.input,
        ...(error ? styles.inputError : {}),
        ...(readOnly ? { opacity: 0.65, cursor: "default" } : {}),
      }}
      onFocus={(e) => {
        if (!readOnly) e.target.style.borderColor = C.primary;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? C.danger : C.border;
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={styles.textarea}
      onFocus={(e) => {
        e.target.style.borderColor = C.primary;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = C.border;
      }}
    />
  );
}

function Select({ value, onChange, options, error }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{ ...styles.select, ...(error ? styles.inputError : {}) }}
      >
        <option value="">— Sélectionner —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: C.muted,
        }}
      >
        ▾
      </span>
    </div>
  );
}

function TagInput({ tags, onChange, placeholder = "Ajouter..." }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  const remove = (t) => onChange(tags.filter((x) => x !== t));
  return (
    <div
      style={styles.tagWrap}
      onClick={(e) => e.currentTarget.querySelector("input")?.focus()}
    >
      {tags.map((t) => (
        <span key={t} style={styles.tag}>
          {t}
          <button type="button" style={styles.tagX} onClick={() => remove(t)}>
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={styles.tagInput}
      />
    </div>
  );
}

function DynamicList({
  items,
  onChange,
  placeholder = "Entrer une valeur...",
}) {
  const update = (i, v) => {
    const a = [...items];
    a[i] = v;
    onChange(a);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={styles.dynItem}>
          <span
            style={{
              color: C.muted,
              fontSize: 12,
              fontWeight: 700,
              minWidth: 18,
            }}
          >
            →
          </span>
          <input
            value={it}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            style={styles.dynInput}
          />
          <button
            type="button"
            style={styles.dynRemove}
            onClick={() => remove(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" style={styles.addBtn} onClick={add}>
        <span>＋</span> Ajouter
      </button>
    </div>
  );
}

function SectionHeader({ num, title, sub }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionNum}>{num}</div>
      <div>
        <div style={styles.sectionTitle}>{title}</div>
        {sub && <div style={styles.sectionSub}>{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════════════ */
const INIT = {
  // Tab 1
  identifiant: "PROC-008",
  designation: "",
  pilote: "",
  email: "",
  telephone: "",
  sousDept: "",
  typeProcessus: "",
  objectif: "",
  structures: [],
  raci: { responsable: "", approbateur: "", consulte: "", informe: "" },
  // Tab 2
  periode: "",
  objectifStrategique: "",
  fluxEntrees: [""],
  fluxSorties: [""],
  clients: "",
  effectifs: "",
  competences: [],
  ressourcesMat: [],
  ressourcesLog: [],
  kpis: [],
  // Tab 3
  processusAmont: [""],
  processusAval: [""],
  enjeuxStrategiques: "",
  moyensAlloues: [],
  contraintes: [""],
  risques: [],
  // Tab 4
  documents: [],
  preuves: [],
  // Tab 5
  dysfonctionnements: [],
  // Tab 6
  etapes: [],
  bpmnFile: null,
};

function makeKpi() {
  return {
    nom: "",
    unite: "",
    valeurCible: "",
    seuilAlerte: "",
    frequence: "",
    responsable: "",
  };
}
function makeRisque() {
  return {
    description: "",
    probabilite: "1",
    gravite: "1",
    detectabilite: "1",
    mesure: "",
    responsable: "",
  };
}
function makeDoc() {
  return {
    id: "",
    titre: "",
    format: "PDF",
    version: "1.0",
    revue: "",
    statut: "Brouillon",
  };
}
function makePreuve() {
  return { titre: "", type: "", date: "", responsable: "" };
}
function makeDysf() {
  return {
    titre: "",
    description: "",
    consequences: "",
    causes: "",
    gravite: "Mineur",
    ameliorations: "",
    responsable: "",
    echeance: "",
    statut: "Ouvert",
  };
}
function makeEtape(num) {
  return {
    numero: num,
    nom: "",
    acteur: "",
    description: "",
    entree: "",
    sortie: "",
    duree: "",
    document: "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
   TABS CONFIG
═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 0, label: "Informations et historique" },
  { id: 1, label: "Éléments clés" },
  { id: 2, label: "Contexte" },
  { id: 3, label: "Documentation" },
  { id: 4, label: "Dysfonctionnements" },
  { id: 5, label: "Déroulement" },
];

const REQUIRED_FIELDS = [
  "designation",
  "pilote",
  "email",
  "sousDept",
  "objectif",
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function ProcessFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm]         = useState(INIT);
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors]     = useState({});
  const [toast, setToast]       = useState(null);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);

  /* ── Load existing processus in edit mode ── */
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/processus/${id}`)
      .then((p) => {
        setForm((prev) => ({
          ...prev,
          identifiant:     p.code || prev.identifiant,
          designation:     p.nom  || "",
          typeProcessus:   TYPE_TO_FORM[p.type] || "",
          objectif:        p.objectif    || "",
          fluxEntrees:     p.entrees     ? p.entrees.split("\n").filter(Boolean) : [""],
          fluxSorties:     p.sorties     ? p.sorties.split("\n").filter(Boolean) : [""],
          ressourcesMat:   p.ressources_cles ? p.ressources_cles.split("\n").filter(Boolean).slice(0, 5) : [],
          enjeuxStrategiques: p.description || "",
          pilote:      p.pilote ? `${p.pilote.prenom} ${p.pilote.nom}` : "",
          email:       p.pilote?.email     || "",
          telephone:   p.pilote?.telephone || "",
          sousDept:    p.pilote?.departement || "",
        }));
        setDirty(false);
      })
      .catch((err) => showToast(`Chargement échoué : ${err.message}`, "error"));
  }, [id, isEdit]);

  /* ── Helpers ── */
  const set = useCallback(
    (key, value) => {
      setForm((f) => ({ ...f, [key]: value }));
      setDirty(true);
      if (errors[key])
        setErrors((e) => {
          const n = { ...e };
          delete n[key];
          return n;
        });
    },
    [errors],
  );

  const setNested = useCallback((parent, key, value) => {
    setForm((f) => ({ ...f, [parent]: { ...f[parent], [key]: value } }));
    setDirty(true);
  }, []);

  /* ── Completion ── */
  const completionPct = (() => {
    let filled = 0;
    const checks = [
      form.designation,
      form.pilote,
      form.email,
      form.sousDept,
      form.typeProcessus,
      form.objectif,
      form.fluxEntrees.some(Boolean),
      form.fluxSorties.some(Boolean),
      form.kpis.length > 0,
      form.risques.length > 0,
      form.etapes.length > 0,
    ];
    checks.forEach((c) => {
      if (c) filled++;
    });
    return Math.round((filled / checks.length) * 100);
  })();

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!form[f]?.trim()) e[f] = "Ce champ est obligatoire";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCancel = () => {
    if (dirty) {
      if (
        window.confirm(
          "Des modifications non sauvegardées seront perdues. Continuer ?",
        )
      ) {
        navigate("/processus");
      }
    } else {
      navigate("/processus");
    }
  };

  const buildPayload = (statut) => ({
    nom:             form.designation.trim(),
    code:            form.identifiant !== "PROC-008" ? form.identifiant : undefined,
    type:            FORM_TO_TYPE[form.typeProcessus] || null,
    objectif:        form.objectif     || null,
    description:     form.enjeuxStrategiques || null,
    entrees:         form.fluxEntrees.filter(Boolean).join("\n") || null,
    sorties:         form.fluxSorties.filter(Boolean).join("\n") || null,
    ressources_cles: [...form.ressourcesMat, ...form.ressourcesLog].filter(Boolean).join("\n") || null,
    statut,
  });

  const handleDraft = async () => {
    if (!form.designation.trim()) {
      showToast("La désignation est obligatoire.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload("non_demarre");
      if (isEdit) {
        await api.put(`/processus/${id}`, payload);
        showToast("Brouillon enregistré ✓");
      } else {
        const created = await api.post("/processus", payload);
        showToast("Brouillon enregistré ✓");
        navigate(`/processus/${created.id}`, { replace: true });
      }
      setDirty(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) {
      showToast("Veuillez remplir tous les champs obligatoires.", "error");
      setActiveTab(0);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload("en_cours");
      let processusId = id ? parseInt(id) : null;
      if (isEdit) {
        await api.put(`/processus/${id}`, payload);
      } else {
        const created = await api.post("/processus", payload);
        processusId = created.id;
      }

      /* Create risques that have a description (only when we have a processus ID) */
      if (processusId) {
        const risquesACreer = form.risques.filter((r) => r.description.trim());
        await Promise.allSettled(
          risquesACreer.map((r) =>
            api.post("/risques", {
              titre:            r.description.trim(),
              description:      r.description.trim(),
              probabilite:      parseInt(r.probabilite    || 1),
              gravite:          parseInt(r.gravite        || 1),
              detectabilite:    parseInt(r.detectabilite  || 1),
              plan_attenuation: r.mesure || null,
              processus_id:     processusId,
            })
          )
        );
      }

      showToast("Processus publié avec succès !");
      setDirty(false);
      setTimeout(() => navigate("/processus"), 1500);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     TAB 1 — Informations et historique
  ══════════════════════════════════════════════════════════════ */
  const Tab1 = () => (
    <div>
      <SectionHeader
        num="1"
        title="Informations Générales"
        sub="Données d'identification et de responsabilité du processus"
      />

      <div style={styles.grid2}>
        <Field label="Identifiant processus">
          <Input value={form.identifiant} onChange={() => {}} readOnly />
        </Field>

        <Field label="Type de processus">
          <Select
            value={form.typeProcessus}
            onChange={(e) => set("typeProcessus", e.target.value)}
            options={[
              { value: "Management", label: "Management" },
              { value: "Réalisation", label: "Réalisation" },
              { value: "Soutien", label: "Soutien" },
            ]}
          />
        </Field>

        <Field
          label="Désignation du processus"
          required
          error={errors.designation}
        >
          <Input
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="Ex : Gestion des soutenances PFE"
            error={errors.designation}
          />
        </Field>

        <Field label="Pilote du processus" required error={errors.pilote}>
          <Input
            value={form.pilote}
            onChange={(e) => set("pilote", e.target.value)}
            placeholder="Nom du responsable"
            error={errors.pilote}
          />
        </Field>

        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="pilote@etablissement.dz"
            error={errors.email}
          />
        </Field>

        <Field label="Téléphone">
          <Input
            type="tel"
            value={form.telephone}
            onChange={(e) => set("telephone", e.target.value)}
            placeholder="+213 XXX XXX XXX"
          />
        </Field>

        <Field label="Sous-département" required error={errors.sousDept}>
          <Input
            value={form.sousDept}
            onChange={(e) => set("sousDept", e.target.value)}
            placeholder="Ex : Laboratoire, Scolarité..."
            error={errors.sousDept}
          />
        </Field>

        <Field label="Structures concernées">
          <TagInput
            tags={form.structures}
            onChange={(v) => set("structures", v)}
            placeholder="Taper et Entrée pour ajouter..."
          />
        </Field>

        <div style={styles.gridFull}>
          <Field label="Objectif du processus" required error={errors.objectif}>
            <TextArea
              value={form.objectif}
              onChange={(e) => set("objectif", e.target.value)}
              placeholder="Décrire l'objectif principal du processus..."
              rows={4}
            />
          </Field>
        </div>
      </div>

      <div style={styles.divider} />

      <SectionHeader
        num="1b"
        title="RACI — Matrice des responsabilités"
        sub="Définir les rôles pour ce processus"
      />
      <div style={styles.raciGrid}>
        {[
          { key: "responsable", label: "Responsable (R)", icon: "🟢" },
          { key: "approbateur", label: "Approbateur (A)", icon: "🔵" },
          { key: "consulte", label: "Consulté (C)", icon: "🟡" },
          { key: "informe", label: "Informé (I)", icon: "⚪" },
        ].map(({ key, label, icon }) => (
          <Field key={key} label={`${icon} ${label}`}>
            <Input
              value={form.raci[key]}
              onChange={(e) => setNested("raci", key, e.target.value)}
              placeholder="Nom ou rôle..."
            />
          </Field>
        ))}
      </div>

      <div style={styles.divider} />

      <SectionHeader num="1c" title="Historique des révisions" />
      <div style={styles.historyPlaceholder}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Aucun historique disponible
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          L'historique sera généré automatiquement après le premier
          enregistrement du processus.
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     TAB 2 — Éléments clés
  ══════════════════════════════════════════════════════════════ */
  const Tab2 = () => (
    <div>
      <SectionHeader
        num="2"
        title="Éléments Clés du Processus"
        sub="Flux, ressources, compétences et indicateurs de performance"
      />

      <div style={styles.grid2}>
        <Field label="Période / Mois">
          <Input
            value={form.periode}
            onChange={(e) => set("periode", e.target.value)}
            placeholder="Ex : Oct → Juin (9 mois)"
          />
        </Field>
        <Field label="Objectif stratégique">
          <Input
            value={form.objectifStrategique}
            onChange={(e) => set("objectifStrategique", e.target.value)}
            placeholder="Lien avec la stratégie globale..."
          />
        </Field>
        <Field label="Clients / Bénéficiaires">
          <TextArea
            value={form.clients}
            onChange={(e) => set("clients", e.target.value)}
            placeholder="Étudiants, Direction, Entreprises partenaires..."
            rows={2}
          />
        </Field>
        <Field label="Effectifs impliqués">
          <TextArea
            value={form.effectifs}
            onChange={(e) => set("effectifs", e.target.value)}
            placeholder="Ex : 12 enseignants, 3 membres administratifs..."
            rows={2}
          />
        </Field>
      </div>

      <div style={styles.divider} />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Flux d'entrées / Sorties
        </div>
        <div style={styles.fluxBox}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              ↙ Entrées
            </div>
            <DynamicList
              items={form.fluxEntrees}
              onChange={(v) => set("fluxEntrees", v)}
              placeholder="Flux d'entrée..."
            />
          </div>
          <div style={styles.fluxArrow}>⇄</div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Sorties ↗
            </div>
            <DynamicList
              items={form.fluxSorties}
              onChange={(v) => set("fluxSorties", v)}
              placeholder="Flux de sortie..."
            />
          </div>
        </div>
      </div>

      <div style={styles.grid2}>
        <Field label="Compétences clés">
          <TagInput
            tags={form.competences}
            onChange={(v) => set("competences", v)}
            placeholder="Ajouter une compétence..."
          />
        </Field>
        <Field label="Ressources matérielles">
          <TagInput
            tags={form.ressourcesMat}
            onChange={(v) => set("ressourcesMat", v)}
            placeholder="Équipements, locaux..."
          />
        </Field>
        <Field label="Ressources logicielles" style={styles.gridFull}>
          <TagInput
            tags={form.ressourcesLog}
            onChange={(v) => set("ressourcesLog", v)}
            placeholder="Logiciels, plateformes..."
          />
        </Field>
      </div>

      <div style={styles.divider} />

      <SectionHeader
        num="2b"
        title="KPIs — Indicateurs de Performance"
        sub="Définir les mesures de suivi du processus"
      />

      {form.kpis.map((kpi, i) => (
        <div key={i} style={styles.kpiCard}>
          <div style={styles.kpiCardHeader}>
            <span style={styles.kpiCardTitle}>KPI #{i + 1}</span>
            <button
              type="button"
              style={styles.removeCard}
              onClick={() =>
                set(
                  "kpis",
                  form.kpis.filter((_, idx) => idx !== i),
                )
              }
            >
              ✕ Supprimer
            </button>
          </div>
          <div style={styles.grid3}>
            {[
              {
                key: "nom",
                label: "Nom du KPI",
                placeholder: "Ex : Taux de réussite",
              },
              {
                key: "unite",
                label: "Unité",
                placeholder: "%, jours, nombre...",
              },
              {
                key: "valeurCible",
                label: "Valeur cible",
                placeholder: "Ex : ≥ 90%",
              },
              {
                key: "seuilAlerte",
                label: "Seuil d'alerte",
                placeholder: "Ex : < 75%",
              },
              {
                key: "frequence",
                label: "Fréquence de collecte",
                placeholder: "Mensuel, Annuel...",
              },
              {
                key: "responsable",
                label: "Responsable",
                placeholder: "Nom ou rôle",
              },
            ].map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <Input
                  value={kpi[key]}
                  onChange={(e) => {
                    const updated = [...form.kpis];
                    updated[i] = { ...updated[i], [key]: e.target.value };
                    set("kpis", updated);
                  }}
                  placeholder={placeholder}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        style={styles.addBtn}
        onClick={() => set("kpis", [...form.kpis, makeKpi()])}
      >
        ＋ Ajouter un KPI
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     TAB 3 — Contexte
  ══════════════════════════════════════════════════════════════ */
  const Tab3 = () => (
    <div>
      <SectionHeader
        num="3"
        title="Contexte et Environnement"
        sub="Cartographie des processus voisins et facteurs contextuels"
      />

      <div style={{ ...styles.fluxBox, marginBottom: 24 }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.muted,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            ← Processus AMONT
          </div>
          <DynamicList
            items={form.processusAmont}
            onChange={(v) => set("processusAmont", v)}
            placeholder="Processus fournisseur..."
          />
        </div>
        <div style={styles.fluxArrow}>⇄</div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.muted,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Processus AVAL →
          </div>
          <DynamicList
            items={form.processusAval}
            onChange={(v) => set("processusAval", v)}
            placeholder="Processus client..."
          />
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.gridFull}>
          <Field label="Enjeux stratégiques">
            <TextArea
              value={form.enjeuxStrategiques}
              onChange={(e) => set("enjeuxStrategiques", e.target.value)}
              placeholder="Décrire les enjeux liés à ce processus..."
              rows={3}
            />
          </Field>
        </div>
        <Field label="Moyens alloués">
          <TagInput
            tags={form.moyensAlloues}
            onChange={(v) => set("moyensAlloues", v)}
            placeholder="Ressources, outils..."
          />
        </Field>
      </div>

      <div style={styles.divider} />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            marginBottom: 12,
          }}
        >
          ⚠ Contraintes
        </div>
        <DynamicList
          items={form.contraintes}
          onChange={(v) => set("contraintes", v)}
          placeholder="Contrainte réglementaire, temporelle..."
        />
      </div>

      <div style={styles.divider} />

      <SectionHeader
        num="3b"
        title="Risques identifiés"
        sub="Probabilité × Gravité = Criticité calculée automatiquement"
      />

      {form.risques.map((r, i) => {
        const P = parseInt(r.probabilite || 1);
        const G = parseInt(r.gravite || 1);
        const D = parseInt(r.detectabilite || 1);
        const rpn = P * G * D;
        /* ISO AMDEC criticality thresholds: RPN 1-20 faible, 21-50 modéré, 51-80 élevé, 81+ critique */
        const critColor = rpn >= 81 ? "#9b1c1c" : rpn >= 51 ? "#e53935" : rpn >= 21 ? C.warn : "#4caf50";
        const critLabel = rpn >= 81 ? "Critique" : rpn >= 51 ? "Élevé" : rpn >= 21 ? "Modéré" : "Faible";
        return (
          <div key={i} style={styles.riskCard}>
            <div style={styles.kpiCardHeader}>
              <span style={styles.kpiCardTitle}>
                Risque #{i + 1}{" "}
                <span
                  style={{
                    ...styles.critBadge,
                    background: critColor + "22",
                    color: critColor,
                  }}
                >
                  RPN {rpn} — {critLabel}
                </span>
              </span>
              <button
                type="button"
                style={styles.removeCard}
                onClick={() =>
                  set(
                    "risques",
                    form.risques.filter((_, idx) => idx !== i),
                  )
                }
              >
                ✕ Supprimer
              </button>
            </div>
            <div style={styles.grid2}>
              <div style={styles.gridFull}>
                <Field label="Description du risque">
                  <Input
                    value={r.description}
                    onChange={(e) => {
                      const u = [...form.risques];
                      u[i] = { ...u[i], description: e.target.value };
                      set("risques", u);
                    }}
                    placeholder="Décrire le risque identifié..."
                  />
                </Field>
              </div>
              <Field label="Probabilité (1–5)">
                <Select
                  value={r.probabilite}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], probabilite: e.target.value };
                    set("risques", u);
                  }}
                  options={[
                    { value: "1", label: "1 – Très faible" },
                    { value: "2", label: "2 – Faible" },
                    { value: "3", label: "3 – Moyen" },
                    { value: "4", label: "4 – Élevée" },
                    { value: "5", label: "5 – Très élevée" },
                  ]}
                />
              </Field>
              <Field label="Gravité (1–5)">
                <Select
                  value={r.gravite}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], gravite: e.target.value };
                    set("risques", u);
                  }}
                  options={[
                    { value: "1", label: "1 – Négligeable" },
                    { value: "2", label: "2 – Mineure" },
                    { value: "3", label: "3 – Modérée" },
                    { value: "4", label: "4 – Sévère" },
                    { value: "5", label: "5 – Catastrophique" },
                  ]}
                />
              </Field>
              <Field label="Détectabilité (1–5)">
                <Select
                  value={r.detectabilite}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], detectabilite: e.target.value };
                    set("risques", u);
                  }}
                  options={[
                    { value: "1", label: "1 – Détection certaine" },
                    { value: "2", label: "2 – Probable" },
                    { value: "3", label: "3 – Possible" },
                    { value: "4", label: "4 – Peu probable" },
                    { value: "5", label: "5 – Indétectable" },
                  ]}
                />
              </Field>
              <Field label="Mesure d'atténuation">
                <Input
                  value={r.mesure}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], mesure: e.target.value };
                    set("risques", u);
                  }}
                  placeholder="Action préventive ou corrective..."
                />
              </Field>
              <Field label="Responsable">
                <Input
                  value={r.responsable}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], responsable: e.target.value };
                    set("risques", u);
                  }}
                  placeholder="Nom ou rôle..."
                />
              </Field>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        style={styles.addBtn}
        onClick={() => set("risques", [...form.risques, makeRisque()])}
      >
        ＋ Ajouter un risque
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     TAB 4 — Documentation
  ══════════════════════════════════════════════════════════════ */
  const Tab4 = () => (
    <div>
      <SectionHeader
        num="4"
        title="Informations Documentées"
        sub="Documents de référence et preuves de réalisation"
      />

      <div
        style={{
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
        }}
      >
        Documents de référence
      </div>
      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {[
                "ID",
                "Titre",
                "Format",
                "Version",
                "Revue & Approbation",
                "Statut",
                "",
              ].map((h) => (
                <th key={h} style={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.documents.map((doc, i) => (
              <tr key={i}>
                {[
                  { key: "id", placeholder: "DOC-01" },
                  { key: "titre", placeholder: "Titre du document" },
                  { key: "version", placeholder: "1.0" },
                  { key: "revue", placeholder: "Approuvé – Direction" },
                ].map(({ key, placeholder }) => (
                  <td key={key} style={styles.td}>
                    <input
                      value={doc[key]}
                      onChange={(e) => {
                        const u = [...form.documents];
                        u[i] = { ...u[i], [key]: e.target.value };
                        set("documents", u);
                      }}
                      placeholder={placeholder}
                      style={{
                        ...styles.dynInput,
                        width: "100%",
                        minWidth: 80,
                      }}
                    />
                  </td>
                ))}
                <td style={styles.td}>
                  <select
                    value={doc.format}
                    onChange={(e) => {
                      const u = [...form.documents];
                      u[i] = { ...u[i], format: e.target.value };
                      set("documents", u);
                    }}
                    style={{
                      ...styles.select,
                      padding: "4px 8px",
                      fontSize: 12,
                    }}
                  >
                    {["PDF", "Word", "Excel", "Image"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td style={styles.td}>
                  <select
                    value={doc.statut}
                    onChange={(e) => {
                      const u = [...form.documents];
                      u[i] = { ...u[i], statut: e.target.value };
                      set("documents", u);
                    }}
                    style={{
                      ...styles.select,
                      padding: "4px 8px",
                      fontSize: 12,
                    }}
                  >
                    {["Brouillon", "En révision", "Approuvé", "Archivé"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </td>
                <td style={styles.td}>
                  <button
                    type="button"
                    style={styles.dynRemove}
                    onClick={() =>
                      set(
                        "documents",
                        form.documents.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        style={styles.addBtn}
        onClick={() => set("documents", [...form.documents, makeDoc()])}
      >
        ＋ Ajouter un document
      </button>

      <div style={styles.divider} />

      <div
        style={{
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
        }}
      >
        Enregistrements / Preuves de réalisation
      </div>

      {form.preuves.map((p, i) => (
        <div
          key={i}
          style={{
            ...styles.dynItem,
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 10,
            padding: "12px 14px",
          }}
        >
          {[
            { key: "titre", placeholder: "Titre de la preuve", flex: 2 },
            { key: "type", placeholder: "Type (PV, Rapport...)", flex: 1 },
            { key: "date", placeholder: "Date", flex: 1 },
            { key: "responsable", placeholder: "Responsable", flex: 1 },
          ].map(({ key, placeholder, flex }) => (
            <input
              key={key}
              value={p[key]}
              onChange={(e) => {
                const u = [...form.preuves];
                u[i] = { ...u[i], [key]: e.target.value };
                set("preuves", u);
              }}
              placeholder={placeholder}
              style={{
                ...styles.dynInput,
                flex,
                minWidth: 120,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "6px 10px",
                background: C.white,
              }}
            />
          ))}
          <button
            type="button"
            style={styles.dynRemove}
            onClick={() =>
              set(
                "preuves",
                form.preuves.filter((_, idx) => idx !== i),
              )
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        style={styles.addBtn}
        onClick={() => set("preuves", [...form.preuves, makePreuve()])}
      >
        ＋ Ajouter une preuve
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     TAB 5 — Dysfonctionnements
  ══════════════════════════════════════════════════════════════ */
  const Tab5 = () => (
    <div>
      <SectionHeader
        num="5"
        title="Dysfonctionnements Majeurs Connus"
        sub="Recenser les problèmes récurrents et proposer des améliorations"
      />

      {form.dysfonctionnements.map((d, i) => (
        <div key={i} style={styles.dysfCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
              Dysfonctionnement #{i + 1}
            </div>
            <button
              type="button"
              style={styles.removeCard}
              onClick={() =>
                set(
                  "dysfonctionnements",
                  form.dysfonctionnements.filter((_, idx) => idx !== i),
                )
              }
            >
              ✕
            </button>
          </div>
          <div style={styles.grid2}>
            <div style={styles.gridFull}>
              <Field label="Titre">
                <Input
                  value={d.titre}
                  onChange={(e) => {
                    const u = [...form.dysfonctionnements];
                    u[i] = { ...u[i], titre: e.target.value };
                    set("dysfonctionnements", u);
                  }}
                  placeholder="Titre court du dysfonctionnement..."
                />
              </Field>
            </div>
            <Field label="Description">
              <TextArea
                value={d.description}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], description: e.target.value };
                  set("dysfonctionnements", u);
                }}
                placeholder="Décrire le dysfonctionnement observé..."
                rows={3}
              />
            </Field>
            <Field label="Conséquences">
              <TextArea
                value={d.consequences}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], consequences: e.target.value };
                  set("dysfonctionnements", u);
                }}
                placeholder="Impacts observés..."
                rows={3}
              />
            </Field>
            <Field label="Causes identifiées">
              <TextArea
                value={d.causes}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], causes: e.target.value };
                  set("dysfonctionnements", u);
                }}
                placeholder="Causes racines..."
                rows={3}
              />
            </Field>
            <Field label="Améliorations proposées">
              <TextArea
                value={d.ameliorations}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], ameliorations: e.target.value };
                  set("dysfonctionnements", u);
                }}
                placeholder="Actions d'amélioration recommandées..."
                rows={3}
              />
            </Field>
            <Field label="Gravité">
              <Select
                value={d.gravite}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], gravite: e.target.value };
                  set("dysfonctionnements", u);
                }}
                options={[
                  { value: "Mineur", label: "Mineur" },
                  { value: "Majeur", label: "Majeur" },
                  { value: "Critique", label: "Critique" },
                ]}
              />
            </Field>
            <Field label="Responsable">
              <Input
                value={d.responsable}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], responsable: e.target.value };
                  set("dysfonctionnements", u);
                }}
                placeholder="Responsable du suivi..."
              />
            </Field>
            <Field label="Échéance">
              <Input
                type="date"
                value={d.echeance}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], echeance: e.target.value };
                  set("dysfonctionnements", u);
                }}
              />
            </Field>
            <Field label="Statut">
              <Select
                value={d.statut}
                onChange={(e) => {
                  const u = [...form.dysfonctionnements];
                  u[i] = { ...u[i], statut: e.target.value };
                  set("dysfonctionnements", u);
                }}
                options={[
                  { value: "Ouvert", label: "Ouvert" },
                  { value: "En cours", label: "En cours" },
                  { value: "Résolu", label: "Résolu" },
                  { value: "Clôturé", label: "Clôturé" },
                ]}
              />
            </Field>
            <div style={styles.gridFull}>
              <button
                type="button"
                style={{
                  ...styles.addBtn,
                  borderStyle: "solid",
                  borderColor: C.primary,
                  background: "rgba(45,96,79,0.06)",
                }}
                onClick={() =>
                  showToast(
                    `Action corrective générée pour le dysfonctionnement #${i + 1}`,
                  )
                }
              >
                ⚙ Générer action corrective
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        style={styles.addBtn}
        onClick={() =>
          set("dysfonctionnements", [...form.dysfonctionnements, makeDysf()])
        }
      >
        ＋ Ajouter un dysfonctionnement
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     TAB 6 — Déroulement
  ══════════════════════════════════════════════════════════════ */
  const Tab6 = () => (
    <div>
      <SectionHeader
        num="6"
        title="Déroulement et Modélisation"
        sub="Définir les étapes chronologiques du processus"
      />

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 12,
        }}
      >
        Tâches chronologiques
      </div>

      {form.etapes.map((e, i) => (
        <div key={i} style={styles.etapeCard}>
          <div style={styles.etapeNum}>{e.numero}</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
                Étape {e.numero}
              </span>
              <button
                type="button"
                style={styles.removeCard}
                onClick={() =>
                  set(
                    "etapes",
                    form.etapes.filter((_, idx) => idx !== i),
                  )
                }
              >
                ✕
              </button>
            </div>
            <div style={styles.grid3}>
              {[
                {
                  key: "nom",
                  label: "Nom de l'étape",
                  placeholder: "Ex : Lancement appel à sujets...",
                },
                {
                  key: "acteur",
                  label: "Acteur responsable",
                  placeholder: "Enseignant, Admin...",
                },
                {
                  key: "duree",
                  label: "Durée estimée",
                  placeholder: "Ex : 2 semaines",
                },
                {
                  key: "entree",
                  label: "Entrée",
                  placeholder: "Données / documents d'entrée...",
                },
                {
                  key: "sortie",
                  label: "Sortie",
                  placeholder: "Résultats produits...",
                },
                {
                  key: "document",
                  label: "Document associé",
                  placeholder: "Référence documentaire...",
                },
              ].map(({ key, label, placeholder }) => (
                <Field key={key} label={label}>
                  <Input
                    value={e[key]}
                    onChange={(ev) => {
                      const u = [...form.etapes];
                      u[i] = { ...u[i], [key]: ev.target.value };
                      set("etapes", u);
                    }}
                    placeholder={placeholder}
                  />
                </Field>
              ))}
              <div style={{ ...styles.gridFull }}>
                <Field label="Description">
                  <TextArea
                    value={e.description}
                    onChange={(ev) => {
                      const u = [...form.etapes];
                      u[i] = { ...u[i], description: ev.target.value };
                      set("etapes", u);
                    }}
                    placeholder="Détailler l'activité réalisée dans cette étape..."
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        style={styles.addBtn}
        onClick={() =>
          set("etapes", [...form.etapes, makeEtape(form.etapes.length + 1)])
        }
      >
        ＋ Ajouter une étape
      </button>

      <div style={styles.divider} />

      <SectionHeader
        num="6b"
        title="Cartographie BPMN"
        sub="Importer ou dessiner le diagramme de flux du processus"
      />

      <div style={styles.bpmnBox}>
        <div style={{ color: C.muted, fontSize: 38 }}>⬡</div>
        <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
          Aucune cartographie BPMN importée
        </div>
        <div style={styles.bpmnBtnRow}>
          <button
            type="button"
            style={styles.bpmnBtn}
            onClick={() =>
              showToast("Fonctionnalité d'import BPMN — à intégrer")
            }
          >
            📂 Importer BPMN
          </button>
          <button
            type="button"
            style={styles.bpmnBtn}
            onClick={() => showToast("Éditeur BPMN — à intégrer")}
          >
            ✏️ Dessiner BPMN
          </button>
          <button
            type="button"
            style={{
              ...styles.bpmnBtn,
              background: C.lightBg,
              borderColor: C.accent,
              color: C.primary,
            }}
            onClick={() => showToast("Cartographie validée ✓")}
          >
            ✅ Valider cartographie
          </button>
        </div>
      </div>
    </div>
  );

  const tabContents = [Tab1(), Tab2(), Tab3(), Tab4(), Tab5(), Tab6()];

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #eaf5eb; }
        ::-webkit-scrollbar-thumb { background: #77D58F; border-radius: 99px; }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={styles.breadcrumb}>
            <span
              style={{ cursor: "pointer", color: C.muted }}
              onClick={() => navigate("/processus")}
            >
              Fiches Processus
            </span>
            <span style={{ color: C.border }}>›</span>
            <span style={styles.breadcrumbActive}>
              {isEdit ? "Modifier le processus" : "Nouveau processus"}
            </span>
          </div>
          <div style={styles.topbarRight}>
            <button style={styles.topbarBtn} title="Notifications">
              🔔
            </button>
            <span
              style={{
                fontSize: 13,
                color: C.muted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🇫🇷 Français
            </span>
            <div style={styles.avatar}>RF</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={styles.content}>
          {/* ── Header card ── */}
          <div style={styles.headerCard}>
            <div style={styles.headerCardBadges}>
              <span style={styles.badge}>Code: {form.identifiant}</span>
              <span style={{ ...styles.badge, ...styles.badgeGreen }}>
                {form.typeProcessus || "Type à définir"}
              </span>
              <span style={styles.badge}>Version: 1.0</span>
              <span style={styles.badge}>
                Date: {new Date().toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div style={styles.headerCardBody}>
              <div style={styles.headerCardLeft}>
                <div style={styles.headerCardTitle}>
                  {form.designation || "Nom du processus"}
                </div>
                <div style={styles.headerCardDesc}>
                  {form.objectif ||
                    "Description du processus — remplissez l'onglet Informations pour voir l'aperçu ici."}
                </div>
              </div>
              <div style={styles.headerCardRight}>
                <div style={styles.pilotBox}>
                  <div style={styles.pilotLabel}>Pilote</div>
                  <div style={styles.pilotName}>{form.pilote || "—"}</div>
                  <div style={styles.pilotEmail}>{form.email || ""}</div>
                </div>
                <div style={styles.kpiRow}>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{form.kpis.length}</span>
                    <span style={styles.kpiLbl}>KPIs</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{form.etapes.length}</span>
                    <span style={styles.kpiLbl}>Tâches</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{form.risques.length}</span>
                    <span style={styles.kpiLbl}>Risques</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Completion bar ── */}
          <div style={styles.completionCard}>
            <span style={styles.completionLabel}>Complétude de la fiche</span>
            <div style={styles.completionBarWrap}>
              <div
                style={{
                  height: "100%",
                  width: `${completionPct}%`,
                  background:
                    completionPct >= 80
                      ? C.accent
                      : completionPct >= 50
                        ? C.warn
                        : C.danger,
                  borderRadius: 99,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: C.primary,
                minWidth: 42,
              }}
            >
              {completionPct}%
            </span>
            <span style={styles.statusBadge}>● Brouillon</span>
          </div>

          {/* ── Tabs ── */}
          <div style={styles.tabsWrap}>
            <div style={styles.tabsHeader}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(activeTab === t.id ? styles.tabActive : {}),
                  }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={styles.tabContent}>{tabContents[activeTab]}</div>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div style={styles.actionBar}>
          <button type="button" style={styles.btnCancel} onClick={handleCancel} disabled={saving}>
            ← Annuler
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={{ ...styles.btnDraft, opacity: saving ? 0.6 : 1 }} onClick={handleDraft} disabled={saving}>
              {saving ? "…" : "💾 Enregistrer brouillon"}
            </button>
            <button
              type="button"
              style={styles.btnPreview}
              onClick={() => showToast("Mode prévisualisation — à implémenter")}
              disabled={saving}
            >
              👁 Prévisualiser
            </button>
            <button
              type="button"
              style={{ ...styles.btnPublish, opacity: saving ? 0.6 : 1 }}
              onClick={handlePublish}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "🚀 Publier le processus"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? C.danger : C.primary,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
