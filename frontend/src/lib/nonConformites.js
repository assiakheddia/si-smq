import { api } from "./api.js";

/* ── NC & Actions — source de données partagée entre FicheProcessus.jsx,
   AuditsPage.jsx et DashboardPage.jsx pour que références, statuts et
   compteurs restent identiques partout dans l'application. ── */

export const ACTION_GRAVITE = { faible: "Mineure", normale: "Mineure", haute: "Majeure", critique: "Critique" };
export const ACTION_STATUT_TO_NC = { planifiee: "ouvert", en_cours: "en_cours", en_verification: "verification", close: "clos", annulee: "clos" };
export const DSF_GRAVITE = { mineur: "Mineure", moyen: "Majeure", majeur: "Majeure", critique: "Critique" };
export const DSF_STATUT_TO_NC = { ouvert: "ouvert", en_cours: "en_cours", resolu: "clos" };

export function mapActionToNc(a) {
  return {
    id: `act-${a.id}`,
    ref: a.reference || `ACT-${a.id}`,
    titre: a.titre,
    processus: a.processus_nom || "—",
    clause: a.clause_iso_code ? `§${a.clause_iso_code}` : "—",
    gravite: ACTION_GRAVITE[a.priorite] || "Mineure",
    statut: ACTION_STATUT_TO_NC[a.statut] || "ouvert",
    responsable: a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : "—",
    dateLimit: a.date_echeance || null,
    action: a.description || "",
  };
}

export function mapDysfToNc(d, processusNom) {
  return {
    id: `dsf-${d.id}`,
    ref: d.reference || (d.clause_iso_code ? `§${d.clause_iso_code}` : `DSF-${d.id}`),
    titre: d.titre,
    processus: processusNom || "—",
    clause: d.clause_iso_code ? `§${d.clause_iso_code}` : "—",
    gravite: DSF_GRAVITE[d.gravite] || "Mineure",
    statut: DSF_STATUT_TO_NC[d.statut] || "ouvert",
    responsable: d.responsable ? `${d.responsable.prenom} ${d.responsable.nom}` : "—",
    dateLimit: d.echeance || null,
    action: (d.ameliorations || "").split("\n").filter(Boolean)[0] || "",
  };
}

export async function chargerNonConformites(processusList) {
  const actions = await api.get("/actions/").catch(() => []);
  const dysfPerProcessus = await Promise.all(
    (processusList || []).map((p) =>
      api.get(`/processus/${p.id}/dysfonctionnements`).then((list) => ({ p, list })).catch(() => ({ p, list: [] })),
    ),
  );
  const fromActions = (Array.isArray(actions) ? actions : []).map(mapActionToNc);
  const fromDysf = dysfPerProcessus.flatMap(({ p, list }) =>
    (list || []).map((d) => mapDysfToNc(d, p.nom)),
  );
  return [...fromActions, ...fromDysf];
}
