import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS (same as ProcessFormPage)
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
  headerCardBadges: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
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
  headerCardBody: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" },
  headerCardLeft: { flex: 1 },
  headerCardTitle: {
    fontSize: 26,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    marginBottom: 8,
    color: "#fff",
  },
  headerCardDesc: { fontSize: 13, opacity: 0.85, lineHeight: 1.6, maxWidth: 520 },
  headerCardRight: { display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" },
  pilotBox: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "12px 18px",
    textAlign: "right",
    minWidth: 160,
    border: "1px solid rgba(255,255,255,0.25)",
  },
  pilotLabel: { fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
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
  kpiLbl: { fontSize: 10, opacity: 0.75, textTransform: "uppercase", letterSpacing: 0.5 },
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
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 28px" },
  gridFull: { gridColumn: "1 / -1" },
  infoRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 0",
    borderBottom: `1px solid ${C.border}`,
  },
  label: { fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 14, color: C.text, lineHeight: 1.5 },
  tag: {
    background: C.lightBg,
    border: `1px solid ${C.accent}`,
    color: C.primary,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    marginRight: 6,
    marginBottom: 6,
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
  raciGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" },
  raciCard: {
    background: C.lightBg,
    borderRadius: 10,
    padding: "12px 16px",
    border: `1px solid ${C.border}`,
  },
  raciLabel: { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 6 },
  raciValue: { fontSize: 14, color: C.text, fontWeight: 500 },
  kpiCard: {
    background: C.lightBg,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: "16px 18px",
    marginBottom: 12,
  },
  kpiCardTitle: { fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 12 },
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
  actionBar: {
    background: C.white,
    borderTop: `1px solid ${C.border}`,
    padding: "16px 28px",
    display: "flex",
    justifyContent: "flex-end",
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
    transition: "all 0.2s",
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
    transition: "all 0.2s",
  },
};

const PROCESSUS_DATA = {
  1: {
    identifiant: "PROC-007",
    designation: "Gestion PFE",
    pilote: "M. Haddadou",
    email: "haddadou@esi.dz",
    telephone: "(225) 555-0118",
    sousDept: "Soutenances",
    typeProcessus: "Réalisation",
    objectif: "Organiser et piloter l'ensemble des activités liées aux projets de fin d'études : affectation des sujets, suivi des étudiants, planification et organisation des soutenances.",
    structures: ["Département Informatique", "Direction des études", "Jury de soutenance"],
    raci: {
      responsable: "Chef de département",
      approbateur: "Directeur des études", 
      consulte: "Enseignants PFE",
      informe: "Secrétariat",
    },
    periode: "Septembre → Juin",
    objectifStrategique: "Améliorer la qualité des PFEs et l'encadrement",
    fluxEntrees: ["Demandes de sujets", "CV étudiants", "Règlement"],
    fluxSorties: ["Sujets attribués", "Calendrier soutenances", "Rapports finaux"],
    clients: "Étudiants 5ème année, Entreprises partenaires",
    effectifs: "12 enseignants, 3 membres administratifs",
    competences: ["Encadrement", "Évaluation", "Communication"],
    ressourcesMat: ["Salles de soutenance", "Vidéoprojecteurs"],
    ressourcesLog: ["Plateforme PFE", "Teams"],
    kpis: [
      { nom: "Taux d'attribution", unite: "%", valeurCible: "100%", seuilAlerte: "<90%", frequence: "Mensuel", responsable: "Coordinateur" },
      { nom: "Taux de réussite", unite: "%", valeurCible: "≥95%", seuilAlerte: "<85%", frequence: "Semestriel", responsable: "Jury" },
    ],
    processusAmont: ["Recrutement étudiants", "Proposition sujets"],
    processusAval: ["Soutenance", "Délibération"],
    enjeuxStrategiques: "Améliorer l'insertion professionnelle des diplômés",
    moyensAlloues: ["Plateforme numérique", "Salles dédiées"],
    contraintes: ["Calendrier académique", "Capacité d'encadrement"],
    risques: [
      { description: "Sujets non attribués à temps", probabilite: "2", gravite: "3", mesure: "Suivi hebdomadaire", responsable: "Coordinateur" },
    ],
    documents: [
      { id: "DOC-001", titre: "Guide PFE", format: "PDF", version: "2.1", revue: "Validé", statut: "Approuvé" },
    ],
    preuves: [
      { titre: "PV de réunion", type: "Compte-rendu", date: "15/03/2026", responsable: "Secrétariat" },
    ],
    dysfonctionnements: [
      { titre: "Retard attribution sujets", description: "Sujets attribués en retard", consequences: "Stress étudiants", causes: "Peu propositions", ameliorations: "Lancement plus tôt", gravite: "Majeur", responsable: "Coordinateur", echeance: "2026-09", statut: "En cours" },
    ],
    etapes: [
      { numero: 1, nom: "Lancement appel à sujets", acteur: "Coordinateur", description: "Envoyer appel aux enseignants", entree: "Calendrier", sortie: "Liste sujets", duree: "2 semaines", document: "Formulaire" },
      { numero: 2, nom: "Dépôt des sujets", acteur: "Enseignants", description: "Déposer propositions", entree: "Template", sortie: "Sujets déposés", duree: "3 semaines", document: "Fiche sujet" },
      { numero: 3, nom: "Affectation étudiants", acteur: "Coordinateur", description: "Attribuer sujets aux étudiants", entree: "Préférences", sortie: "Planning", duree: "2 semaines", document: "Tableau affectation" },
      { numero: 4, nom: "Suivi PFE", acteur: "Encadrants", description: "Suivi hebdomadaire", entree: "Rapports", sortie: "Évaluations", duree: "6 mois", document: "Grille suivi" },
    ],
  },
};

