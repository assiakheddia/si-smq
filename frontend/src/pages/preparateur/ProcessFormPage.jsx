import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NotificationsPanel, {
  pushNotification,
  getUnreadCount,
} from "../../components/NotificationsPanel.jsx";
import { api, getCurrentUser } from "../../lib/api.js";

/* ── Mapping types ↔ libellés du formulaire (cf. backend TypeProcessus) ── */
const TYPE_FORM_TO_BACKEND = {
  Management: "strategique",
  "Réalisation": "operationnel",
  Soutien: "support",
};
const TYPE_BACKEND_TO_FORM = {
  strategique: "Management",
  operationnel: "Réalisation",
  support: "Soutien",
};

/* ── Backend ProcessusResponse → champs du formulaire local ── */
function denormalizeProcessus(p) {
  return {
    identifiant: p.code || "",
    designation: p.nom || "",
    pilote: p.pilote ? `${p.pilote.prenom} ${p.pilote.nom}`.trim() : "",
    email: p.pilote?.email || "",
    telephone: p.pilote?.telephone || "",
    sousDept: p.pilote?.departement || "",
    typeProcessus: TYPE_BACKEND_TO_FORM[p.type] || "",
    objectif: p.objectif || "",
    fluxEntrees: p.entrees ? p.entrees.split("; ") : [""],
    fluxSorties: p.sorties ? p.sorties.split("; ") : [""],
    ressourcesMat: p.ressources_cles ? [p.ressources_cles] : [],
    ...(p.raci_roles && p.raci_activities
      ? { raci: { roles: p.raci_roles, activities: p.raci_activities, cells: p.raci_cells || {} } }
      : {}),
  };
}

