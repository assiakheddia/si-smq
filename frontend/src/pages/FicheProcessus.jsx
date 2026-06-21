import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import Topbar from "../components/Topbar.jsx";

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

const S = {
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
    flexWrap: "wrap",
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
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  tabActive: {
    color: C.primary,
    fontWeight: 700,
    borderBottom: `2px solid ${C.primary}`,
    background: C.white,
  },
  tabContent: { padding: "28px 28px 36px" },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
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
    fontFamily: "'Outfit', sans-serif",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    color: C.text,
  },
  sectionSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px 20px",
  },
  gridFull: { gridColumn: "1 / -1" },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  value: {
    fontSize: 14,
    color: C.text,
    lineHeight: 1.6,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  divider: { height: 1, background: C.border, margin: "24px 0" },
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
  etapeCard: {
    display: "flex",
    gap: 0,
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  actionBar: {
    background: C.white,
    borderTop: `1px solid ${C.border}`,
    padding: "16px 28px",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexShrink: 0,
  },
  btnEdit: {
    padding: "10px 28px",
    borderRadius: 10,
    border: "none",
    background: C.primary,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(45,96,79,0.3)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  btnBack: {
    padding: "10px 22px",
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    background: "transparent",
    color: C.muted,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
};

/* ═══════════════════════════════════════════════════════════════════
   DONNÉES MOCK
═══════════════════════════════════════════════════════════════════ */
const PROCESSUS_DATA = {
  1: {
    identifiant: "PROC-007",
    designation: "Gestion PFE",
    pilote: "M. Haddadou",
    email: "haddadou@esi.dz",
    telephone: "(225) 555-0118",
    sousDept: "Soutenances",
    typeProcessus: "Réalisation",
    objectif:
      "Organiser et piloter l'ensemble des activités liées aux projets de fin d'études : affectation des sujets, suivi des étudiants, planification et organisation des soutenances.",
    structures: [
      "Département Informatique",
      "Direction des études",
      "Jury de soutenance",
    ],
    raci: {
      roles: ["Pilote", "Qualité", "Direction"],
      activities: ["Planification", "Mise en œuvre", "Contrôle", "Revue"],
      cells: { 
        "0-0": "R", "0-1": "C", "0-2": "A", 
        "1-0": "R", "1-1": "C", "1-2": "I", 
        "2-0": "C", "2-1": "R", "2-2": "A", 
        "3-0": "I", "3-1": "A", "3-2": "R" 
      },
    }, 
    periode: "Septembre → Juin",
    coutEstime: "Budget pédagogique annuel",
    objectifStrategique: "Améliorer la qualité des PFEs et l'encadrement",
    fluxEntrees: ["Demandes de sujets", "CV étudiants", "Règlement intérieur"],
    fluxSorties: [
      "Sujets attribués",
      "Calendrier soutenances",
      "Rapports finaux",
    ],
    clients: [
      "Étudiants en fin de cycle",
      "Entreprises partenaires",
      "Direction pédagogique",
    ],
    effectifs: ["12 enseignants encadrants", "3 membres administratifs"],
    competences: [
      "Expertise technique dans la spécialité",
      "Maîtrise des critères d'évaluation",
      "Gestion de planning",
    ],
    ressourcesMat: ["Salles de soutenance", "Vidéoprojecteurs"],
    ressourcesLog: ["Plateforme PFE", "Messagerie Teams"],
    kpis: [
      {
        nom: "Taux de réussite aux soutenances",
        unite: "%",
        valeurCible: "≥ 90%",
        seuilAlerte: "< 75%",
        frequence: "Annuelle",
        responsable: "Coordinateur",
        couleur: "#d4f5dc",
        couleurTexte: "#1a6b35",
      },
      {
        nom: "Délai moyen de validation du sujet",
        unite: "jours",
        valeurCible: "< 15 jours",
        seuilAlerte: "> 20j",
        frequence: "Par promotion",
        responsable: "Admin",
        couleur: "#fff3d4",
        couleurTexte: "#7a5800",
      },
      {
        nom: "Taux d'encadrement couvert",
        unite: "%",
        valeurCible: "100%",
        seuilAlerte: "< 90%",
        frequence: "Semestrielle",
        responsable: "Jury",
        couleur: "#d4e8f5",
        couleurTexte: "#1a4a6b",
      },
    ],
    processusAmont: ["Gestion des inscriptions", "Gestion des enseignants"],
    processusAval: ["Délibération", "Archivage"],
    enjeuxStrategiques:
      "Garantir la qualité académique des travaux de fin d'études et la conformité aux exigences pédagogiques nationales.",
    moyensAlloues: [
      "Plateforme de dépôt en ligne",
      "Salle de soutenance équipée",
      "Système de gestion PFE (SGPFE)",
    ],
    contraintes: [
      "Calendrier académique fixé",
      "Quota d'encadrement par enseignant",
      "Réglementation MESRS",
    ],
    risques: [
      {
        description: "Manque d'encadrants disponibles",
        probabilite: "2",
        gravite: "3",
        mesure: "Recrutement anticipé",
        responsable: "Coordinateur",
      },
      {
        description: "Indisponibilité des jurys",
        probabilite: "2",
        gravite: "2",
        mesure: "Planning prévisionnel",
        responsable: "Admin",
      },
      {
        description: "Dépôt tardif des rapports",
        probabilite: "3",
        gravite: "2",
        mesure: "Relances automatiques",
        responsable: "Plateforme",
      },
    ],
    niveauMaturite: 81,
    documentsDescription:
      "Documents de référence essentiels pour la bonne exécution du processus de gestion des PFE. Ils définissent les règles, les rôles et les responsabilités de chaque intervenant.",
    documents: [
      {
        id: "DOC-001",
        titre: "Charte PFE",
        format: "PDF",
        version: "DOC-0012.1",
        revue: "Approuvée – Direction",
        statut: "Approuvé",
      },
      {
        id: "DOC-002",
        titre: "Guide de l'encadrant",
        format: "PDF",
        version: "DOC-0021.3",
        revue: "Approuvée – Direction",
        statut: "Approuvé",
      },
      {
        id: "DOC-003",
        titre: "Formulaire d'évaluation",
        format: "Excel",
        version: "DOC-0032.0",
        revue: "Approuvée – Direction",
        statut: "Approuvé",
      },
      {
        id: "DOC-004",
        titre: "Règlement intérieur",
        format: "Word",
        version: "DOC-0041.8",
        revue: "Approuvée – Direction",
        statut: "Approuvé",
      },
    ],
    preuves: [
      { titre: "PV de délibération", format: "pdf" },
      { titre: "Fiche de suivi étudiant", format: "xlsx" },
      { titre: "Rapport de soutenance signé", format: "pdf" },
    ],
    dysfonctionnementsDescription:
      "Identification et analyse des dysfonctionnements majeurs rencontrés lors de l'exécution du processus, ainsi que les actions correctives mises en place.",
    dysfonctionnements: [
      {
        titre: "Retard dans la validation des sujets PFE",
        description:
          "Les sujets PFE sont souvent validés après le délai prévu, perturbant le calendrier global.",
        consequences:
          "Perte de temps, stress étudiant, chevauchement avec les délais académiques",
        causes: "Manque de communication entre département et encadrants",
        ameliorations:
          "Mise en place d'un workflow numérique de validation avec notifications automatiques\nQuota d'encadrement par enseignant\nRéglementation MESRS",
        gravite: "Majeur",
        responsable: "Coordinateur",
        echeance: "2026-09",
        statut: "En cours",
      },
      {
        titre: "Sujets non conformes aux exigences académiques",
        description:
          "Certains sujets proposés par les encadrants ne respectent pas les critères de qualité établis.",
        consequences:
          "Refus des sujets par le jury, retards dans le calendrier d'attribution, surcharge de travail pour le comité.",
        causes:
          "Manque de formation des encadrants\nAbsence de template standardisé",
        ameliorations:
          "Organiser des ateliers de formation obligatoires\nCréer un template standard avec critères d'évaluation\nMettre en place une pré-évaluation avant soumission\nDésigner un référent qualité par département",
        gravite: "Moyen",
        responsable: "Comité pédagogique",
        echeance: "2026-12",
        statut: "En cours",
      },
    ],
    etapes: [
      {
        numero: 1,
        nom: "Lancement appel à sujets",
        acteur: "Coordinateur",
        description: "Envoyer appel aux enseignants via plateforme",
        entree: "Calendrier académique",
        sortie: "Liste sujets proposés",
        duree: "2 semaines",
        document: "Formulaire proposition",
      },
      {
        numero: 2,
        nom: "Dépôt des sujets",
        acteur: "Enseignants",
        description: "Déposer propositions sur plateforme",
        entree: "Template sujet",
        sortie: "Sujets déposés",
        duree: "3 semaines",
        document: "Fiche sujet",
      },
      {
        numero: 3,
        nom: "Affectation étudiants",
        acteur: "Coordinateur",
        description: "Attribuer sujets selon préférences",
        entree: "Préférences étudiants",
        sortie: "Planning affectation",
        duree: "2 semaines",
        document: "Tableau affectation",
      },
      {
        numero: 4,
        nom: "Suivi PFE",
        acteur: "Encadrants",
        description: "Suivi hebdomadaire de l'avancement",
        entree: "Rapports d'avancement",
        sortie: "Évaluations intermédiaires",
        duree: "6 mois",
        document: "Grille de suivi",
      },
    ],
  },
};

const TABS = [
  { id: 0, label: "Informations et historique" },
  { id: 1, label: "Éléments Clés" },
  { id: 2, label: "Contexte" },
  { id: 3, label: "Documentation" },
  { id: 4, label: "Dysfonctionnements" },
  { id: 5, label: "Déroulement" },
  { id: 6, label: "Non-conformité et action" },
];

/* ═══════════════════════════════════════════════════════════════════
   DONNÉES MOCK - NON-CONFORMITÉS
═══════════════════════════════════════════════════════════════════ */
const INIT_NC = [
  {
    id: 1,
    auditId: 1,
    ref: "NC-001",
    titre: "Manque de traçabilité documentaire",
    clause: "7.5 Documents",
    gravite: "Majeure",
    statut: "clos",
    responsable: "Haddadou Ali",
    dateLimit: "2026-04-15",
    action: "Mise en place d'un registre numérique",
  },
  {
    id: 2,
    auditId: 1,
    ref: "NC-002",
    titre: "Procédure de revue non suivie",
    clause: "9.3 Revue",
    gravite: "Mineure",
    statut: "clos",
    responsable: "Meziani Karim",
    dateLimit: "2026-04-20",
    action: "Rappels paramétrés dans le SMQ",
  },
  {
    id: 3,
    auditId: 2,
    ref: "NC-003",
    titre: "Étalonnage équipements non conforme",
    clause: "7.1 Ressources",
    gravite: "Critique",
    statut: "en_cours",
    responsable: "Bensalem Sara",
    dateLimit: "2026-05-30",
    action: "Contrat étalonnage signé, en attente d'exécution",
  },
  {
    id: 4,
    auditId: 7,
    ref: "NC-004",
    titre: "Critères sélection fournisseurs absent",
    clause: "8.4 Processus ext.",
    gravite: "Majeure",
    statut: "ouvert",
    responsable: "Kaci Nadia",
    dateLimit: "2026-06-10",
    action: "",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   COMPOSANTS RÉUTILISABLES
═══════════════════════════════════════════════════════════════════ */
function SectionHeader({ num, title, sub }) {
  return (
    <div style={S.sectionHeader}>
      <div style={S.sectionNum}>{num}</div>
      <div>
        <div style={S.sectionTitle}>{title}</div>
        {sub && <div style={S.sectionSub}>{sub}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, children, last }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 16,
        padding: "13px 18px",
        borderBottom: last ? "none" : `1px solid ${C.border}`,
        alignItems: "start",
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: C.muted,
          fontWeight: 500,
          paddingTop: 2,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ text, bg = "#d4f0dc", color = C.primary, border = C.accent }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 20,
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: 12,
        fontWeight: 600,
        marginRight: 6,
        marginBottom: 4,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {text}
    </span>
  );
}

function StatusBadge({ statut }) {
  const map = {
    Approuvé: { bg: "#dcfce7", color: "#166534" },
    Archivé: { bg: "#fef3c7", color: "#92400e" },
    "En cours": { bg: "#dbeafe", color: "#1e40af" },
    Ouvert: { bg: "#fee2e2", color: "#7f1d1d" },
    Résolu: { bg: "#dcfce7", color: "#166534" },
    Clôturé: { bg: "#f3f4f6", color: "#6b7280" },
    Majeur: { bg: "#fef3c7", color: "#92400e" },
    Moyen: { bg: "#fff7ed", color: "#9a3412" },
    Critique: { bg: "#fee2e2", color: "#7f1d1d" },
    Mineur: { bg: "#dcfce7", color: "#166534" },
  };
  const s = map[statut] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {statut}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HANDLE COMPONENT - Moved outside BpmnNodeShape
═══════════════════════════════════════════════════════════════════ */
function Handle({ cx, cy, strokeColor, onMouseDown }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill={strokeColor}
      opacity={0}
      style={{ cursor: "crosshair" }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      onMouseDown={onMouseDown}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB COMPONENTS - MOVED OUTSIDE FicheProcessus
═══════════════════════════════════════════════════════════════════ */

/* ── TAB 1 — Informations et historique ── */
const Tab1 = ({ processus }) => {
  // Get the base number from process code
  const match = processus.identifiant.match(/^PROC-(\d+)$/);
  const baseNum = match ? parseInt(match[1]) : 0;

  // Get roles and activities from raci data
  const roles = processus.raci?.roles || ["Pilote", "Qualité", "Direction"];
  const activities = processus.raci?.activities || ["Planification", "Mise en œuvre", "Contrôle", "Revue"];
  const cells = processus.raci?.cells || {};

  // RACI styles - same colors as in ProcessFormPage
  const RACI_STYLE = {
    R: { background: "#dcfce7", color: "#166534", borderColor: "#86efac" },
    A: { background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" },
    C: { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
    I: { background: "#f3f4f6", color: "#374151", borderColor: "#d1d5db" },
    "": { background: "transparent", color: "#d1d5db", borderColor: C.border },
  };

  const getRaciStyle = (val) => RACI_STYLE[val] || RACI_STYLE[""];

  return (
    <div>
      <SectionHeader
        num="1"
        title="Informations Générales"
        sub="Données d'identification et de responsabilité du processus"
      />

      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <InfoRow label="Identifiant processus">
          <span
            style={{
              fontWeight: 700,
              color: C.primary,
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {processus.identifiant}
          </span>
        </InfoRow>
        <InfoRow label="Type de processus">
          <Chip text={processus.typeProcessus} />
        </InfoRow>
        <InfoRow label="Désignation">{processus.designation}</InfoRow>
        <InfoRow label="Pilote du processus">
          <span style={{ fontWeight: 600 }}>{processus.pilote}</span>
        </InfoRow>
        <InfoRow label="Email">
          <a
            href={`mailto:${processus.email}`}
            style={{
              color: C.primary,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {processus.email}
          </a>
        </InfoRow>
        <InfoRow label="Téléphone">{processus.telephone}</InfoRow>
        <InfoRow label="Sous-département">
          <Chip
            text={processus.sousDept}
            bg={C.lightBg}
            color={C.primary}
            border={C.border}
          />
        </InfoRow>
        <InfoRow label="Objectifs du processus">
          <span style={{ lineHeight: 1.7 }}>{processus.objectif}</span>
        </InfoRow>
        <InfoRow label="Structures concernées">
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 2 }}
          >
            {processus.structures.map((s, i) => (
              <Chip key={i} text={s} />
            ))}
          </div>
        </InfoRow>
      </div>

      <div style={S.divider} />

      {/* RACI Matrix - Static Display Table with Colors */}
      <SectionHeader
        num="1b"
        title="Matrice RACI"
        sub="Matrice des responsabilités (R = Responsable, A = Approbateur, C = Consulté, I = Informé)"
      />

      <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 14px", background: C.dark, color: "#fff", fontWeight: 700, textAlign: "left", border: `1px solid ${C.dark}`, fontSize: 12, minWidth: 160 }}>
                Activité / Rôle
              </th>
              {roles.map((role, ri) => (
                <th key={ri} style={{ padding: "10px 14px", background: C.primary, color: "#fff", fontWeight: 700, textAlign: "center", border: `1px solid ${C.dark}`, fontSize: 12, whiteSpace: "nowrap" }}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, ai) => (
              <tr key={ai}>
                <td style={{ padding: "6px 10px", border: `1px solid ${C.border}`, background: C.lightBg, minWidth: 160, fontWeight: 500 }}>
                  {activity}
                </td>
                {roles.map((_, ri) => {
                  const val = cells[`${ai}-${ri}`] || "";
                  const style = getRaciStyle(val);
                  return (
                    <td
                      key={ri}
                      style={{
                        padding: "6px 8px",
                        border: `1px solid ${C.border}`,
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: 14,
                        minWidth: 60,
                        background: style.background,
                        color: style.color,
                        borderColor: style.borderColor,
                      }}
                    >
                      {val || "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RACI Legend */}
      <div style={{ padding: "12px 16px", background: C.lightBg, borderRadius: 10, fontSize: 12, color: C.muted, marginBottom: 24 }}>
        <strong>Légende :</strong>&nbsp;
        {[
          ["R", "Responsable – exécute"],
          ["A", "Approbateur – valide"],
          ["C", "Consulté – donne avis"],
          ["I", "Informé – reçoit info"]
        ].map(([k, v]) => {
          const style = getRaciStyle(k);
          return (
            <span key={k} style={{ marginRight: 14 }}>
              <span style={{
                padding: "1px 7px",
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 11,
                background: style.background,
                color: style.color,
                border: `1px solid ${style.borderColor}`
              }}>
                {k}
              </span>
              &nbsp;{v}
            </span>
          );
        })}
      </div>

      <div style={S.divider} />

      <SectionHeader
        num="2"
        title="Historique des révisions"
        sub="Suivi des modifications et versions du processus"
      />

      <table style={S.table}>
        <thead>
          <tr>
            {["Version", "Date", "Auteur", "Modifications", "Statut"].map((h) => (
              <th key={h} style={S.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              v: `PROC-${String(baseNum).padStart(3, '0')}2.1`,
              d: "27/03/2026",
              a: "Ryma Felkir",
              m: "Mise à jour des KPIs et ajout des nouvelles étapes",
              s: "Approuvé",
            },
            {
              v: `PROC-${String(baseNum).padStart(3, '0')}2.0`,
              d: "15/01/2026",
              a: "Ryma Felkir",
              m: "Refonte complète du processus",
              s: "Archivé",
            },
            {
              v: `PROC-${String(baseNum).padStart(3, '0')}1.0`,
              d: "10/09/2025",
              a: "Admin Système",
              m: "Création initiale",
              s: "Archivé",
            },
          ].map((h, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.lightBg }}>
              <td style={S.td}>
                <span style={{ fontWeight: 700, color: C.primary }}>{h.v}</span>
              </td>
              <td style={S.td}>{h.d}</td>
              <td style={S.td}>{h.a}</td>
              <td style={S.td}>{h.m}</td>
              <td style={S.td}>
                <StatusBadge statut={h.s} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── TAB 2 — Éléments Clés ── */
const Tab2 = ({ processus }) => (
  <div>
    <SectionHeader
      num="2"
      title="Éléments Clés du Processus"
      sub="Flux, ressources, compétences et indicateurs de performance"
    />

    {/* Délai + Coût */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          background: C.accent,
          borderRadius: 12,
          padding: "15px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
          Délai globale
        </span>
        <span
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontWeight: 800,
            fontSize: 15,
            color: C.dark,
          }}
        >
          {processus.periode}
        </span>
      </div>
      <div
        style={{
          background: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: 12,
          padding: "15px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#78350f" }}>
          Coût estimé
        </span>
        <span
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#78350f",
          }}
        >
          {processus.coutEstime}
        </span>
      </div>
    </div>

    {/* Flux */}
    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: C.text,
        marginBottom: 12,
      }}
    >
      Flux d'entrées / sorties
    </div>
    <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
      <div
        style={{
          flex: 1,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "12px 0 0 12px",
          padding: "16px 18px",
          minHeight: 120,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          ↙ Entrées
        </div>
        {processus.fluxEntrees.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 7,
            }}
          >
            <span style={{ color: C.accent, flexShrink: 0 }}>→</span>
            <span style={{ fontSize: 13, color: C.text }}>{f}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          width: 48,
          background: C.lightBg,
          border: `1px solid ${C.border}`,
          borderLeft: "none",
          borderRight: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18"
            stroke={C.muted}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "0 12px 12px 0",
          padding: "16px 18px",
          minHeight: 120,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Sorties ↗
        </div>
        {processus.fluxSorties.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 7,
            }}
          >
            <span style={{ color: C.accent, flexShrink: 0 }}>→</span>
            <span style={{ fontSize: 13, color: C.text }}>{f}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Infos tableau */}
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 24,
      }}
    >
      <InfoRow label="Clients (bénéficiaires)...">
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {processus.clients.map((c, i) => (
            <span key={i}>· {c}</span>
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Effectifs impliqués...">
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {processus.effectifs.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Compétences clés...">
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 2 }}
        >
          {processus.competences.map((c, i) => (
            <Chip key={i} text={c} />
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Ressources matérielles...">
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 2 }}
        >
          {processus.ressourcesMat.map((r, i) => (
            <Chip
              key={i}
              text={r}
              bg="#eff6ff"
              color="#1d4ed8"
              border="#bfdbfe"
            />
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Ressources logicielles..." last>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 2 }}
        >
          {processus.ressourcesLog.map((r, i) => (
            <Chip
              key={i}
              text={r}
              bg="#fdf4ff"
              color="#7e22ce"
              border="#e9d5ff"
            />
          ))}
        </div>
      </InfoRow>
    </div>

    {/* KPIs */}
    <div style={S.divider} />
    <SectionHeader
      num="2b"
      title="KPIs — Indicateurs de Performance"
      sub="Valeurs cibles, seuils d'alerte et responsables de suivi"
    />

    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {processus.kpis.map((kpi, i) => (
        <div
          key={i}
          style={{
            background: kpi.couleur,
            borderRadius: 14,
            border: `1px solid ${kpi.couleurTexte}22`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: `1px solid ${kpi.couleurTexte}18`,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: kpi.couleurTexte,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {kpi.nom}
            </span>
            <Chip
              text={kpi.frequence}
              bg="rgba(255,255,255,0.6)"
              color={kpi.couleurTexte}
              border={kpi.couleurTexte + "33"}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 0,
            }}
          >
            {[
              { label: "Valeur cible", value: kpi.valeurCible, big: true },
              { label: "Seuil d'alerte", value: kpi.seuilAlerte },
              { label: "Unité", value: kpi.unite },
              { label: "Responsable", value: kpi.responsable },
            ].map((f, j) => (
              <div
                key={j}
                style={{
                  padding: "12px 16px",
                  borderRight:
                    j < 3 ? `1px solid ${kpi.couleurTexte}15` : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: kpi.couleurTexte,
                    opacity: 0.65,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 6,
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontFamily: f.big
                      ? "'Outfit',sans-serif"
                      : "'Plus Jakarta Sans',sans-serif",
                    fontWeight: f.big ? 900 : 600,
                    fontSize: f.big ? 22 : 14,
                    color: kpi.couleurTexte,
                    lineHeight: 1.2,
                  }}
                >
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── TAB 3 — Contexte ── */
const Tab3 = ({ processus }) => (
  <div>
    <SectionHeader
      num="3"
      title="Contexte et Environnement"
      sub="Cartographie des processus voisins et facteurs contextuels"
    />

    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: C.text,
        marginBottom: 14,
      }}
    >
      Processus voisins
    </div>
    <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
      <div
        style={{
          flex: 1,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "12px 0 0 12px",
          padding: "16px 18px",
          minHeight: 140,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: C.lightBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "4px 10px",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>
            — AMONT
          </span>
        </div>
        {processus.processusAmont.map((p, i) => (
          <div
            key={i}
            style={{
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ color: C.primary, fontSize: 12 }}>←</span>
            <span style={{ fontSize: 13, color: C.text }}>{p}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          width: 48,
          background: C.lightBg,
          border: `1px solid ${C.border}`,
          borderLeft: "none",
          borderRight: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18"
            stroke={C.muted}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "0 12px 12px 0",
          padding: "16px 18px",
          minHeight: 140,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: C.lightBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "4px 10px",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>
            AVAL —
          </span>
        </div>
        {processus.processusAval.map((p, i) => (
          <div
            key={i}
            style={{
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: C.text }}>{p}</span>
            <span style={{ color: C.primary, fontSize: 12 }}>→</span>
          </div>
        ))}
      </div>
    </div>

    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 24,
      }}
    >
      <InfoRow label="Enjeux stratégiques">
        <span style={{ lineHeight: 1.7 }}>{processus.enjeuxStrategiques}</span>
      </InfoRow>
      <InfoRow label="Moyens alloués">
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {processus.moyensAlloues.map((m, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                background: "#e8f5e9",
                border: "1px solid #c8e6c9",
                borderRadius: 20,
                padding: "5px 14px",
                width: "fit-content",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>
                {m}
              </span>
            </div>
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Contraintes">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {processus.contraintes.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#f59e0b", fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 13, color: C.text }}>{c}</span>
            </div>
          ))}
        </div>
      </InfoRow>
      <InfoRow label="Risques identifiés" last>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {processus.risques.map((r, i) => {
            const palettes = [
              { bg: "#fef3c7", text: "#78350f", border: "#fde68a" },
              { bg: "#fee2e2", text: "#7f1d1d", border: "#fecaca" },
              { bg: "#d4e8f5", text: "#1a4a6b", border: "#bfdbfe" },
            ];
            const p = palettes[i % palettes.length];
            const crit = parseInt(r.probabilite) * parseInt(r.gravite);
            const critColor =
              crit >= 9 ? "#e53935" : crit >= 4 ? C.warn : "#4caf50";
            return (
              <div
                key={i}
                style={{
                  background: p.bg,
                  border: `1px solid ${p.border}`,
                  borderRadius: 20,
                  padding: "7px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: p.text }}>
                  {r.description}
                </span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: critColor,
                      background: critColor + "18",
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    C:{crit}
                  </span>
                  <span style={{ fontSize: 10, color: p.text, opacity: 0.7 }}>
                    {r.responsable}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </InfoRow>
    </div>
  </div>
);

/* ── TAB 4 — Documentation ── */
const Tab4 = ({ processus }) => {
  const handleFileDownload = (titre, format = "pdf") => {
    const content = `Document: ${titre}\n\nThis is a sample document for ${titre}.\n\nIn a real implementation, this would be an actual file from your server.\n\nDate: ${new Date().toLocaleDateString("fr-FR")}\nProcessus: ${processus.designation}`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${titre.toLowerCase().replace(/\s+/g, "_")}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={S.sectionHeader}>
        <div style={S.sectionNum}>1</div>
        <div>
          <div style={S.sectionTitle}>Informations Documentées</div>
          <div style={S.sectionSub}>
            Documents de référence et preuves de réalisation du processus
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.lightBg,
          padding: "16px 20px",
          borderRadius: 12,
          marginBottom: 28,
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          border: `1px solid ${C.border}`,
        }}
      >
        {processus.documentsDescription ||
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            fontFamily: "'Outfit', sans-serif",
            marginBottom: 8,
          }}
        >
          Documents de référence
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            marginBottom: 16,
          }}
        >
          Documents normatifs et de référence associés au processus (cliquez sur le titre pour télécharger)
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Titre / Description</th>
              <th style={S.th}>Format &amp; Support</th>
              <th style={S.th}>Revue &amp; Approbation</th>
              <th style={S.th}>Version</th>
            </tr>
          </thead>
          <tbody>
            {processus.documents.map((doc, i) => (
              <tr key={i}>
                <td style={S.td}>{doc.id}</td>
                <td 
                  style={{
                    ...S.td,
                    cursor: "pointer",
                    color: C.primary,
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                    fontWeight: 500,
                    transition: "color 0.2s",
                  }}
                  onClick={() => handleFileDownload(doc.titre, doc.format?.toLowerCase() || "pdf")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = C.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = C.primary;
                  }}
                >
                  {doc.titre}
                </td>
                <td style={S.td}>{doc.format}</td>
                <td style={S.td}>{doc.revue}</td>
                <td style={S.td}>{doc.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 28,
          fontSize: 12,
          color: C.muted,
        }}
      >
        Page 1 | 1
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: C.text,
            fontFamily: "'Outfit', sans-serif",
            marginBottom: 8,
          }}
        >
          Enregistrements (preuves de réalisation)
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            marginBottom: 16,
          }}
        >
          Traces et preuves de l'exécution du processus (cliquez pour télécharger)
        </div>
      </div>

      <div
        style={{
          background: C.lightBg,
          borderRadius: 12,
          padding: "20px 24px",
          border: `1px solid ${C.border}`,
        }}
      >
        {processus.preuves.map((preuve, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              borderBottom:
                i < processus.preuves.length - 1
                  ? `1px solid ${C.border}`
                  : "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() =>
              handleFileDownload(preuve.titre, preuve.format || "pdf")
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(119,213,143,0.1)";
              e.currentTarget.style.paddingLeft = "8px";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.paddingLeft = "0";
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.accent,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 14,
                color: C.primary,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontWeight: 500,
              }}
            >
              {preuve.titre}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: C.muted,
              }}
            >
              📄 {preuve.format || "PDF"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── TAB 5 — Dysfonctionnements ── */
const Tab5 = ({ processus }) => {
  const [dysfIndex, setDysfIndex] = useState(0);
  const dysfonctionnementsList = processus.dysfonctionnements || [];
  const currentDysf = dysfonctionnementsList[dysfIndex];

  const goToPrev = () => {
    setDysfIndex((prev) =>
      prev > 0 ? prev - 1 : dysfonctionnementsList.length - 1,
    );
  };

  const goToNext = () => {
    setDysfIndex((prev) =>
      prev < dysfonctionnementsList.length - 1 ? prev + 1 : 0,
    );
  };

  return (
    <div>
      <div style={S.sectionHeader}>
        <div style={S.sectionNum}>1</div>
        <div>
          <div style={S.sectionTitle}>Dysfonctionnements Majeurs Connus</div>
          <div style={S.sectionSub}>
            Recenser les problèmes récurrents et proposer des améliorations
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.lightBg,
          padding: "16px 20px",
          borderRadius: 12,
          marginBottom: 28,
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          border: `1px solid ${C.border}`,
        }}
      >
        {processus.dysfonctionnementsDescription ||
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
      </div>

      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: C.lightBg,
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.primary,
            }}
          >
            Dysfonctionnement #{dysfIndex + 1}: {currentDysf?.titre || ""}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={goToPrev}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.white,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: C.primary,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.lightBg;
                e.currentTarget.style.borderColor = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              ←
            </button>
            <button
              onClick={goToNext}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.white,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: C.primary,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.lightBg;
                e.currentTarget.style.borderColor = C.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              →
            </button>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td
                style={{
                  width: "200px",
                  padding: "14px 20px",
                  background: "#fafafa",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderRight: `1px solid ${C.border}`,
                }}
              >
                Description
              </td>
              <td
                style={{
                  padding: "14px 20px",
                  fontSize: 14,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                {currentDysf?.description}
              </td>
            </tr>

            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td
                style={{
                  width: "200px",
                  padding: "14px 20px",
                  background: "#fafafa",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderRight: `1px solid ${C.border}`,
                }}
              >
                Conséquences
              </td>
              <td
                style={{
                  padding: "14px 20px",
                  fontSize: 14,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                {currentDysf?.consequences}
              </td>
            </tr>

            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td
                style={{
                  width: "200px",
                  padding: "14px 20px",
                  background: "#fafafa",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderRight: `1px solid ${C.border}`,
                }}
              >
                Causes
              </td>
              <td
                style={{
                  padding: "14px 20px",
                  fontSize: 14,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                {currentDysf?.causes}
              </td>
            </tr>

            <tr>
              <td
                style={{
                  width: "200px",
                  padding: "14px 20px",
                  background: "#fafafa",
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderRight: `1px solid ${C.border}`,
                  verticalAlign: "top",
                }}
              >
                Améliorations proposées
              </td>
              <td
                style={{
                  padding: "14px 20px",
                  fontSize: 14,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                {currentDysf?.ameliorations && (
                  <div style={{ marginTop: 4 }}>
                    {currentDysf.ameliorations.split("\n").map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ color: C.primary }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        {dysfonctionnementsList.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setDysfIndex(idx)}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "none",
              background: idx === dysfIndex ? C.primary : C.border,
              cursor: "pointer",
              padding: 0,
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ── TAB 6 — Déroulement ── */
const Tab6 = ({ processus }) => (
  <div>
    <SectionHeader
      num="6"
      title="Déroulement et Modélisation"
      sub="Étapes chronologiques du processus"
    />

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {processus.etapes.map((e, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 0,
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 52,
              background: `linear-gradient(180deg, ${C.primary}, ${C.dark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: 20,
                color: "#fff",
              }}
            >
              {e.numero}
            </span>
          </div>
          <div style={{ flex: 1, padding: "14px 18px" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.primary,
                marginBottom: 10,
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {e.nom}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))",
                gap: "8px 16px",
                marginBottom: 8,
              }}
            >
              {[
                { label: "Acteur", value: e.acteur },
                { label: "Durée", value: e.duree },
                { label: "Entrée", value: e.entree },
                { label: "Sortie", value: e.sortie },
                { label: "Document", value: e.document },
              ].map((f) => (
                <div key={f.label}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 2,
                    }}
                  >
                    {f.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.text }}>{f.value}</div>
                </div>
              ))}
            </div>
            {e.description && (
              <div
                style={{
                  fontSize: 12,
                  color: C.muted,
                  lineHeight: 1.6,
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8,
                }}
              >
                {e.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    <div style={S.divider} />
    <SectionHeader
      num="6b"
      title="Cartographie BPMN"
      sub="Diagramme de flux du processus"
    />
    <BpmnEditor
      initialData={BPMN_SAMPLE}
      onChange={(data) => console.log("BPMN updated:", data)}
    />
  </div>
);

/* ── TAB 7 — Non-conformité et action ── */
const Tab7 = ({ processus }) => {
  const [ncData, setNcData] = useState(INIT_NC);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("Tous");
  const [graviteFilter, setGraviteFilter] = useState("Tous");

  const statuts = ["Tous", "ouvert", "en_cours", "clos"];
  const gravites = ["Tous", "Mineure", "Majeure", "Critique"];

  const getStatutLabel = (statut) => {
    const labels = {
      ouvert: "Ouvert",
      en_cours: "En cours",
      clos: "Clos",
    };
    return labels[statut] || statut;
  };

  const getStatutStyle = (statut) => {
    const styles = {
      ouvert: { background: "#fee2e2", color: "#991b1b" },
      en_cours: { background: "#fef3c7", color: "#92400e" },
      clos: { background: "#dcfce7", color: "#166534" },
    };
    return styles[statut] || styles.ouvert;
  };

  const getGraviteStyle = (gravite) => {
    const styles = {
      Mineure: { background: "#f3f4f6", color: "#6b7280" },
      Majeure: { background: "#fef3c7", color: "#92400e" },
      Critique: { background: "#fee2e2", color: "#991b1b" },
    };
    return styles[gravite] || styles.Mineure;
  };

  const filtered = ncData.filter((nc) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        nc.ref.toLowerCase().includes(q) ||
        nc.titre.toLowerCase().includes(q) ||
        nc.responsable.toLowerCase().includes(q)) &&
      (statutFilter === "Tous" || nc.statut === statutFilter) &&
      (graviteFilter === "Tous" || nc.gravite === graviteFilter)
    );
  });

  return (
    <div>
      <SectionHeader
        num="7"
        title="Non-conformités et Actions"
        sub="Suivi des non-conformités identifiées et des actions correctives associées"
      />

      {/* Description text */}
      <div
        style={{
          background: C.lightBg,
          padding: "16px 20px",
          borderRadius: 12,
          marginBottom: 28,
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          border: `1px solid ${C.border}`,
        }}
      >
        Cette section recense l'ensemble des non-conformités identifiées lors des audits internes et externes,
        ainsi que les actions correctives mises en place pour y remédier. Chaque non-conformité est suivie
        jusqu'à sa clôture complète.
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f3f5f7",
            border: "1px solid #e8eaed",
            borderRadius: 10,
            padding: "6px 12px",
            flex: 1,
            minWidth: 180,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c4c8d1"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5L21 21" />
          </svg>
          <input
            placeholder="Rechercher une non-conformité…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "13px",
              color: "#333",
              width: "100%",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
          {search && (
            <span
              onClick={() => setSearch("")}
              style={{
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, alignSelf: "center" }}>Statut:</span>
          {statuts.map((s) => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1.5px solid ${statutFilter === s ? C.primary : C.border}`,
                background: statutFilter === s ? C.primary : "white",
                color: statutFilter === s ? "white" : C.muted,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {s === "Tous" ? "Tous" : getStatutLabel(s)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, alignSelf: "center" }}>Gravité:</span>
          {gravites.map((g) => (
            <button
              key={g}
              onClick={() => setGraviteFilter(g)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1.5px solid ${graviteFilter === g ? C.primary : C.border}`,
                background: graviteFilter === g ? C.primary : "white",
                color: graviteFilter === g ? "white" : C.muted,
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* NC Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Réf.</th>
              <th style={S.th}>Titre / Description</th>
              <th style={S.th}>Clause ISO</th>
              <th style={S.th}>Gravité</th>
              <th style={S.th}>Statut</th>
              <th style={S.th}>Responsable</th>
              <th style={S.th}>Date limite</th>
              <th style={S.th}>Action corrective</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
                  Aucune non-conformité trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((nc, i) => {
                const statutStyle = getStatutStyle(nc.statut);
                const graviteStyle = getGraviteStyle(nc.gravite);
                return (
                  <tr
                    key={nc.id}
                    style={{
                      background: i % 2 === 0 ? C.white : C.lightBg,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f7fbf8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = i % 2 === 0 ? C.white : C.lightBg;
                    }}
                  >
                    <td style={S.td}>
                      <span style={{ fontWeight: 700, color: C.primary }}>{nc.ref}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 500 }}>{nc.titre}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, color: C.muted }}>{nc.clause}</span>
                    </td>
                    <td style={S.td}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: graviteStyle.background,
                          color: graviteStyle.color,
                        }}
                      >
                        {nc.gravite}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: statutStyle.background,
                          color: statutStyle.color,
                        }}
                      >
                        {getStatutLabel(nc.statut)}
                      </span>
                    </td>
                    <td style={S.td}>{nc.responsable}</td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12 }}>
                        {new Date(nc.dateLimit).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, color: nc.action ? C.text : C.muted }}>
                        {nc.action || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div
        style={{
          padding: "clamp(11px,1.2vw,14px) 0",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 16,
        }}
      >
        <span
          style={{
            fontSize: "clamp(10.5px,1vw,12px)",
            color: "#9ca3af",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          Affichage de <b style={{ color: "#374151" }}>{filtered.length}</b>{" "}
          / <b style={{ color: "#374151" }}>{ncData.length}</b> non-conformités
        </span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   BPMN EDITOR
═══════════════════════════════════════════════════════════════════ */
const NODE_COLORS = {
  task: { fill: "#B5D4F4", stroke: "#185FA5", text: "#0C447C" },
  start: { fill: "#C0DD97", stroke: "#3B6D11", text: "#27500A" },
  end: { fill: "#F7C1C1", stroke: "#A32D2D", text: "#791F1F" },
  gateway: { fill: "#FAC775", stroke: "#854F0B", text: "#633806" },
};

const BPMN_SAMPLE = {
  lanes: [
    { id: "l1", label: "Direction", h: 110 },
    { id: "l2", label: "Chef Dept.", h: 110 },
    { id: "l3", label: "Étudiant", h: 110 },
  ],
  nodes: [
    { id: "n1", type: "start", x: 110, y: 95, label: "Début", lane: "l1" },
    {
      id: "n2",
      type: "task",
      x: 240,
      y: 95,
      label: "Appel à sujets",
      lane: "l1",
    },
    {
      id: "n3",
      type: "gateway",
      x: 380,
      y: 95,
      label: "Validation",
      lane: "l1",
    },
    {
      id: "n4",
      type: "task",
      x: 380,
      y: 205,
      label: "Attribution sujet",
      lane: "l2",
    },
    {
      id: "n5",
      type: "task",
      x: 520,
      y: 205,
      label: "Encadrement",
      lane: "l2",
    },
    {
      id: "n6",
      type: "task",
      x: 520,
      y: 315,
      label: "Rédaction PFE",
      lane: "l3",
    },
    {
      id: "n7",
      type: "task",
      x: 660,
      y: 315,
      label: "Dépôt mémoire",
      lane: "l3",
    },
    {
      id: "n8",
      type: "task",
      x: 660,
      y: 205,
      label: "Jury & soutenance",
      lane: "l2",
    },
    { id: "n9", type: "end", x: 800, y: 205, label: "Fin", lane: "l2" },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2", label: "" },
    { id: "e2", from: "n2", to: "n3", label: "" },
    { id: "e3", from: "n3", to: "n4", label: "Approuvé" },
    { id: "e4", from: "n4", to: "n5", label: "" },
    { id: "e5", from: "n5", to: "n6", label: "" },
    { id: "e6", from: "n6", to: "n7", label: "" },
    { id: "e7", from: "n7", to: "n8", label: "" },
    { id: "e8", from: "n8", to: "n9", label: "" },
  ],
};

function bpmnNodeW(label) {
  return Math.max(90, label.length * 7 + 24);
}
function bpmnMakeId() {
  return "n" + Math.random().toString(36).slice(2, 7);
}
function bpmnMakeLaneId() {
  return "l" + Math.random().toString(36).slice(2, 7);
}

function BpmnNodeShape({
  node,
  selected,
  onMouseDown,
  onMouseUp,
  onHandleMouseDown,
}) {
  const col = NODE_COLORS[node.type];
  const sw = selected ? 2.5 : 1.5;

  const shared = {
    style: { cursor: "pointer" },
    onMouseDown: (e) => onMouseDown(e, node.id),
    onMouseUp: (e) => onMouseUp(e, node.id),
  };

  if (node.type === "start")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <circle r={18} fill={col.fill} stroke={col.stroke} strokeWidth={sw} />
        <circle r={12} fill="none" stroke={col.stroke} strokeWidth={1} />
        <text
          y={32}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle
          cx={18}
          cy={0}
          strokeColor={col.stroke}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, node.id);
          }}
        />
      </g>
    );

  if (node.type === "end")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <circle r={18} fill={col.fill} stroke={col.stroke} strokeWidth={sw} />
        <circle r={10} fill={col.stroke} />
        <text
          y={32}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle
          cx={-18}
          cy={0}
          strokeColor={col.stroke}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, node.id);
          }}
        />
      </g>
    );

  if (node.type === "gateway")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <polygon
          points="0,-24 24,0 0,24 -24,0"
          fill={col.fill}
          stroke={col.stroke}
          strokeWidth={sw}
        />
        <text
          y={5}
          textAnchor="middle"
          fontSize={13}
          fill={col.text}
          fontWeight="700"
          fontFamily="sans-serif"
        >
          ?
        </text>
        <text
          y={40}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle
          cx={24}
          cy={0}
          strokeColor={col.stroke}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, node.id);
          }}
        />
        <Handle
          cx={-24}
          cy={0}
          strokeColor={col.stroke}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, node.id);
          }}
        />
        <Handle
          cx={0}
          cy={24}
          strokeColor={col.stroke}
          onMouseDown={(e) => {
            e.stopPropagation();
            onHandleMouseDown(e, node.id);
          }}
        />
      </g>
    );

  const w = bpmnNodeW(node.label),
    h = 40;
  const words = node.label.split(" ");
  let lines = [],
    cur = "";
  words.forEach((word) => {
    const t = cur ? cur + " " + word : word;
    if (t.length > 13) {
      if (cur) lines.push(cur);
      cur = word;
    } else cur = t;
  });
  if (cur) lines.push(cur);
  const ty = lines.length > 1 ? -6 : 5;

  return (
    <g transform={`translate(${node.x},${node.y})`} {...shared}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={6}
        fill={col.fill}
        stroke={col.stroke}
        strokeWidth={sw}
      />
      {lines.map((l, i) => (
        <text
          key={i}
          y={ty + i * 14}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {l}
        </text>
      ))}
      <Handle
        cx={w / 2}
        cy={0}
        strokeColor={col.stroke}
        onMouseDown={(e) => {
          e.stopPropagation();
          onHandleMouseDown(e, node.id);
        }}
      />
      <Handle
        cx={-w / 2}
        cy={0}
        strokeColor={col.stroke}
        onMouseDown={(e) => {
          e.stopPropagation();
          onHandleMouseDown(e, node.id);
        }}
      />
      <Handle
        cx={0}
        cy={h / 2}
        strokeColor={col.stroke}
        onMouseDown={(e) => {
          e.stopPropagation();
          onHandleMouseDown(e, node.id);
        }}
      />
      <Handle
        cx={0}
        cy={-h / 2}
        strokeColor={col.stroke}
        onMouseDown={(e) => {
          e.stopPropagation();
          onHandleMouseDown(e, node.id);
        }}
      />
    </g>
  );
}

function BpmnEditor({ onChange, initialData }) {
  const [bNodes, setBNodes] = useState(
    () => initialData?.nodes ?? BPMN_SAMPLE.nodes,
  );
  const [bEdges, setBEdges] = useState(
    () => initialData?.edges ?? BPMN_SAMPLE.edges,
  );
  const [bLanes, setBLanes] = useState(
    () => initialData?.lanes ?? BPMN_SAMPLE.lanes,
  );
  const [bSelected, setBSelected] = useState(null);
  const [bMode, setBMode_] = useState("select");
  const [bConnectFrom, setBConnectFrom] = useState(null);
  const [bZoom, setBZoom] = useState(1);
  const [bPan, setBPan] = useState({ x: 0, y: 0 });
  const [editingEdge, setEditingEdge] = useState(null);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [laneInput, setLaneInput] = useState("");

  const dragRef = useRef(null);
  const panRef = useRef(null);
  const movedRef = useRef(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    onChange?.({ nodes: bNodes, edges: bEdges, lanes: bLanes });
  }, [bNodes, bEdges, bLanes, onChange]);

  const selNode = bNodes.find((n) => n.id === bSelected);
  const inputKey = `node-${bSelected || 'none'}`;

  const svgCoords = useCallback(
    (e) => {
      const r = wrapRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - r.left - bPan.x) / bZoom,
        y: (e.clientY - r.top - bPan.y) / bZoom,
      };
    },
    [bPan, bZoom],
  );

  function setBMode(m) {
    setBMode_(m);
    setBConnectFrom(null);
  }

  function addBNode(type) {
    const id = bpmnMakeId();
    const labels = {
      task: "Tâche",
      start: "Début",
      end: "Fin",
      gateway: "Décision",
    };
    setBNodes((p) => [
      ...p,
      {
        id,
        type,
        x: 200 + Math.random() * 300,
        y: 80 + Math.random() * 250,
        label: labels[type],
        lane: null,
      },
    ]);
    setBSelected(id);
  }

  function addBLane() {
    setBLanes((p) => [
      ...p,
      { id: bpmnMakeLaneId(), label: "Acteur " + (p.length + 1), h: 110 },
    ]);
  }

  function deleteBSelected() {
    if (!bSelected) return;
    setBNodes((p) => p.filter((n) => n.id !== bSelected));
    setBEdges((p) =>
      p.filter((e) => e.from !== bSelected && e.to !== bSelected),
    );
    setBSelected(null);
  }

  function clearBAll() {
    if (!window.confirm("Réinitialiser le diagramme ?")) return;
    setBNodes([]);
    setBEdges([]);
    setBLanes([]);
    setBSelected(null);
  }

  function loadBSample() {
    setBNodes(BPMN_SAMPLE.nodes);
    setBEdges(BPMN_SAMPLE.edges);
    setBLanes(BPMN_SAMPLE.lanes);
    setBSelected(null);
    setBPan({ x: 0, y: 0 });
    setBZoom(1);
  }

  function onNodeMouseDown(e, id) {
    e.stopPropagation();
    if (bMode === "connect") {
      if (!bConnectFrom) {
        setBConnectFrom(id);
        return;
      }
      if (bConnectFrom !== id)
        setBEdges((p) => [
          ...p,
          { id: bpmnMakeId(), from: bConnectFrom, to: id, label: "" },
        ]);
      setBConnectFrom(null);
      setBMode("select");
      return;
    }
    if (bMode === "select") {
      const n = bNodes.find((n) => n.id === id);
      const c = svgCoords(e);
      dragRef.current = { id, offX: c.x - n.x, offY: c.y - n.y };
      movedRef.current = false;
    }
  }

  function onNodeMouseUp(e, id) {
    e.stopPropagation();
    if (!movedRef.current) setBSelected(id);
    dragRef.current = null;
    movedRef.current = false;
  }

  function onHandleMouseDown(e, id) {
    e.stopPropagation();
    setBConnectFrom(id);
    setBMode_("connect");
  }

  function onCanvasMouseDown(e) {
    if (
      e.target.tagName.toLowerCase() === "svg" ||
      e.target === wrapRef.current
    ) {
      setBSelected(null);
      setBConnectFrom(null);
    }
    if (bMode === "pan")
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: bPan.x,
        originY: bPan.y,
      };
  }

  function onCanvasMouseMove(e) {
    if (dragRef.current && bMode === "select") {
      movedRef.current = true;
      const c = svgCoords(e);
      const { id, offX, offY } = dragRef.current;
      setBNodes((p) =>
        p.map((n) =>
          n.id === id ? { ...n, x: c.x - offX, y: c.y - offY } : n,
        ),
      );
    }
    if (panRef.current)
      setBPan({
        x: panRef.current.originX + (e.clientX - panRef.current.startX),
        y: panRef.current.originY + (e.clientY - panRef.current.startY),
      });
  }

  function onCanvasMouseUp() {
    dragRef.current = null;
    panRef.current = null;
    movedRef.current = false;
  }

  function onWheel(e) {
    e.preventDefault();
    setBZoom((z) =>
      Math.min(2.5, Math.max(0.25, z + (e.deltaY < 0 ? 0.08 : -0.08))),
    );
  }

  function onEdgeClick(e, edgeId) {
    e.stopPropagation();
    const ed = bEdges.find((x) => x.id === edgeId);
    setEditingEdge(edgeId);
    setEdgeLabel(ed?.label || "");
  }

  function confirmEdgeLabel() {
    setBEdges((p) =>
      p.map((e) => (e.id === editingEdge ? { ...e, label: edgeLabel } : e)),
    );
    setEditingEdge(null);
  }

  const computedLanes = bLanes.map((l, i) => ({
    ...l,
    y: 40 + bLanes.slice(0, i).reduce((a, x) => a + x.h, 0),
  }));
  const totalLaneH = computedLanes.reduce((a, l) => a + l.h, 0);

  const tbtn = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 11px",
    borderRadius: 8,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.lightBg : C.white,
    color: active ? C.primary : C.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  });
  const sep = {
    width: 1,
    height: 22,
    background: C.border,
    margin: "0 4px",
    flexShrink: 0,
  };
  const pinp = {
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.white,
    fontSize: 12,
    color: C.text,
    width: 150,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const psel = {
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.white,
    fontSize: 12,
    color: C.text,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const cursors = { select: "default", pan: "grab", connect: "crosshair" };

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        background: C.white,
      }}
    >
      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          gap: 5,
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: "#f7fbf8",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          style={tbtn(bMode === "select")}
          onClick={() => setBMode("select")}
        >
          ↖ Sélection
        </button>
        <button style={tbtn(bMode === "pan")} onClick={() => setBMode("pan")}>
          ✥ Déplacer
        </button>
        <button
          style={tbtn(bMode === "connect")}
          onClick={() => setBMode("connect")}
        >
          → Connecter
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={() => addBNode("task")}>
          ▭ Tâche
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("start")}>
          ● Début
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("end")}>
          ◉ Fin
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("gateway")}>
          ◆ Passerelle
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={addBLane}>
          ⊞ Lane
        </button>
        <button
          style={{ ...tbtn(false), color: C.danger }}
          onClick={deleteBSelected}
        >
          ✕ Supprimer
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={loadBSample}>
          ↺ Exemple PFE
        </button>
        <button style={{ ...tbtn(false), color: C.muted }} onClick={clearBAll}>
          🗑 Vider
        </button>
        {bConnectFrom && (
          <span
            style={{
              fontSize: 11,
              color: C.primary,
              fontWeight: 700,
              background: C.lightBg,
              padding: "4px 10px",
              borderRadius: 8,
              marginLeft: 4,
            }}
          >
            → Cliquez sur le nœud cible
          </span>
        )}
      </div>

      {/* CANVAS */}
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          height: 490,
          background: "#f9fdfb",
          overflow: "hidden",
          cursor: cursors[bMode],
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onWheel={onWheel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <marker
              id="bpmnarr"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0,0 8,3.5 0,7" fill={C.muted} />
            </marker>
            <marker
              id="bpmnarrsel"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0,0 8,3.5 0,7" fill="#378ADD" />
            </marker>
          </defs>
          <g transform={`translate(${bPan.x},${bPan.y}) scale(${bZoom})`}>
            {computedLanes.length > 0 && (
              <>
                <rect
                  x={0}
                  y={40}
                  width={1050}
                  height={totalLaneH}
                  rx={6}
                  fill="none"
                  stroke={C.border}
                  strokeWidth={1.5}
                />
                {computedLanes.map((l, i) => (
                  <g key={l.id}>
                    {i > 0 && (
                      <line
                        x1={0}
                        y1={l.y}
                        x2={1050}
                        y2={l.y}
                        stroke={C.border}
                        strokeWidth={1}
                        strokeDasharray="5 4"
                      />
                    )}
                    <rect
                      x={0}
                      y={l.y}
                      width={60}
                      height={l.h}
                      fill={C.lightBg}
                      stroke={C.border}
                      strokeWidth={1}
                    />
                    <text
                      transform={`translate(28,${l.y + l.h / 2}) rotate(-90)`}
                      textAnchor="middle"
                      fontSize={10}
                      fill={C.muted}
                      fontWeight={600}
                      fontFamily="sans-serif"
                    >
                      {l.label}
                    </text>
                  </g>
                ))}
              </>
            )}
            {bEdges.map((e) => {
              const from = bNodes.find((n) => n.id === e.from);
              const to = bNodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const sel = bSelected === e.from || bSelected === e.to;
              return (
                <g key={e.id}>
                  <path
                    d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
                    stroke="transparent"
                    strokeWidth={14}
                    fill="none"
                    style={{ cursor: "pointer" }}
                    onClick={(ev) => onEdgeClick(ev, e.id)}
                  />
                  <path
                    d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
                    stroke={sel ? "#378ADD" : C.muted}
                    strokeWidth={sel ? 2 : 1.5}
                    fill="none"
                    markerEnd={`url(#bpmnarr${sel ? "sel" : ""})`}
                    style={{ pointerEvents: "none" }}
                  />
                  {e.label && (
                    <text
                      x={mx}
                      y={(from.y + to.y) / 2 - 6}
                      textAnchor="middle"
                      fontSize={9}
                      fill={C.muted}
                      fontFamily="sans-serif"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {bNodes.map((n) => (
              <BpmnNodeShape
                key={n.id}
                node={n}
                selected={n.id === bSelected}
                onMouseDown={onNodeMouseDown}
                onMouseUp={onNodeMouseUp}
                onHandleMouseDown={onHandleMouseDown}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* PROPRIÉTÉS */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${C.border}`,
          background: "#f7fbf8",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 12,
          minHeight: 44,
        }}
      >
        {selNode ? (
          <>
            <span style={{ color: C.muted }}>Libellé :</span>
            <input
              key={`label-${inputKey}`}
              style={pinp}
              defaultValue={selNode?.label || ""}
              onChange={(e) => setLabelInput(e.target.value)}
              onBlur={() => {
                if (selNode) {
                  setBNodes((p) =>
                    p.map((n) =>
                      n.id === bSelected ? { ...n, label: labelInput } : n,
                    ),
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selNode) {
                  setBNodes((p) =>
                    p.map((n) =>
                      n.id === bSelected ? { ...n, label: labelInput } : n,
                    ),
                  );
                }
              }}
            />
            <span style={{ color: C.muted }}>Lane :</span>
            <select
              key={`lane-${inputKey}`}
              style={psel}
              defaultValue={selNode?.lane || ""}
              onChange={(e) => {
                setLaneInput(e.target.value);
                setBNodes((p) =>
                  p.map((n) =>
                    n.id === bSelected
                      ? { ...n, lane: e.target.value || null }
                      : n,
                  ),
                );
              }}
            >
              <option value="">— Aucune —</option>
              {bLanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              style={{ ...tbtn(false), color: C.danger, marginLeft: "auto" }}
              onClick={deleteBSelected}
            >
              ✕ Supprimer
            </button>
          </>
        ) : (
          <span style={{ color: C.muted, fontSize: 11 }}>
            Cliquez sur un nœud pour le modifier · Survolez un nœud pour les
            points de connexion
          </span>
        )}
      </div>

      {/* POPUP LABEL ARÊTE */}
      {editingEdge && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.lightBg,
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ color: C.muted }}>Libellé de la connexion :</span>
          <input
            autoFocus
            style={pinp}
            value={edgeLabel}
            onChange={(e) => setEdgeLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdgeLabel();
              if (e.key === "Escape") setEditingEdge(null);
            }}
          />
          <button
            style={{
              ...tbtn(true),
              background: C.primary,
              color: "#fff",
              borderColor: C.primary,
            }}
            onClick={confirmEdgeLabel}
          >
            ✓ OK
          </button>
          <button style={tbtn(false)} onClick={() => setEditingEdge(null)}>
            Annuler
          </button>
        </div>
      )}

      {/* ZOOM */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderTop: `1px solid ${C.border}`,
          background: "#f7fbf8",
          fontSize: 11,
          color: C.muted,
        }}
      >
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 14 }}
          onClick={() => setBZoom((z) => Math.max(0.25, z - 0.1))}
        >
          −
        </button>
        <input
          type="range"
          min={25}
          max={250}
          value={Math.round(bZoom * 100)}
          onChange={(e) => setBZoom(e.target.value / 100)}
          style={{ width: 100 }}
        />
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 14 }}
          onClick={() => setBZoom((z) => Math.min(2.5, z + 0.1))}
        >
          +
        </button>
        <span style={{ minWidth: 36 }}>{Math.round(bZoom * 100)}%</span>
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 11 }}
          onClick={() => {
            setBZoom(1);
            setBPan({ x: 0, y: 0 });
          }}
        >
          ↺ Réinitialiser vue
        </button>
        <div style={{ flex: 1 }} />
        <span>
          Mode :{" "}
          <strong>
            {
              {
                select: "Sélection",
                pan: "Déplacer vue",
                connect: "Connexion",
              }[bMode]
            }
          </strong>
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function FicheProcessus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const processus = PROCESSUS_DATA[id] || PROCESSUS_DATA[1];

  const tabContents = [
    <Tab1 key="tab1" processus={processus} />,
    <Tab2 key="tab2" processus={processus} />,
    <Tab3 key="tab3" processus={processus} />,
    <Tab4 key="tab4" processus={processus} />,
    <Tab5 key="tab5" processus={processus} />,
    <Tab6 key="tab6" processus={processus} />,
    <Tab7 key="tab7" processus={processus} />,
  ];

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#eaf5eb; }
        ::-webkit-scrollbar-thumb { background:#77D58F; border-radius:99px; }
        button { font-family:'Plus Jakarta Sans',sans-serif; }
        button:hover { opacity:0.88; cursor:pointer; }
      `}</style>

      <div style={S.main}>
        {/* Topbar - Using the imported component */}
        <Topbar 
          title={processus.designation}
          showBack={true}
          onBackClick={() => navigate("/processus")}
          userName="SILI Lyna"
          userRole="Admin"
          userInitials="SL"
          showNotifications={true}
        />

        {/* Content */}
        <div style={S.content}>
          {/* Header card */}
          <div style={S.headerCard}>
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                pointerEvents: "none",
              }}
            />
            <div style={S.headerCardBadges}>
              <span style={S.badge}>Code: {processus.identifiant}</span>
              <span style={{ ...S.badge, ...S.badgeGreen }}>
                {processus.typeProcessus}
              </span>
              <span style={S.badge}>Version: 2.1</span>
              <span style={S.badge}>Date: 27/03/2026</span>
            </div>
            <div style={S.headerCardBody}>
              <div style={S.headerCardLeft}>
                <div style={S.headerCardTitle}>{processus.designation}</div>
                <div style={S.headerCardDesc}>{processus.objectif}</div>
              </div>
              <div style={S.headerCardRight}>
                <div style={S.pilotBox}>
                  <div style={S.pilotLabel}>Pilote</div>
                  <div style={S.pilotName}>{processus.pilote}</div>
                  <div style={S.pilotEmail}>{processus.email}</div>
                </div>
                <div style={S.kpiRow}>
                  {[
                    { num: processus.kpis.length, lbl: "KPIs" },
                    { num: processus.dysfonctionnements?.length || 0, lbl: "Dysfonctionnements" },
                    { num: processus.risques.length, lbl: "Risques" },
                    { 
                      num: `${processus.niveauMaturite || 0}%`, 
                      lbl: "Niveau de maturité",
                    },
                  ].map((k) => (
                    <div key={k.lbl} style={S.kpiBox}>
                      <span style={S.kpiNum}>{k.num}</span>
                      <span style={S.kpiLbl}>{k.lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={S.tabsWrap}>
            <div style={S.tabsHeader}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  style={{
                    ...S.tab,
                    ...(activeTab === t.id ? S.tabActive : {}),
                  }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={S.tabContent}>{tabContents[activeTab]}</div>
          </div>
        </div>

        {/* Action bar */}
        <div style={S.actionBar}>
          <button
            type="button"
            style={S.btnBack}
            onClick={() => navigate("/processus")}
          >
            ← Retour à la liste
          </button>
          <button
            type="button"
            style={S.btnEdit}
            onClick={() => navigate(`/processus/${id}/modifier`)}
          >
            ✏️ Modifier le processus
          </button>
        </div>
      </div>
    </div>
  );
}