const TABS = [
  { id: 0, label: "Informations et historique" },
  { id: 1, label: "Éléments clés" },
  { id: 2, label: "Contexte" },
  { id: 3, label: "Documentation" },
  { id: 4, label: "Dysfonctionnements" },
  { id: 5, label: "Déroulement" },
];

export default function FicheProcessus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  
  const processus = PROCESSUS_DATA[id];
  
  if (!processus) {
    return (
      <div style={styles.page}>
        <div style={styles.main}>
          <div style={styles.content}>
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <h2>Processus non trouvé</h2>
              <button onClick={() => navigate("/")} style={styles.btnBack}>Retour à l'accueil</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const completionPct = 85; // Calculate based on filled fields
  
  // Helper component for displaying label/value pairs
  const InfoField = ({ label, value }) => (
    <div style={styles.infoRow}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value || "—"}</div>
    </div>
  );
  
const Tab1 = () => (
  <div>
    {/* Informations section */}
    <div style={styles.sectionHeader}>
      <div style={styles.sectionNum}>1</div>
      <div>
        <div style={styles.sectionTitle}>Informations Générales</div>
        <div style={styles.sectionSub}>Données d'identification et de responsabilité du processus</div>
      </div>
    </div>
    
    <div style={styles.grid2}>
      <InfoField label="Identifiant processus" value={processus.identifiant} />
      <InfoField label="Type de processus" value={processus.typeProcessus} />
      <InfoField label="Désignation du processus" value={processus.designation} />
      <InfoField label="Pilote du processus" value={processus.pilote} />
      <InfoField label="Email" value={processus.email} />
      <InfoField label="Téléphone" value={processus.telephone} />
      <InfoField label="Sous-département" value={processus.sousDept} />
      <div style={styles.gridFull}>
        <InfoField label="Objectif du processus" value={processus.objectif} />
      </div>
    </div>
    
    {/* Structures concernées (displayed as tags/chips) */}
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <div style={styles.label}>Structures concernées</div>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {processus.structures.map((s, i) => (
          <span key={i} style={{
            background: C.lightBg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
          }}>
            {s}
          </span>
        ))}
      </div>
    </div>
    
    <div style={styles.divider} />
    
    {/* Historique des révisions section */}
    <div style={styles.sectionHeader}>
      <div style={styles.sectionNum}>2</div>
      <div>
        <div style={styles.sectionTitle}>Historique des révisions</div>
        <div style={styles.sectionSub}>Suivi des modifications du processus</div>
      </div>
    </div>
    
    {/* Version history table */}
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Version</th>
          <th style={styles.th}>Date</th>
          <th style={styles.th}>Auteur</th>
          <th style={styles.th}>Modifications</th>
          <th style={styles.th}>Statut</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={styles.td}>2.1</td>
          <td style={styles.td}>27/03/2026</td>
          <td style={styles.td}>Ryma Felkir</td>
          <td style={styles.td}>Mise à jour des KPIs et ajout des nouvelles étapes</td>
          <td style={styles.td}>
            <span style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>Approuvé</span>
          </td>
        </tr>
        <tr>
          <td style={styles.td}>2.0</td>
          <td style={styles.td}>15/01/2026</td>
          <td style={styles.td}>Ryma Felkir</td>
          <td style={styles.td}>Refonte complète du processus</td>
          <td style={styles.td}>
            <span style={{
              background: "#fef3c7",
              color: "#92400e",
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>Archivé</span>
          </td>
        </tr>
        <tr>
          <td style={styles.td}>1.0</td>
          <td style={styles.td}>10/09/2025</td>
          <td style={styles.td}>Admin Système</td>
          <td style={styles.td}>Création initiale</td>
          <td style={styles.td}>
            <span style={{
              background: "#f3f4f6",
              color: "#6b7280",
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}>Archivé</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);
  
  const Tab2 = () => (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>1</div>
        <div>
          <div style={styles.sectionTitle}>Éléments Clés du Processus</div>
          <div style={styles.sectionSub}>Flux, ressources, compétences et indicateurs de performance</div>
        </div>
      </div>
      
      <div style={styles.grid2}>
        <InfoField label="Période / Mois" value={processus.periode} />
        <InfoField label="Objectif stratégique" value={processus.objectifStrategique} />
        <InfoField label="Clients / Bénéficiaires" value={processus.clients} />
        <InfoField label="Effectifs impliqués" value={processus.effectifs} />
      </div>
      
      <div style={styles.divider} />
      
      <div style={styles.fluxBox}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>↙ Entrées</div>
          {processus.fluxEntrees.map((item, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>• {item}</div>
          ))}
        </div>
        <div style={styles.fluxArrow}>⇄</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Sorties ↗</div>
          {processus.fluxSorties.map((item, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>• {item}</div>
          ))}
        </div>
      </div>
      
      <div style={styles.grid2}>
        <div style={styles.gridFull}>
          <div style={styles.label}>Compétences clés</div>
          <div>
            {processus.competences.map((c, i) => (
              <span key={i} style={styles.tag}>{c}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={styles.label}>Ressources matérielles</div>
          <div>
            {processus.ressourcesMat.map((r, i) => (
              <span key={i} style={styles.tag}>{r}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={styles.label}>Ressources logicielles</div>
          <div>
            {processus.ressourcesLog.map((r, i) => (
              <span key={i} style={styles.tag}>{r}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div style={styles.divider} />
      
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>2</div>
        <div>
          <div style={styles.sectionTitle}>KPIs — Indicateurs de Performance</div>
        </div>
      </div>
      
      {processus.kpis.map((kpi, i) => (
        <div key={i} style={styles.kpiCard}>
          <div style={styles.kpiCardTitle}>KPI #{i + 1}: {kpi.nom}</div>
          <div style={styles.grid3}>
            <InfoField label="Unité" value={kpi.unite} />
            <InfoField label="Valeur cible" value={kpi.valeurCible} />
            <InfoField label="Seuil d'alerte" value={kpi.seuilAlerte} />
            <InfoField label="Fréquence" value={kpi.frequence} />
            <InfoField label="Responsable" value={kpi.responsable} />
          </div>
        </div>
      ))}
    </div>
  );
  
  const Tab3 = () => (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>1</div>
        <div>
          <div style={styles.sectionTitle}>Contexte et Environnement</div>
        </div>
      </div>
      
      <div style={styles.fluxBox}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>← Processus AMONT</div>
          {processus.processusAmont.map((item, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>• {item}</div>
          ))}
        </div>
        <div style={styles.fluxArrow}>⇄</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Processus AVAL →</div>
          {processus.processusAval.map((item, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>• {item}</div>
          ))}
        </div>
      </div>
      
      <InfoField label="Enjeux stratégiques" value={processus.enjeuxStrategiques} />
      
      <div style={styles.grid2}>
        <div>
          <div style={styles.label}>Moyens alloués</div>
          <div>
            {processus.moyensAlloues.map((m, i) => (
              <span key={i} style={styles.tag}>{m}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={styles.label}>Contraintes</div>
          <div>
            {processus.contraintes.map((c, i) => (
              <span key={i} style={styles.tag}>{c}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div style={styles.divider} />
      
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>2</div>
        <div>
          <div style={styles.sectionTitle}>Risques identifiés</div>
        </div>
      </div>
      
      {processus.risques.map((r, i) => {
        const crit = parseInt(r.probabilite) * parseInt(r.gravite);
        const critColor = crit >= 9 ? C.danger : crit >= 4 ? C.warn : "#4caf50";
        return (
          <div key={i} style={styles.riskCard}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={styles.kpiCardTitle}>Risque #{i + 1}</span>
              <span style={{ ...styles.critBadge, background: critColor + "22", color: critColor }}>
                Criticité : {crit}
              </span>
            </div>
            <div style={styles.grid2}>
              <div style={styles.gridFull}>
                <div style={styles.label}>Description</div>
                <div style={styles.value}>{r.description}</div>
              </div>
              <InfoField label="Probabilité" value={r.probabilite === "1" ? "Faible" : r.probabilite === "2" ? "Moyenne" : "Élevée"} />
              <InfoField label="Gravité" value={r.gravite === "1" ? "Mineure" : r.gravite === "2" ? "Modérée" : "Sévère"} />
              <div style={styles.gridFull}>
                <InfoField label="Mesure d'atténuation" value={r.mesure} />
              </div>
              <InfoField label="Responsable" value={r.responsable} />
            </div>
          </div>
        );
      })}
    </div>
  );
  
  const Tab4 = () => (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>1</div>
        <div>
          <div style={styles.sectionTitle}>Informations Documentées</div>
        </div>
      </div>
      
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: C.text }}>Documents de référence</div>
      <table style={styles.table}>
        <thead>
          <tr>
            {["ID", "Titre", "Format", "Version", "Revue & Approbation", "Statut"].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processus.documents.map((doc, i) => (
            <tr key={i}>
              <td style={styles.td}>{doc.id}</td>
              <td style={styles.td}>{doc.titre}</td>
              <td style={styles.td}>{doc.format}</td>
              <td style={styles.td}>{doc.version}</td>
              <td style={styles.td}>{doc.revue}</td>
              <td style={styles.td}>{doc.statut}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={styles.divider} />
      
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: C.text }}>Enregistrements / Preuves de réalisation</div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            {["Titre", "Type", "Date", "Responsable"].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processus.preuves.map((p, i) => (
            <tr key={i}>
              <td style={styles.td}>{p.titre}</td>
              <td style={styles.td}>{p.type}</td>
              <td style={styles.td}>{p.date}</td>
              <td style={styles.td}>{p.responsable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const Tab5 = () => (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>1</div>
        <div>
          <div style={styles.sectionTitle}>Dysfonctionnements Majeurs Connus</div>
        </div>
      </div>
      
      {processus.dysfonctionnements.map((d, i) => (
        <div key={i} style={styles.dysfCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 16 }}>Dysfonctionnement #{i + 1}: {d.titre}</div>
          <div style={styles.grid2}>
            <div style={styles.gridFull}>
              <InfoField label="Description" value={d.description} />
            </div>
            <div style={styles.gridFull}>
              <InfoField label="Conséquences" value={d.consequences} />
            </div>
            <div style={styles.gridFull}>
              <InfoField label="Causes identifiées" value={d.causes} />
            </div>
            <div style={styles.gridFull}>
              <InfoField label="Améliorations proposées" value={d.ameliorations} />
            </div>
            <InfoField label="Gravité" value={d.gravite} />
            <InfoField label="Responsable" value={d.responsable} />
            <InfoField label="Échéance" value={d.echeance} />
            <InfoField label="Statut" value={d.statut} />
          </div>
        </div>
      ))}
    </div>
  );
  
  const Tab6 = () => (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>1</div>
        <div>
          <div style={styles.sectionTitle}>Déroulement et Modélisation</div>
        </div>
      </div>
      
      {processus.etapes.map((etape, i) => (
        <div key={i} style={styles.etapeCard}>
          <div style={styles.etapeNum}>{etape.numero}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 12 }}>Étape {etape.numero}: {etape.nom}</div>
            <div style={styles.grid3}>
              <InfoField label="Acteur responsable" value={etape.acteur} />
              <InfoField label="Durée estimée" value={etape.duree} />
              <InfoField label="Entrée" value={etape.entree} />
              <InfoField label="Sortie" value={etape.sortie} />
              <InfoField label="Document associé" value={etape.document} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Description</div>
              <div style={styles.value}>{etape.description}</div>
            </div>
          </div>
        </div>
      ))}
      
      <div style={styles.divider} />
      
      <div style={styles.sectionHeader}>
        <div style={styles.sectionNum}>2</div>
        <div>
          <div style={styles.sectionTitle}>Cartographie BPMN</div>
        </div>
      </div>
      
      <div style={{ ...styles.historyPlaceholder, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
        <div style={{ fontWeight: 500 }}>Diagramme BPMN</div>
        <div style={{ fontSize: 12, marginTop: 8 }}>Version 1.0</div>
      </div>
    </div>
  );
  
  const tabContents = [<Tab1 />, <Tab2 />, <Tab3 />, <Tab4 />, <Tab5 />, <Tab6 />];
  
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #eaf5eb; }
        ::-webkit-scrollbar-thumb { background: #77D58F; border-radius: 99px; }
        button:hover { opacity: 0.88; cursor: pointer; }
      `}</style>
      
      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={styles.breadcrumb}>
            <span style={{ cursor: "pointer", color: C.muted }} onClick={() => navigate("/")}>
              Fiches Processus
            </span>
            <span style={{ color: C.border }}>›</span>
            <span style={styles.breadcrumbActive}>{processus.designation}</span>
          </div>
          <div style={styles.topbarRight}>
            <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
              🇫🇷 Français
            </span>
            <div style={styles.avatar}>RF</div>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div style={styles.content}>
          
          {/* Header card */}
          <div style={styles.headerCard}>
            <div style={styles.headerCardBadges}>
              <span style={styles.badge}>Code: {processus.identifiant}</span>
              <span style={{ ...styles.badge, ...styles.badgeGreen }}>{processus.typeProcessus}</span>
              <span style={styles.badge}>Version: 2.1</span>
              <span style={styles.badge}>Date: 27/03/2026</span>
            </div>
            <div style={styles.headerCardBody}>
              <div style={styles.headerCardLeft}>
                <div style={styles.headerCardTitle}>{processus.designation}</div>
                <div style={styles.headerCardDesc}>{processus.objectif}</div>
              </div>
              <div style={styles.headerCardRight}>
                <div style={styles.pilotBox}>
                  <div style={styles.pilotLabel}>Pilote</div>
                  <div style={styles.pilotName}>{processus.pilote}</div>
                  <div style={styles.pilotEmail}>{processus.email}</div>
                </div>
                <div style={styles.kpiRow}>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{processus.kpis.length}</span>
                    <span style={styles.kpiLbl}>KPIs</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{processus.etapes.length}</span>
                    <span style={styles.kpiLbl}>Tâches</span>
                  </div>
                  <div style={styles.kpiBox}>
                    <span style={styles.kpiNum}>{processus.risques.length}</span>
                    <span style={styles.kpiLbl}>Risques</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div style={styles.tabsWrap}>
            <div style={styles.tabsHeader}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={styles.tabContent}>
              {tabContents[activeTab]}
            </div>
          </div>
        </div>
        
        {/* Action bar */}
        <div style={styles.actionBar}>
          <button type="button" style={styles.btnBack} onClick={() => navigate("/")}>
            ← Retour à la liste
          </button>
          <button 
            type="button" 
            style={styles.btnEdit} 
            onClick={() => navigate(`/processus/${id}`)}
          >
            ✏️ Modifier le processus
          </button>
        </div>
      </div>
    </div>
  );
}