/* ── Formulaire local → payload backend (ProcessusCreate / ProcessusUpdate) ── */
function buildProcessusPayload(form, { isEdit }) {
  const entrees = form.fluxEntrees.filter(Boolean).join("; ");
  const sorties = form.fluxSorties.filter(Boolean).join("; ");
  const ressources = [...form.ressourcesMat, ...form.ressourcesLog]
    .filter(Boolean)
    .join(", ");

  const payload = {
    nom: form.designation.trim(),
    type: TYPE_FORM_TO_BACKEND[form.typeProcessus] || null,
    objectif: form.objectif || null,
    entrees: entrees || null,
    sorties: sorties || null,
    ressources_cles: ressources || null,
    pilote_nom: form.pilote ? form.pilote.trim() : null,
    raci_roles: form.raci.roles,
    raci_activities: form.raci.activities,
    raci_cells: form.raci.cells,
  };
  // Le code affiché côté création est un placeholder local — laisser le
  // backend en générer un réel. En édition, on renvoie le code existant.
  if (isEdit) payload.code = form.identifiant;
  return payload;
}

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
    height: 62,
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
    gap: 12,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: C.muted,
  },
  breadcrumbActive: { color: C.text, fontWeight: 600 },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  iconBtn: {
    height: 34,
    minWidth: 34,
    borderRadius: 10,
    border: "1px solid #e8eaed",
    background: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "0 10px",
    position: "relative",
    transition: "all 0.15s",
  },
  nDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    background: "#ef4444",
    borderRadius: "50%",
    border: "2px solid white",
  },
  uChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f3f5f7",
    border: "1px solid #e8eaed",
    borderRadius: 11,
    padding: "4px 10px 4px 5px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  uAv: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Outfit',sans-serif",
    fontWeight: 900,
    fontSize: 10,
    color: "#152b21",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
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
  statusBadgePublished: {
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 700,
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #22c55e",
    whiteSpace: "nowrap",
  },
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
  tabLocked: { color: "#9ca3af", cursor: "pointer" },
  tabContent: { padding: "28px 28px 32px" },
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
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px 28px",
  },
  gridFull: { gridColumn: "1 / -1" },
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
  inputWarning: { border: `1.5px solid ${C.warn}` },
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
  textareaWarning: { border: `1.5px solid ${C.warn}` },
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
  warningMsg: { fontSize: 11, color: C.warn, marginTop: 2 },
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
  divider: { height: 1, background: C.border, margin: "24px 0" },
  historyPlaceholder: {
    background: C.lightBg,
    borderRadius: 12,
    padding: "24px",
    border: `1.5px dashed ${C.border}`,
    textAlign: "center",
    color: C.muted,
    fontSize: 13,
  },
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
  dysfCard: {
    background: C.lightBg,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    padding: "18px 20px",
    marginBottom: 14,
  },
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
  },
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
  raciTableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
  },
  raciTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 500,
  },
  raciTh: {
    padding: "10px 14px",
    background: C.primary,
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
    border: `1px solid ${C.dark}`,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  raciThFirst: {
    padding: "10px 14px",
    background: C.dark,
    color: "#fff",
    fontWeight: 700,
    textAlign: "left",
    border: `1px solid ${C.dark}`,
    fontSize: 12,
    minWidth: 160,
  },
  raciCell: {
    padding: "6px 8px",
    border: `1px solid ${C.border}`,
    textAlign: "center",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
    transition: "all 0.15s",
    userSelect: "none",
    minWidth: 60,
  },
  raciActivityCell: {
    padding: "6px 10px",
    border: `1px solid ${C.border}`,
    background: C.lightBg,
    minWidth: 160,
  },
  raciInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 12,
    fontWeight: 600,
    color: C.text,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: "100%",
    minWidth: 80,
  },
  raciRoleInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    width: "100%",
    minWidth: 60,
    textAlign: "center",
  },
  raciRemoveBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    cursor: "pointer",
    fontSize: 10,
    padding: "1px 5px",
    marginLeft: 4,
    lineHeight: 1.4,
  },
  raciAddBtn: {
    padding: "6px 14px",
    borderRadius: 8,
    border: `1.5px dashed ${C.accent}`,
    background: "rgba(119,213,143,0.07)",
    color: C.primary,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  lockScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    textAlign: "center",
    gap: 16,
  },
  diagOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(30,61,47,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9000,
    backdropFilter: "blur(6px)",
  },
  diagBox: {
    background: "#fff",
    borderRadius: 24,
    padding: "48px 40px",
    maxWidth: 500,
    width: "90%",
    textAlign: "center",
    boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
  },
  auditOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9000,
    backdropFilter: "blur(3px)",
  },
  auditBox: {
    background: "#fff",
    borderRadius: 20,
    padding: "32px",
    maxWidth: 480,
    width: "90%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  fieldEditToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 12px",
    borderRadius: 20,
    border: `1px solid ${C.border}`,
    background: "#fff",
    color: C.muted,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  fieldHideBtn: {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: "1px 7px",
    cursor: "pointer",
    fontSize: 10,
    color: C.muted,
    marginLeft: 6,
    lineHeight: 1.6,
  },
  diagBanner: {
    background: "#fffbeb",
    border: "1px solid #f59e0b",
    borderRadius: 12,
    padding: "14px 18px",
    marginBottom: 20,
    fontSize: 13,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  auditSentBanner: {
    background: "#f0fdf4",
    border: "1px solid #22c55e",
    borderRadius: 12,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
    fontWeight: 600,
    color: "#166534",
  },
};

/* ═══════════════════════════════════════════════════════════════════
   VALIDATION UTILITIES
═══════════════════════════════════════════════════════════════════ */

// French common words dictionary for spell check
const FRENCH_WORDS = new Set([
  "processus",
  "qualité",
  "management",
  "soutien",
  "réalisation",
  "planification",
  "mise",
  "œuvre",
  "contrôle",
  "revue",
  "responsable",
  "approbateur",
  "consultant",
  "informé",
  "objectif",
  "stratégique",
  "performance",
  "indicateur",
  "risque",
  "critique",
  "majeur",
  "mineur",
  "documentation",
  "référence",
  "version",
  "approbation",
  "dysfonctionnement",
  "amélioration",
  "corrective",
  "déroulement",
  "modélisation",
  "cartographie",
  "direction",
  "département",
  "service",
  "équipe",
  "formation",
  "compétence",
  "ressource",
  "matériel",
  "logiciel",
  "plateforme",
  "messagerie",
  "calendrier",
  "délai",
  "échéance",
  "période",
  "client",
  "bénéficiaire",
  "partenaire",
  "audit",
  "conformité",
  "norme",
  "exigence",
  "procédure",
  "mode",
  "opératoire",
  "enregistrement",
  "traçabilité",
  "validation",
  "attribution",
  "affectation",
  "suivi",
  "évaluation",
  "soutenance",
  "jury",
  "encadrement",
  "étudiant",
  "enseignant",
  "administratif",
  "technique",
  "pédagogique",
  "budget",
  "coût",
  "estimation",
  "annuel",
  "règlement",
  "intérieur",
  "réglementation",
  "contrainte",
  "solution",
  "alternative",
  "mesure",
  "atténuation",
  "préventive",
  "action",
  "corrective",
  "préventive",
  "amélioration",
  "indicateur",
  "performance",
  "efficacité",
  "suivi",
  "évaluation",
  "contrôle",
  "maîtrise",
  "organisation",
  "gestion",
  "pilotage",
  "programmation",
  "ordonnancement",
  "communication",
  "coordination",
  "collaboration",
  "document",
  "preuve",
  "enregistrement",
  "archive",
  "système",
  "qualité",
  "environnement",
  "sécurité",
  "hygiène",
  "travail",
  "procédure",
  "instruction",
  "tâche",
  "activité",
  "étape",
  "phase",
  "cycle",
  "livrable",
  "produit",
  "service",
  "réclamation",
  "satisfaction",
  "indicateur",
  "tableau",
  "bord",
  "dashboard",
  "rapport",
  "analyse",
  "statistique",
  "tendance",
  "alerte",
  "notification",
  "recommandation",
  "décision",
  "stratégie",
  "vision",
  "mission",
  "valeur",
  "culture",
  "engagement",
  "leadership",
  "participation",
  "implication",
  "responsabilité",
  "autorité",
  "délégation",
  "autonomie",
  "initiative",
  "proactif",
  "réactif",
  "précis",
  "exact",
  "valide",
  "fiable",
  "robuste",
  "flexible",
  "adaptable",
  "évolutif",
  "maintenance",
  "amélioration",
  "continue",
  "pérenne",
  "durable",
  "efficace",
  "efficient",
  "performant",
  "rentable",
  "optimisé",
  "simplifié",
  "standardisé",
  "harmonisé",
  "intégré",
  "coordonné",
  "synchronisé",
  "automatisé",
  "digitalisé",
  "modernisé",
  "révisé",
  "actualisé",
  "pertinent",
  "cohérent",
  "homogène",
  "transparent",
  "auditable",
  "traçable",
  "consultable",
  "accessible",
  "disponible",
  "utilisable",
  "compréhensible",
  "clair",
  "précis",
  "complet",
  "détaillé",
  "exhaustif",
  "synthétique",
  "visuel",
  "interactif",
  "ergonomique",
  "intuitif",
  "exemple",
  "nom",
  "prénom",
  "date",
  "heure",
  "minute",
  "seconde",
  "semaine",
  "mois",
  "année",
  "jour",
  "nuit",
  "matin",
  "après-midi",
  "soir",
  "travaille",
  "fermé",
  "ouvert",
  "affaire",
  "projet",
  "programme",
  "politique",
  "stratégie",
  "procédure",
  "protocole",
  "standard",
  "certification",
  "accréditation",
  "qualification",
  "habilitation",
  "formation",
  "expérience",
  "compétence",
  "savoir",
  "savoir-faire",
  "savoir-être",
  "attitude",
  "comportement",
  "éthique",
  "déontologie",
  "opportunité",
  "opportunités",
  "bénéfice",
  "bénéfices",
  "impact",
]);

function isFrenchWord(word) {
  if (!word || word.length < 2) return true;
  const normalized = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^[\d\s\-\.,;:!?()"'\/]+$/.test(normalized)) return true;
  return FRENCH_WORDS.has(normalized.toLowerCase());
}

function isValidName(text) {
  if (!text) return true;
  return /^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(text);
}

function validateFrenchSpelling(text) {
  if (!text || text.trim().length < 2) return { isValid: true, warnings: [] };
  const words = text.split(/[\s,;:.!?()"']+/).filter((w) => w.length > 0);
  const warnings = [];
  for (const word of words) {
    if (word.includes("@") || word.includes("http") || /^\d+$/.test(word))
      continue;
    if (!isFrenchWord(word)) {
      warnings.push(word);
    }
  }
  return { isValid: warnings.length === 0, warnings };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  if (!phone) return true;
  return /^(\+213|0)[\d\s\-]{9,12}$/.test(phone.replace(/\s/g, ""));
}

function isNotEmpty(text) {
  return text && text.trim().length > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   FIELD CONTEXT
═══════════════════════════════════════════════════════════════════ */
const FieldCtx = createContext({
  hidden: {},
  editMode: false,
  toggle: () => {},
});

/* ═══════════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
═══════════════════════════════════════════════════════════════════ */
function Field({ label, required, error, warning, children, fkey }) {
  const { hidden, editMode, toggle } = useContext(FieldCtx);
  const isHidden = Boolean(fkey && hidden[fkey]);
  if (isHidden && !editMode) return null;
  return (
    <div style={{ ...styles.fieldWrap, ...(isHidden ? { opacity: 0.4 } : {}) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <label style={styles.label}>
          {label}
          {required && (
            <span style={{ ...styles.labelRequired, marginLeft: 3 }}>*</span>
          )}
        </label>
        {editMode && !required && fkey && (
          <button
            type="button"
            onClick={() => toggle(fkey)}
            style={styles.fieldHideBtn}
          >
            {isHidden ? "👁 afficher" : "✕ masquer"}
          </button>
        )}
      </div>
      {!isHidden && children}
      {!isHidden && error && <span style={styles.errorMsg}>⚠ {error}</span>}
      {!isHidden && warning && !error && (
        <span style={styles.warningMsg}>⚠ {warning}</span>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  error,
  warning,
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
        ...(warning && !error ? styles.inputWarning : {}),
        ...(readOnly ? { opacity: 0.65, cursor: "default" } : {}),
      }}
      onFocus={(e) => {
        if (!readOnly) e.target.style.borderColor = C.primary;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error
          ? C.danger
          : warning
            ? C.warn
            : C.border;
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, error, warning, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...styles.textarea,
        ...(error ? styles.inputError : {}),
        ...(warning && !error ? styles.textareaWarning : {}),
      }}
      onFocus={(e) => {
        e.target.style.borderColor = C.primary;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error
          ? C.danger
          : warning
            ? C.warn
            : C.border;
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
   RACI MATRIX COMPONENT
═══════════════════════════════════════════════════════════════════ */
const RACI_CYCLE = ["R", "A", "C", "I", ""];
const RACI_STYLE = {
  R: { background: "#dcfce7", color: "#166534", borderColor: "#86efac" },
  A: { background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" },
  C: { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  I: { background: "#f3f4f6", color: "#374151", borderColor: "#d1d5db" },
  "": { background: "transparent", color: "#d1d5db", borderColor: C.border },
};

function RaciMatrix({ raci, onChange }) {
  const cycleCell = (ai, ri) => {
    const key = `${ai}-${ri}`;
    const cur = raci.cells[key] || "";
    const next = RACI_CYCLE[(RACI_CYCLE.indexOf(cur) + 1) % RACI_CYCLE.length];
    onChange({ ...raci, cells: { ...raci.cells, [key]: next } });
  };

  const updateRole = (i, v) => {
    const roles = [...raci.roles];
    roles[i] = v;
    onChange({ ...raci, roles });
  };

  const updateActivity = (i, v) => {
    const activities = [...raci.activities];
    activities[i] = v;
    onChange({ ...raci, activities });
  };

  const addRole = () =>
    onChange({ ...raci, roles: [...raci.roles, "Nouveau rôle"] });
  const addActivity = () =>
    onChange({
      ...raci,
      activities: [...raci.activities, "Nouvelle activité"],
    });

  const removeRole = (ri) => {
    const roles = raci.roles.filter((_, i) => i !== ri);
    const cells = {};
    Object.entries(raci.cells).forEach(([key, val]) => {
      const [ai, ci] = key.split("-").map(Number);
      if (ci === ri) return;
      cells[`${ai}-${ci > ri ? ci - 1 : ci}`] = val;
    });
    onChange({ ...raci, roles, cells });
  };

  const removeActivity = (ai) => {
    const activities = raci.activities.filter((_, i) => i !== ai);
    const cells = {};
    Object.entries(raci.cells).forEach(([key, val]) => {
      const [a, ri] = key.split("-").map(Number);
      if (a === ai) return;
      cells[`${a > ai ? a - 1 : a}-${ri}`] = val;
    });
    onChange({ ...raci, activities, cells });
  };

  return (
    <div>
      <div style={styles.raciTableWrap}>
        <table style={styles.raciTable}>
          <thead>
            <tr>
              <th style={styles.raciThFirst}>Activité / Rôle</th>
              {raci.roles.map((role, ri) => (
                <th key={ri} style={styles.raciTh}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <input
                      value={role}
                      onChange={(e) => updateRole(ri, e.target.value)}
                      style={styles.raciRoleInput}
                    />
                    <button
                      onClick={() => removeRole(ri)}
                      style={styles.raciRemoveBtn}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th
                style={{
                  ...styles.raciTh,
                  background: "rgba(45,96,79,0.5)",
                  cursor: "pointer",
                }}
                onClick={addRole}
              >
                + Rôle
              </th>
            </tr>
          </thead>
          <tbody>
            {raci.activities.map((activity, ai) => (
              <tr key={ai}>
                <td style={styles.raciActivityCell}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <input
                      value={activity}
                      onChange={(e) => updateActivity(ai, e.target.value)}
                      style={styles.raciInput}
                    />
                    <button
                      onClick={() => removeActivity(ai)}
                      style={{
                        ...styles.dynRemove,
                        fontSize: 12,
                        color: C.muted,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </td>
                {raci.roles.map((_, ri) => {
                  const val = raci.cells[`${ai}-${ri}`] || "";
                  const s = RACI_STYLE[val] || RACI_STYLE[""];
                  return (
                    <td
                      key={ri}
                      style={{
                        ...styles.raciCell,
                        background: s.background,
                        color: s.color,
                        border: `1px solid ${s.borderColor}`,
                      }}
                      onClick={() => cycleCell(ai, ri)}
                      title="Cliquer pour changer: R → A → C → I → vide"
                    >
                      {val || "·"}
                    </td>
                  );
                })}
                <td
                  style={{
                    ...styles.raciActivityCell,
                    background: "transparent",
                  }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        style={{ ...styles.raciAddBtn, marginTop: 10 }}
        onClick={addActivity}
      >
        ＋ Ajouter une activité
      </button>

      <div
        style={{
          marginTop: 14,
          padding: "12px 16px",
          background: C.lightBg,
          borderRadius: 10,
          fontSize: 12,
          color: C.muted,
        }}
      >
        <strong>Légende :</strong>&nbsp;
        {[
          ["R", "Responsable – exécute"],
          ["A", "Approbateur – valide"],
          ["C", "Consulté – donne avis"],
          ["I", "Informé – reçoit info"],
        ].map(([k, v]) => (
          <span key={k} style={{ marginRight: 14 }}>
            <span
              style={{
                ...RACI_STYLE[k],
                padding: "1px 7px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 11,
                border: `1px solid ${RACI_STYLE[k].borderColor}`,
              }}
            >
              {k}
            </span>
            &nbsp;{v}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUDIT MODAL
═══════════════════════════════════════════════════════════════════ */
function AuditModal({ onClose, onSend }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleSend = () => {
    if (!isValidEmail(email)) {
      setEmailError("Veuillez entrer une adresse email valide.");
      return;
    }
    setEmailError("");
    onSend(email, msg);
  };

  return (
    <div style={styles.auditOverlay}>
      <div style={styles.auditBox}>
        <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>
          📧
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Envoyer à un auditeur externe
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.muted,
            marginBottom: 20,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          L'auditeur recevra la fiche processus complète ainsi que les
          dysfonctionnements identifiés pour confirmation et recommandations.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email de l'auditeur *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="auditeur@organisme.dz"
              style={{
                ...styles.input,
                ...(emailError ? styles.inputError : {}),
              }}
            />
            {emailError && <span style={styles.errorMsg}>⚠ {emailError}</span>}
          </div>
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Message (optionnel)</label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Instructions particulières pour l'auditeur..."
              rows={3}
              style={styles.textarea}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ ...styles.btnCancel, flex: 1 }}>
            Annuler
          </button>
          <button
            onClick={handleSend}
            style={{
              ...styles.btnPublish,
              flex: 1,
              opacity: isValidEmail(email) ? 1 : 0.5,
            }}
          >
            Envoyer la fiche
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DIAGNOSTIC OVERLAY
═══════════════════════════════════════════════════════════════════ */
function DiagnosticOverlay() {
  return (
    <div style={styles.diagOverlay}>
      <div style={styles.diagBox}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Analyse en cours…
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.muted,
            marginBottom: 28,
            lineHeight: 1.7,
          }}
        >
          Notre moteur SMQ analyse votre fiche processus par rapport aux
          exigences ISO 9001.
          <br />
          Vérification des KPIs, risques, documentation, déroulement et RACI.
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: C.primary,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DIAGNOSTIC ENGINE
═══════════════════════════════════════════════════════════════════ */
function generateDysfonctionnements(form) {
  const dysf = [];
  const soon = (days) =>
    new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  if (form.kpis.length === 0) {
    dysf.push({
      titre: "Absence d'indicateurs de performance (KPIs)",
      description:
        "Aucun KPI n'est défini pour ce processus, rendant le suivi des performances impossible.",
      consequences:
        "Impossibilité de mesurer l'efficacité du processus et de détecter les dérives qualité.",
      causes:
        "Manque de définition des objectifs mesurables lors de la conception du processus.",
      gravite: "Majeur",
      ameliorations:
        "Définir au minimum 2–3 KPIs pertinents avec valeurs cibles et seuils d'alerte documentés.",
      responsable: form.pilote || "Pilote",
      echeance: soon(30),
      statut: "Ouvert",
    });
  }

  const highRisks = form.risques.filter(
    (r) => parseInt(r.probabilite) * parseInt(r.gravite) >= 6,
  );
  if (highRisks.length > 0) {
    dysf.push({
      titre: `${highRisks.length} risque(s) critique(s) sans plan d'action complet`,
      description: `${highRisks.length} risque(s) à criticité élevée (≥6) identifié(s) sans mesures d'atténuation suffisantes.`,
      consequences:
        "Exposition à des défaillances majeures pouvant affecter la qualité du service et la certification ISO 9001.",
      causes:
        "Plans de traitement des risques incomplets ou non formalisés dans la fiche processus.",
      gravite: "Critique",
      ameliorations:
        "Mettre en place des actions préventives documentées pour chaque risque critique avec responsable et échéance.",
      responsable: form.pilote || "Pilote",
      echeance: soon(14),
      statut: "Ouvert",
    });
  }

  if (form.documents.length === 0) {
    dysf.push({
      titre: "Documentation de référence manquante",
      description: "Aucun document de référence n'est associé à ce processus.",
      consequences:
        "Manque de traçabilité documentaire, non-conformité potentielle lors des audits ISO 9001 (clause 7.5).",
      causes:
        "Processus non encore documenté ou documentation non référencée dans le système qualité.",
      gravite: "Majeur",
      ameliorations:
        "Identifier et référencer tous les documents applicables : procédures, modes opératoires, enregistrements.",
      responsable: form.pilote || "Pilote",
      echeance: soon(45),
      statut: "Ouvert",
    });
  }

  if (form.etapes.length === 0) {
    dysf.push({
      titre: "Déroulement du processus non formalisé",
      description:
        "Les étapes chronologiques du processus ne sont pas documentées.",
      consequences:
        "Risque d'exécution non homogène selon les intervenants, difficultés de formation et d'audit.",
      causes:
        "Processus décrit de manière informelle sans formalisation des étapes et acteurs responsables.",
      gravite: "Majeur",
      ameliorations:
        "Décrire les étapes principales avec acteurs, entrées, sorties et durées. Compléter avec un diagramme BPMN.",
      responsable: form.pilote || "Pilote",
      echeance: soon(21),
      statut: "Ouvert",
    });
  }

  const hasCells = Object.values(form.raci.cells || {}).some(Boolean);
  if (!hasCells) {
    dysf.push({
      titre: "Matrice RACI non renseignée",
      description:
        "Aucune responsabilité n'est attribuée dans la matrice RACI du processus.",
      consequences:
        "Ambiguïté sur les rôles et responsabilités pouvant mener à des doublons ou des lacunes dans l'exécution.",
      causes:
        "Matrice RACI non complétée lors de la création de la fiche processus.",
      gravite: "Mineur",
      ameliorations:
        "Compléter la matrice RACI en attribuant R, A, C, I pour chaque activité et chaque acteur concerné.",
      responsable: form.pilote || "Pilote",
      echeance: soon(7),
      statut: "Ouvert",
    });
  }

  if (dysf.length === 0) {
    dysf.push({
      titre: "Conformité générale vérifiée",
      description:
        "L'analyse automatique n'a pas détecté de dysfonctionnements majeurs. Le processus est bien documenté.",
      consequences: "Aucune conséquence critique identifiée à ce stade.",
      causes: "N/A",
      gravite: "Mineur",
      ameliorations:
        "Maintenir le suivi des KPIs définis et procéder à des révisions périodiques de la fiche.",
      responsable: form.pilote || "Pilote",
      echeance: soon(90),
      statut: "En cours",
    });
  }

  return dysf;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
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
function makeOpportunite() {
  return {
    titre: "",
    description: "",
    impact: "Moyen",
    statut: "Planifié",
    responsable: "Atir Zineb",
    echeance: "",
    benefice: "",
    source: "Préparateur",
    dateCreation: new Date().toISOString().split("T")[0],
  };
}

/* ═══════════════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════════════ */
const INIT = {
  identifiant: "PROC-008",
  designation: "",
  pilote: "",
  email: "",
  telephone: "",
  sousDept: "",
  typeProcessus: "",
  objectif: "",
  structures: [],
  raci: {
    roles: ["Pilote", "Qualité", "Direction"],
    activities: ["Planification", "Mise en œuvre", "Contrôle", "Revue"],
    cells: {
      "0-0": "R",
      "0-1": "C",
      "0-2": "A",
      "1-0": "R",
      "1-1": "C",
      "1-2": "I",
      "2-0": "C",
      "2-1": "R",
      "2-2": "A",
      "3-0": "I",
      "3-1": "A",
      "3-2": "R",
    },
  },
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
  processusAmont: [""],
  processusAval: [""],
  enjeuxStrategiques: "",
  moyensAlloues: [],
  contraintes: [""],
  risques: [],
  documents: [],
  preuves: [],
  dysfonctionnements: [],
  etapes: [],
  bpmnFile: null,
  opportunites: [],
};

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

  const [form, setForm] = useState(INIT);
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [toast, setToast] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [published, setPublished] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagDone, setDiagDone] = useState(false);
  const [fieldEditMode, setFieldEditMode] = useState(false);
  const [hiddenFields, setHiddenFields] = useState({});
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSent, setAuditSent] = useState(false);
  const [auditEmail, setAuditEmail] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());
  const [loadingProcess, setLoadingProcess] = useState(isEdit);
  const [dbId, setDbId] = useState(id ? Number(id) : null);
  const [saving, setSaving] = useState(false);

  /* ── Validation Helpers ── */
  const validateField = useCallback(
    (key, value) => {
      const newErrors = { ...errors };
      const newWarnings = { ...warnings };

      if (REQUIRED_FIELDS.includes(key) && !isNotEmpty(value)) {
        newErrors[key] = "Ce champ est obligatoire.";
      } else {
        delete newErrors[key];
      }

      if (key === "pilote" && value && !isValidName(value)) {
        newErrors[key] = "Le nom ne doit pas contenir de chiffres.";
      } else if (key === "pilote" && value && isValidName(value)) {
        delete newErrors[key];
      }

      if (key === "email" && value && !isValidEmail(value)) {
        newErrors[key] = "Veuillez entrer une adresse email valide.";
      } else if (key === "email" && value && isValidEmail(value)) {
        delete newErrors[key];
      }

      if (key === "telephone" && value && !isValidPhone(value)) {
        newWarnings[key] =
          "Format de téléphone non standard. Utilisez +213 ou 0.";
      } else if (key === "telephone") {
        delete newWarnings[key];
      }

      const textFields = [
        "designation",
        "objectif",
        "pilote",
        "sousDept",
        "objectifStrategique",
        "enjeuxStrategiques",
        "periode",
        "clients",
        "effectifs",
      ];
      if (textFields.includes(key)) {
        const spellResult = validateFrenchSpelling(value);
        if (!spellResult.isValid && value && value.length > 3) {
          const unknownWords = spellResult.warnings.slice(0, 3);
          newWarnings[key] =
            `Mots suspects: ${unknownWords.join(", ")}${spellResult.warnings.length > 3 ? "..." : ""}`;
        } else {
          delete newWarnings[key];
        }
      }

      setErrors(newErrors);
      setWarnings(newWarnings);
      return Object.keys(newErrors).length === 0;
    },
    [errors, warnings],
  );

  /* ── Helpers ── */
  const set = useCallback(
    (key, value) => {
      setForm((f) => ({ ...f, [key]: value }));
      setDirty(true);
      if (typeof value === "string") {
        validateField(key, value);
      }
    },
    [validateField],
  );

  const setNested = useCallback((parent, key, value) => {
    setForm((f) => ({ ...f, [parent]: { ...f[parent], [key]: value } }));
    setDirty(true);
  }, []);

  const toggleField = useCallback((fkey) => {
    setHiddenFields((h) => ({ ...h, [fkey]: !h[fkey] }));
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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Chargement du processus réel en édition ── */
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api
      .get(`/processus/${id}`)
      .then((p) => {
        if (cancelled) return;
        setForm((f) => ({ ...f, ...denormalizeProcessus(p) }));
        setDbId(p.id);
        setPublished(true);
      })
      .catch((err) => {
        if (cancelled) return;
        showToast(err?.message || "Processus introuvable.", "error");
        navigate("/processus");
      })
      .finally(() => {
        if (!cancelled) setLoadingProcess(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const handleCancel = () => {
    if (dirty) {
      if (
        window.confirm(
          "Des modifications non sauvegardées seront perdues. Continuer ?",
        )
      )
        navigate("/processus");
    } else navigate("/processus");
  };

  /* ── Persistance réelle (POST création / PUT mise à jour) ── */
  const persistProcessus = async () => {
    const payload = buildProcessusPayload(form, { isEdit: Boolean(dbId) });
    if (dbId) {
      return api.put(`/processus/${dbId}`, payload);
    }
    return api.post("/processus/", payload);
  };

  const handleDraft = async () => {
    if (!isNotEmpty(form.designation)) {
      showToast(
        "Donnez au moins une désignation au processus avant d'enregistrer.",
        "error",
      );
      setActiveTab(0);
      return;
    }
    setSaving(true);
    try {
      const saved = await persistProcessus();
      if (!dbId) {
        setDbId(saved.id);
        navigate(`/processus/${saved.id}`, { replace: true });
      }
      setForm((f) => ({ ...f, identifiant: saved.code || f.identifiant }));
      setDirty(false);
      showToast("Brouillon enregistré ✓");
    } catch (err) {
      showToast(
        err?.message || "Erreur lors de l'enregistrement du brouillon.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const validateAll = () => {
    const e = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!isNotEmpty(form[f])) e[f] = "Ce champ est obligatoire";
    });
    if (form.email && !isValidEmail(form.email))
      e.email = "Veuillez entrer une adresse email valide.";
    if (form.pilote && !isValidName(form.pilote))
      e.pilote = "Le nom ne doit pas contenir de chiffres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePublish = () => {
    if (!validateAll()) {
      showToast(
        "Veuillez corriger les champs obligatoires avant de publier.",
        "error",
      );
      setActiveTab(0);
      return;
    }
    proceedPublish();
  };

  const proceedPublish = async () => {
    setSaving(true);
    try {
      const saved = await persistProcessus();
      if (!dbId) {
        setDbId(saved.id);
        navigate(`/processus/${saved.id}`, { replace: true });
      }
      setForm((f) => ({ ...f, identifiant: saved.code || f.identifiant }));
      setPublished(true);
      setDirty(false);
      pushNotification(
        "publish",
        "Processus publié",
        `Le processus «${form.designation}» a été publié avec succès.`,
      );
      setUnreadCount((n) => n + 1);
      showToast("Processus publié ! Il apparaît maintenant dans la liste. 🎉");
    } catch (err) {
      showToast(
        err?.message || "Erreur lors de la publication du processus.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiagnostic = () => {
    setDiagRunning(true);
    setTimeout(() => {
      const results = generateDysfonctionnements(form);
      set("dysfonctionnements", results);
      setDiagRunning(false);
      setDiagDone(true);
      pushNotification(
        "diagnostic",
        "Diagnostic SMQ complété",
        `L'analyse du processus «${form.designation}» a identifié ${results.length} dysfonctionnement(s).`,
      );
      setUnreadCount((n) => n + 1);
      showToast(
        `Analyse terminée — ${results.length} dysfonctionnement(s) identifié(s) ✓`,
      );
    }, 2800);
  };

  const handleSendToAuditor = (email, message) => {
    const auditRecord = {
      processId: form.identifiant,
      processName: form.designation,
      auditorEmail: email,
      message,
      sentAt: new Date().toISOString(),
      dysfonctionnements: form.dysfonctionnements,
    };
    const records = JSON.parse(localStorage.getItem("smq_audits") || "[]");
    records.push(auditRecord);
    localStorage.setItem("smq_audits", JSON.stringify(records));
    setAuditEmail(email);
    setAuditSent(true);
    setShowAuditModal(false);
    pushNotification(
      "audit",
      "Fiche envoyée à l'auditeur",
      `Le processus «${form.designation}» a été transmis à ${email} pour audit externe.`,
    );
    setUnreadCount((n) => n + 1);
    showToast(`Fiche envoyée à ${email} pour audit externe ✓`);
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER OPPORTUNITES
═══════════════════════════════════════════════════════════════ */
  const renderOpportunites = () => {
    const opps = form.opportunites || [];

    const impactStyles = {
      Fort: { color: "#166534", bg: "#dcfce7" },
      Moyen: { color: "#92400e", bg: "#fef3c7" },
      Faible: { color: "#1e40af", bg: "#dbeafe" },
    };

    const statutStyles = {
      Planifié: { color: "#1e40af", bg: "#dbeafe" },
      "En cours": { color: "#92400e", bg: "#fef3c7" },
      Clôturé: { color: "#166534", bg: "#dcfce7" },
    };

    const sourceStyles = {
      Préparateur: { color: "#1e40af", bg: "#dbeafe" },
      "Auditeur Interne": { color: "#991b1b", bg: "#fee2e2" },
      "Auditeur Externe": { color: "#166534", bg: "#dcfce7" },
      Direction: { color: "#92400e", bg: "#fef3c7" },
    };

    const cycleStatut = (current) => {
      const statuses = ["Planifié", "En cours", "Clôturé"];
      const idx = statuses.indexOf(current);
      return statuses[(idx + 1) % statuses.length];
    };

    return (
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <SectionHeader
            num="1c"
            title="Opportunités d'amélioration"
            sub="Identifiez les axes d'amélioration pour ce processus"
          />
          <button
            type="button"
            style={styles.addBtn}
            onClick={() => {
              const newOpp = makeOpportunite();
              // Auto-fill responsable with current user (simulated - in real app would come from auth context)
              newOpp.responsable = "Atir Zineb"; // This would come from your auth system
              set("opportunites", [...opps, newOpp]);
            }}
          >
            ＋ Ajouter une opportunité
          </button>
        </div>

        {opps.length === 0 ? (
          <div style={styles.historyPlaceholder}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>💡</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Aucune opportunité identifiée
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Cliquez sur "Ajouter une opportunité" pour commencer.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {opps.map((opp, i) => {
              const impactStyle =
                impactStyles[opp.impact] || impactStyles["Moyen"];
              const statutStyle =
                statutStyles[opp.statut] || statutStyles["Planifié"];
              const sourceStyle =
                sourceStyles[opp.source] || sourceStyles["Préparateur"];

              return (
                <div
                  key={i}
                  style={{
                    background: C.white,
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    padding: "20px 24px",
                    transition: "box-shadow 0.2s, transform 0.15s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Header with title and source badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: C.text,
                          fontSize: 16,
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        {opp.titre || "Nouvelle opportunité"}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: sourceStyle.color,
                          background: sourceStyle.bg,
                          padding: "3px 12px",
                          borderRadius: 20,
                          border: `1px solid ${sourceStyle.color}30`,
                        }}
                      >
                        {opp.source || "Préparateur"}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...styles.dynRemove,
                        fontSize: 13,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "#fef2f2",
                        color: C.danger,
                        border: "1px solid #fecaca",
                      }}
                      onClick={() =>
                        set(
                          "opportunites",
                          opps.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      ✕ Supprimer
                    </button>
                  </div>

                  {/* Main content grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 24px",
                      marginBottom: 12,
                    }}
                  >
                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Description</label>
                      <input
                        value={opp.description}
                        onChange={(e) => {
                          const u = [...opps];
                          u[i] = { ...u[i], description: e.target.value };
                          set("opportunites", u);
                        }}
                        placeholder="Décrire l'opportunité..."
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Bénéfice attendu</label>
                      <input
                        value={opp.benefice}
                        onChange={(e) => {
                          const u = [...opps];
                          u[i] = { ...u[i], benefice: e.target.value };
                          set("opportunites", u);
                        }}
                        placeholder="Ex: -70% temps de mise à jour"
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Bottom row: Impact, Statut, Échéance */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "14px 24px",
                    }}
                  >
                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Impact</label>
                      <select
                        value={opp.impact}
                        onChange={(e) => {
                          const u = [...opps];
                          u[i] = { ...u[i], impact: e.target.value };
                          set("opportunites", u);
                        }}
                        style={styles.select}
                      >
                        {["Fort", "Moyen", "Faible"].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Statut</label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          height: 42,
                          padding: "0 4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: statutStyle.color,
                            background: statutStyle.bg,
                            padding: "6px 16px",
                            borderRadius: 20,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            border: `1px solid ${statutStyle.color}30`,
                            transition: "all 0.15s",
                          }}
                          onClick={() => {
                            const u = [...opps];
                            u[i] = { ...u[i], statut: cycleStatut(opp.statut) };
                            set("opportunites", u);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 8px rgba(0,0,0,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                          title="Cliquer pour changer le statut"
                        >
                          {opp.statut || "Planifié"}
                          <span style={{ fontSize: 10, opacity: 0.6 }}>↻</span>
                        </span>
                      </div>
                    </div>

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Échéance</label>
                      <input
                        type="date"
                        value={opp.echeance || ""}
                        onChange={(e) => {
                          const u = [...opps];
                          u[i] = { ...u[i], echeance: e.target.value };
                          set("opportunites", u);
                        }}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Responsable - auto-filled, displayed as a badge */}
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: `1px solid ${C.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}
                    >
                      Créé par:
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.primary,
                        background: `${C.primary}10`,
                        padding: "2px 12px",
                        borderRadius: 12,
                      }}
                    >
                      {opp.responsable || "Atir Zineb"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        marginLeft: "auto",
                      }}
                    >
                      {opp.dateCreation
                        ? new Date(opp.dateCreation).toLocaleDateString("fr-FR")
                        : new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: C.muted,
            padding: "8px 12px",
            background: C.lightBg,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600 }}>💡 Statuts:</span>
          <span
            style={{
              background: "#dbeafe",
              color: "#1e40af",
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            🟦 Planifié
          </span>
          <span
            style={{
              background: "#fef3c7",
              color: "#92400e",
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            🟨 En cours
          </span>
          <span
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ✅ Clôturé
          </span>
          <span
            style={{
              fontSize: 10,
              color: C.muted,
              fontStyle: "italic",
            }}
          >
            (Cliquez sur le statut pour le changer)
          </span>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     TAB RENDERS
═══════════════════════════════════════════════════════════════ */
  const renderTab1 = () => (
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
        <Field label="Type de processus" fkey="typeProcessus">
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
          warning={warnings.designation}
        >
          <Input
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="Ex : Gestion des soutenances PFE"
            error={errors.designation}
            warning={warnings.designation}
          />
        </Field>
        <Field
          label="Pilote du processus"
          required
          error={errors.pilote}
          warning={warnings.pilote}
        >
          <Input
            value={form.pilote}
            onChange={(e) => set("pilote", e.target.value)}
            placeholder="Nom du responsable"
            error={errors.pilote}
            warning={warnings.pilote}
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
        <Field label="Téléphone" fkey="telephone" warning={warnings.telephone}>
          <Input
            type="tel"
            value={form.telephone}
            onChange={(e) => set("telephone", e.target.value)}
            placeholder="+213 XXX XXX XXX"
            warning={warnings.telephone}
          />
        </Field>
        <Field
          label="Sous-département"
          required
          error={errors.sousDept}
          warning={warnings.sousDept}
        >
          <Input
            value={form.sousDept}
            onChange={(e) => set("sousDept", e.target.value)}
            placeholder="Ex : Laboratoire, Scolarité..."
            error={errors.sousDept}
            warning={warnings.sousDept}
          />
        </Field>
        <Field label="Structures concernées" fkey="structures">
          <TagInput
            tags={form.structures}
            onChange={(v) => set("structures", v)}
            placeholder="Taper et Entrée pour ajouter..."
          />
        </Field>
        <div style={styles.gridFull}>
          <Field
            label="Objectif du processus"
            required
            error={errors.objectif}
            warning={warnings.objectif}
          >
            <TextArea
              value={form.objectif}
              onChange={(e) => set("objectif", e.target.value)}
              placeholder="Décrire l'objectif principal du processus..."
              rows={4}
              error={errors.objectif}
              warning={warnings.objectif}
            />
          </Field>
        </div>
      </div>

      <div style={styles.divider} />

      <SectionHeader
        num="1b"
        title="RACI — Matrice des responsabilités"
        sub="Cliquez sur une cellule pour attribuer R / A / C / I — les noms de rôles et d'activités sont éditables"
      />
      <RaciMatrix raci={form.raci} onChange={(v) => set("raci", v)} />

      <div style={styles.divider} />

      {/* Opportunities section */}
      {renderOpportunites()}

      <div style={styles.divider} />

      <SectionHeader num="1d" title="Historique des révisions" />
      <div style={styles.historyPlaceholder}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Aucun historique disponible
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          L'historique sera généré automatiquement après le premier
          enregistrement.
        </div>
      </div>
    </div>
  );

  const renderTab2 = () => (
    <div>
      <SectionHeader
        num="2"
        title="Éléments Clés du Processus"
        sub="Flux, ressources, compétences et indicateurs de performance"
      />
      <div style={styles.grid2}>
        <Field label="Période / Mois" fkey="periode" warning={warnings.periode}>
          <Input
            value={form.periode}
            onChange={(e) => set("periode", e.target.value)}
            placeholder="Ex : Oct → Juin (9 mois)"
            warning={warnings.periode}
          />
        </Field>
        <Field
          label="Objectif stratégique"
          fkey="objectifStrategique"
          warning={warnings.objectifStrategique}
        >
          <Input
            value={form.objectifStrategique}
            onChange={(e) => set("objectifStrategique", e.target.value)}
            placeholder="Lien avec la stratégie globale..."
            warning={warnings.objectifStrategique}
          />
        </Field>
        <Field
          label="Clients / Bénéficiaires"
          fkey="clients"
          warning={warnings.clients}
        >
          <TextArea
            value={form.clients}
            onChange={(e) => set("clients", e.target.value)}
            placeholder="Étudiants, Direction, Entreprises partenaires..."
            rows={2}
            warning={warnings.clients}
          />
        </Field>
        <Field
          label="Effectifs impliqués"
          fkey="effectifs"
          warning={warnings.effectifs}
        >
          <TextArea
            value={form.effectifs}
            onChange={(e) => set("effectifs", e.target.value)}
            placeholder="Ex : 12 enseignants, 3 membres administratifs..."
            rows={2}
            warning={warnings.effectifs}
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
        <Field
          label="Compétences clés"
          fkey="competences"
          warning={warnings.competences}
        >
          <TagInput
            tags={form.competences}
            onChange={(v) => set("competences", v)}
            placeholder="Ajouter une compétence..."
          />
        </Field>
        <Field
          label="Ressources matérielles"
          fkey="ressourcesMat"
          warning={warnings.ressourcesMat}
        >
          <TagInput
            tags={form.ressourcesMat}
            onChange={(v) => set("ressourcesMat", v)}
            placeholder="Équipements, locaux..."
          />
        </Field>
        <Field
          label="Ressources logicielles"
          fkey="ressourcesLog"
          warning={warnings.ressourcesLog}
        >
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
                    const u = [...form.kpis];
                    u[i] = { ...u[i], [key]: e.target.value };
                    set("kpis", u);
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

  const renderTab3 = () => (
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
          <Field
            label="Enjeux stratégiques"
            fkey="enjeuxStrategiques"
            warning={warnings.enjeuxStrategiques}
          >
            <TextArea
              value={form.enjeuxStrategiques}
              onChange={(e) => set("enjeuxStrategiques", e.target.value)}
              placeholder="Décrire les enjeux liés à ce processus..."
              rows={3}
              warning={warnings.enjeuxStrategiques}
            />
          </Field>
        </div>
        <Field
          label="Moyens alloués"
          fkey="moyensAlloues"
          warning={warnings.moyensAlloues}
        >
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
        const crit = parseInt(r.probabilite || 1) * parseInt(r.gravite || 1);
        const critColor = crit >= 9 ? C.danger : crit >= 4 ? C.warn : "#4caf50";
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
                  Criticité : {crit}
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
              <Field label="Probabilité (1–3)">
                <Select
                  value={r.probabilite}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], probabilite: e.target.value };
                    set("risques", u);
                  }}
                  options={[
                    { value: "1", label: "1 – Faible" },
                    { value: "2", label: "2 – Moyenne" },
                    { value: "3", label: "3 – Élevée" },
                  ]}
                />
              </Field>
              <Field label="Gravité (1–3)">
                <Select
                  value={r.gravite}
                  onChange={(e) => {
                    const u = [...form.risques];
                    u[i] = { ...u[i], gravite: e.target.value };
                    set("risques", u);
                  }}
                  options={[
                    { value: "1", label: "1 – Mineure" },
                    { value: "2", label: "2 – Modérée" },
                    { value: "3", label: "3 – Sévère" },
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

  const renderTab4 = () => (
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

  const renderTab5 = () => {
    if (!published) {
      return (
        <div style={styles.lockScreen}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
            Section verrouillée
          </div>
          <div
            style={{
              color: C.muted,
              maxWidth: 420,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            L'analyse des dysfonctionnements n'est disponible qu'après la
            publication de la fiche processus. Publiez votre processus pour
            débloquer cette section et lancer le diagnostic SMQ.
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              style={{
                ...styles.btnPublish,
                padding: "12px 28px",
                fontSize: 15,
                opacity: saving ? 0.6 : 1,
              }}
              disabled={saving}
              onClick={handlePublish}
            >
              {saving ? "🚀 Publication…" : "🚀 Publier le processus"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <SectionHeader
          num="5"
          title="Dysfonctionnements Majeurs"
          sub="Analyse automatique SMQ et plan d'amélioration"
        />

        {!diagDone && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: C.lightBg,
              borderRadius: 16,
              border: `1.5px dashed ${C.border}`,
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔬</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                marginBottom: 10,
              }}
            >
              Diagnostic SMQ disponible
            </div>
            <div
              style={{
                color: C.muted,
                marginBottom: 24,
                fontSize: 13,
                lineHeight: 1.7,
                maxWidth: 480,
                margin: "0 auto 24px",
              }}
            >
              Notre moteur SMQ va analyser la complétude de votre fiche,
              identifier les écarts par rapport aux exigences ISO 9001 (KPIs,
              risques, documentation, RACI, déroulement) et générer
              automatiquement les dysfonctionnements détectés.
            </div>
            <button
              type="button"
              style={{
                ...styles.btnPublish,
                padding: "14px 36px",
                fontSize: 15,
                background: `linear-gradient(135deg, ${C.primary}, #3a7a62)`,
              }}
              onClick={handleDiagnostic}
            >
              🔬 Lancer le diagnostic SMQ
            </button>
          </div>
        )}

        {diagDone && (
          <div>
            <div style={styles.diagBanner}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div
                  style={{ fontWeight: 700, color: "#92400e", marginBottom: 2 }}
                >
                  Analyse terminée — {form.dysfonctionnements.length}{" "}
                  dysfonctionnement(s) identifié(s)
                </div>
                <div style={{ color: "#92400e", fontSize: 12 }}>
                  Vous pouvez modifier ces résultats avant de les envoyer à
                  l'auditeur externe.
                </div>
              </div>
            </div>

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
                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: C.primary }}
                  >
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
                </div>
              </div>
            ))}

            <button
              type="button"
              style={styles.addBtn}
              onClick={() =>
                set("dysfonctionnements", [
                  ...form.dysfonctionnements,
                  makeDysf(),
                ])
              }
            >
              ＋ Ajouter un dysfonctionnement
            </button>

            <div
              style={{
                marginTop: 28,
                background: `linear-gradient(135deg, ${C.lightBg}, #e8f5e9)`,
                borderRadius: 16,
                padding: "24px 28px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                📤 Envoyer à un auditeur externe
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.muted,
                  marginBottom: 20,
                  lineHeight: 1.7,
                }}
              >
                Une fois satisfait des résultats, envoyez la fiche processus et
                ses dysfonctionnements à un auditeur externe. L'auditeur pourra
                confirmer l'analyse et formuler des recommandations
                d'amélioration.
              </div>
              {auditSent ? (
                <div style={styles.auditSentBanner}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div>
                      Fiche envoyée à <strong>{auditEmail}</strong> pour audit
                      externe.
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: "#4ade80",
                        marginTop: 2,
                      }}
                    >
                      En attente de confirmation et de recommandations de
                      l'auditeur.
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    ...styles.btnDraft,
                    padding: "12px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onClick={() => setShowAuditModal(true)}
                >
                  <span>📧</span> Envoyer à un auditeur externe
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTab6 = () => (
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
              <div style={styles.gridFull}>
                <Field label="Description">
                  <TextArea
                    value={e.description}
                    onChange={(ev) => {
                      const u = [...form.etapes];
                      u[i] = { ...u[i], description: ev.target.value };
                      set("etapes", u);
                    }}
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
            onClick={() => showToast("Import BPMN — à intégrer")}
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
            ✅ Valider
          </button>
        </div>
      </div>
    </div>
  );

  const tabRenderers = [
    renderTab1,
    renderTab2,
    renderTab3,
    renderTab4,
    renderTab5,
    renderTab6,
  ];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  if (loadingProcess) {
    return (
      <div style={{ padding: 40, color: "#6b7280", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Chargement…
      </div>
    );
  }

  return (
    <FieldCtx.Provider
      value={{
        hidden: hiddenFields,
        editMode: fieldEditMode,
        toggle: toggleField,
      }}
    >
      <div style={styles.page}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
          @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.4); opacity:0.6; } }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #eaf5eb; }
          ::-webkit-scrollbar-thumb { background: #77D58F; border-radius: 99px; }
          button:hover { opacity: 0.88; }
          .icon-btn-form:hover { background: #f3f5f7 !important; transform: translateY(-1px); }
          .u-chip-form:hover { background: #ebeef1 !important; }
        `}</style>

        <div style={styles.main}>
          {/* ── Topbar ── */}
          <div style={styles.topbar}>
            <div style={styles.breadcrumb}>
              <span
                style={{ cursor: "pointer" }}
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
              <button
                type="button"
                onClick={() => setFieldEditMode((v) => !v)}
                style={{
                  ...styles.fieldEditToggle,
                  background: fieldEditMode ? C.primary : "#fff",
                  color: fieldEditMode ? "#fff" : C.muted,
                  borderColor: fieldEditMode ? C.primary : C.border,
                }}
                title="Activer pour masquer/afficher des champs dans la fiche"
              >
                {fieldEditMode
                  ? "✓ Mode édition champs"
                  : "⚙ Personnaliser champs"}
              </button>

              <div className="icon-btn-form" style={styles.iconBtn}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                  FR
                </span>
              </div>

              <div
                className="icon-btn-form"
                style={{ ...styles.iconBtn, cursor: "pointer" }}
                onClick={() => {
                  setShowNotifs((v) => !v);
                  setUnreadCount(0);
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && <span style={styles.nDot} />}
              </div>

              <div
                className="u-chip-form"
                style={styles.uChip}
                onClick={() => navigate("/parametres")}
              >
                <div style={styles.uAv}>
                  {(() => {
                    const u = getCurrentUser();
                    return (
                      u?.nom_complet
                        ?.split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"
                    );
                  })()}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111",
                      lineHeight: 1.2,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {getCurrentUser()?.nom_complet || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Admin</div>
                </div>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  style={{ marginLeft: 2 }}
                >
                  <path
                    d="M2 3.5l3 3 3-3"
                    stroke="#9ca3af"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div style={styles.content}>
            {/* Header card */}
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
                {published && (
                  <span
                    style={{
                      ...styles.badge,
                      background: "#22c55e",
                      color: "#fff",
                    }}
                  >
                    ✓ Publié
                  </span>
                )}
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

            {/* Completion bar */}
            <div style={styles.completionCard}>
              <span style={styles.completionLabel}>Complétude</span>
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
              {published ? (
                <span style={styles.statusBadgePublished}>● Publié</span>
              ) : (
                <span style={styles.statusBadge}>● Brouillon</span>
              )}
              {published && diagDone && (
                <span
                  style={{
                    ...styles.statusBadge,
                    background: "#dbeafe",
                    color: "#1e40af",
                    borderColor: "#3b82f6",
                  }}
                >
                  🔬 Analysé
                </span>
              )}
            </div>

            {/* Tabs */}
            <div style={styles.tabsWrap}>
              <div style={styles.tabsHeader}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    style={{
                      ...styles.tab,
                      ...(activeTab === t.id ? styles.tabActive : {}),
                      ...(t.id === 4 && !published ? { color: "#9ca3af" } : {}),
                    }}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.id === 4 && !published && "🔒 "}
                    {t.id === 4 && published && diagDone && "🔬 "}
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={styles.tabContent}>{tabRenderers[activeTab]()}</div>
            </div>
          </div>

          {/* Action bar */}
          <div style={styles.actionBar}>
            <button
              type="button"
              style={styles.btnCancel}
              onClick={handleCancel}
            >
              ← Annuler
            </button>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {fieldEditMode && (
                <span style={{ fontSize: 12, color: C.warn, fontWeight: 600 }}>
                  ⚙ Mode édition des champs actif
                </span>
              )}
              <button
                type="button"
                style={{ ...styles.btnDraft, opacity: saving ? 0.6 : 1 }}
                disabled={saving}
                onClick={handleDraft}
              >
                {saving ? "💾 Enregistrement…" : "💾 Enregistrer brouillon"}
              </button>
              {published && diagDone && !auditSent && (
                <button
                  type="button"
                  style={{
                    ...styles.btnDraft,
                    borderColor: "#3b82f6",
                    color: "#1e40af",
                  }}
                  onClick={() => setShowAuditModal(true)}
                >
                  📧 Envoyer à l'auditeur
                </button>
              )}
              {!published && (
                <button
                  type="button"
                  style={{ ...styles.btnPublish, opacity: saving ? 0.6 : 1 }}
                  disabled={saving}
                  onClick={handlePublish}
                >
                  {saving ? "🚀 Publication…" : "🚀 Publier le processus"}
                </button>
              )}
              {published && !diagDone && (
                <button
                  type="button"
                  style={{
                    ...styles.btnPublish,
                    background: `linear-gradient(135deg, ${C.primary}, #3a7a62)`,
                  }}
                  onClick={() => setActiveTab(4)}
                >
                  🔬 Aller au diagnostic
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic running overlay */}
        {diagRunning && <DiagnosticOverlay />}

        {/* Audit modal */}
        {showAuditModal && (
          <AuditModal
            onClose={() => setShowAuditModal(false)}
            onSend={handleSendToAuditor}
          />
        )}

        {/* Notifications panel */}
        {showNotifs && (
          <NotificationsPanel onClose={() => setShowNotifs(false)} />
        )}

        {/* Toast */}
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
    </FieldCtx.Provider>
  );
}
