import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getCurrentUser } from "../../lib/api.js";
import { chargerNonConformites } from "../../lib/nonConformites.js";

const OBJECTIF_CONFORMITE = 85;
const DEPT_COLORS = ["#2d9e5f","#1e40af","#92400e","#6b21a8","#0e7490","#991b1b"];

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* ── Donut SVG ── */
function Donut({ data }) {
  if (!data || !data.length) return <div style={{ color: "#9ca3af", fontSize: 11, margin: "auto" }}>Aucune donnée</div>;
  const R = 48, CX = 70, CY = 70, INNER = 30;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  let a = -90;
  const slices = data.map((d) => {
    const deg = (d.value / total) * 360;
    const r2d = (x) => (x * Math.PI) / 180;
    const x1 = CX + R * Math.cos(r2d(a)), y1 = CY + R * Math.sin(r2d(a));
    a += deg;
    const x2 = CX + R * Math.cos(r2d(a)), y2 = CY + R * Math.sin(r2d(a));
    return { ...d, path: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${deg > 180 ? 1 : 0},1 ${x2},${y2} Z`, pct: Math.round((d.value / total) * 100) };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity=".85" />)}
        <circle cx={CX} cy={CY} r={INNER} fill="white" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#111" fontFamily="Outfit,sans-serif">{total}</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="Plus Jakarta Sans,sans-serif">total</text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0, display: "block" }} />
            <span style={{ fontSize: 11, color: "#374151", fontFamily: "'Plus Jakarta Sans',sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
            <span style={{ fontSize: 10.5, color: "#9ca3af" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line chart SVG ── */
function LineChart({ values, target, labels }) {
  if (!values || values.length < 2) {
    return <div style={{ color: "#9ca3af", fontSize: 11, textAlign: "center", padding: 20, width: "100%" }}>Pas assez d'audits pour afficher une tendance</div>;
  }
  const W = 320, H = 100, pad = { t: 8, r: 8, b: 20, l: 24 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const mn = 60, mx = 100;
  const tx = (i) => pad.l + (i / (values.length - 1)) * iW;
  const ty = (v) => pad.t + iH - ((v - mn) / (mx - mn)) * iH;
  const line  = values.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  const area  = `${line} L${tx(values.length - 1)},${H - pad.b} L${tx(0)},${H - pad.b} Z`;
  const tline = target.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {[70, 80, 90].map((v) => (
        <g key={v}>
          <line x1={pad.l} y1={ty(v)} x2={W - pad.r} y2={ty(v)} stroke="#f0f2f4" strokeWidth="1" />
          <text x={pad.l - 3} y={ty(v) + 3} textAnchor="end" fontSize="7" fill="#d1d5db">{v}</text>
        </g>
      ))}
      <path d={area} fill="#2d9e5f" opacity=".07" />
      <path d={tline} stroke="#f59e0b" strokeWidth="1.2" fill="none" strokeDasharray="4 3" />
      <path d={line} stroke="#2d9e5f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => <circle key={i} cx={tx(i)} cy={ty(v)} r="2.8" fill="#2d9e5f" stroke="white" strokeWidth="1.4" />)}
      {labels.map((l, i) => <text key={i} x={tx(i)} y={H - 3} textAnchor="middle" fontSize="7.5" fill="#9ca3af">{l}</text>)}
    </svg>
  );
}

/* ── Bar chart SVG ── */
function BarChart({ data }) {
  if (!data || !data.length) return <div style={{ color: "#9ca3af", fontSize: 11, textAlign: "center", padding: 20 }}>Aucune donnée</div>;
  const W = 260, H = 100, pad = { t: 10, r: 6, b: 20, l: 6 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const bW = (W - pad.l - pad.r) / data.length - 6;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {data.map((d, i) => {
        const bH = Math.max(((d.value / max) * (H - pad.t - pad.b)), 2);
        const x = pad.l + i * ((W - pad.l - pad.r) / data.length) + 3;
        const y = H - pad.b - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} fill={d.color} rx="3" opacity=".82" />
            <text x={x + bW / 2} y={y - 2} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={d.color} fontFamily="Outfit,sans-serif">{d.value}</text>
            <text x={x + bW / 2} y={H - 5} textAnchor="middle" fontSize="6.5" fill="#9ca3af">{d.label.slice(0,8)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Topbar ── */
function Topbar({ tab, setTab, navigate, user }) {
  const initials = getInitials(user?.nom_complet);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e8ede9", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#111", lineHeight: 1 }}>Tableau de bord</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>ISO 9001 · {today}</div>
      </div>
      <div style={{ display: "flex", gap: 2, background: "#f3f5f7", borderRadius: 8, padding: 3 }}>
        {["Vue globale", "Processus", "Audits & NC"].map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ padding: "4px 13px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif", background: tab === i ? "white" : "transparent", color: tab === i ? "#1e3d2f" : "#6b7280", boxShadow: tab === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.12s" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#555" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Exporter
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f5f7", border: "1px solid #e8eaed", borderRadius: 8, padding: "3px 8px 3px 3px", cursor: "pointer" }} onClick={() => navigate("/parametres")}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 9, color: "#152b21" }}>{initials}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>{user?.nom_complet || "Utilisateur"}</span>
        </div>
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: "white", borderRadius: 11, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f0f2f4", overflow: "hidden", ...style }}>{children}</div>;
}

function CardHead({ title, sub, right }) {
  return (
    <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #f4f5f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ── Tab: Vue globale ── */
function TabGlobal({ navigate, kpi, deptData, conformite, objectif, months, recent, alerts }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
        {kpi.map((k, i) => (
          <Card key={i} style={{ border: `1px solid ${k.bg}`, padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{k.label}</span>
              {k.trend && k.up !== null && (
                <span style={{ fontSize: 10, fontWeight: 700, color: k.up ? "#2d9e5f" : "#e53935", background: k.up ? "#dcfce7" : "#fee2e2", padding: "1px 6px", borderRadius: 20 }}>{k.trend}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 30, color: k.color, lineHeight: 1 }}>{k.value}</span>
              {k.unit && <span style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.unit}</span>}
            </div>
            <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{k.sub}</div>
            {k.unit === "%" && (
              <div style={{ height: 3, background: "#f3f4f6", borderRadius: 99, marginTop: 7 }}>
                <div style={{ height: "100%", width: `${Math.min(100, parseInt(k.value) || 0)}%`, background: k.color, borderRadius: 99 }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 230px", gap: 10, flex: 1, minHeight: 0 }}>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead
            title="Évolution de la conformité"
            sub="6 dernières périodes"
            right={
              <div style={{ display: "flex", gap: 10 }}>
                {[["#2d9e5f", "Réel"], ["#f59e0b", "Objectif"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 14, height: 2, background: c, display: "block", borderRadius: 2 }} />
                    <span style={{ fontSize: 9.5, color: "#9ca3af" }}>{l}</span>
                  </div>
                ))}
              </div>
            }
          />
          <div style={{ flex: 1, minHeight: 0, padding: "10px 14px 8px", display: "flex", alignItems: "center" }}>
            <LineChart values={conformite} target={objectif} labels={months} />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Processus par type" sub="Répartition actuelle" />
          <div style={{ flex: 1, minHeight: 0, padding: "10px 14px", display: "flex", alignItems: "center" }}>
            <Donut data={deptData} />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Alertes actives" />
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 11, textAlign: "center", padding: "16px 0" }}>Aucune alerte</div>
            ) : alerts.map((a, i) => {
              const c = a.level === "high" ? { dot: "#e53935", bg: "#fff5f5", border: "#fecaca" }
                      : a.level === "med"  ? { dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a" }
                      :                      { dot: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" };
              return (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 7, padding: "7px 9px", display: "flex", gap: 7, alignItems: "flex-start", flexShrink: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "#1f2937", lineHeight: 1.4 }}>{a.text}</div>
                    <div style={{ fontSize: 9.5, color: "#9ca3af", marginTop: 1 }}>{a.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card style={{ flexShrink: 0 }}>
        <CardHead title="Processus récents" right={<button onClick={() => navigate("/processus")} style={{ fontSize: 11, fontWeight: 600, color: "#2d9e5f", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Voir tout</button>} />
        {recent.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Aucun processus.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["ID","Processus","Type","Statut"].map(h=><th key={h} style={{ padding: "5px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", background: "#fafafa", borderBottom: "1px solid #f0f2f4" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < recent.length - 1 ? "1px solid #f8f9fa" : "none" }}>
                  <td style={{ padding: "7px 14px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{r.id}</td>
                  <td style={{ padding: "7px 14px", fontSize: 11.5, color: "#111", fontWeight: 600 }}>{r.processus}</td>
                  <td style={{ padding: "7px 14px", fontSize: 11, color: "#6b7280" }}>{r.dept}</td>
                  <td style={{ padding: "7px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, color: r.sC, background: r.sBg, padding: "2px 7px", borderRadius: 20 }}>{r.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ── Tab: Processus ── */
function TabProcessus({ navigate, processus }) {
  const total   = processus.length;
  const actifs  = processus.filter(p => p.est_actif !== false).length;
  const inactifs = total - actifs;

  const typeGroups = {};
  processus.forEach(p => { const k = p.type || "Autre"; typeGroups[k] = (typeGroups[k] || 0) + 1; });
  const deptData = Object.entries(typeGroups).map(([label, value], i) => ({ label, value, color: DEPT_COLORS[i % DEPT_COLORS.length] }));

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, flexShrink: 0 }}>
        {[
          { label: "Total processus", value: total,    color: "#1e3d2f", bg: "#dcfce7", desc: "Tous statuts confondus" },
          { label: "Actifs",          value: actifs,   color: "#2d9e5f", bg: "#dcfce7", desc: "En cours d'exécution" },
          { label: "Inactifs",        value: inactifs, color: "#92400e", bg: "#fef3c7", desc: "Désactivés / archivés" },
        ].map((k, i) => (
          <Card key={i} style={{ padding: "12px 16px", border: `1px solid ${k.bg}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 34, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 5 }}>{k.desc}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Processus par type" />
          <div style={{ flex: 1, minHeight: 0, padding: "10px 14px", display: "flex", alignItems: "center" }}>
            <BarChart data={deptData} />
          </div>
        </Card>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Répartition par statut" />
          <div style={{ flex: 1, minHeight: 0, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
            {total === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>Aucun processus</div>
            ) : [
              { label: "Actifs",   val: actifs,   color: "#2d9e5f" },
              { label: "Inactifs", val: inactifs, color: "#d1d5db" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{s.val} / {total}</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99 }}>
                  <div style={{ height: "100%", width: `${total > 0 ? (s.val / total) * 100 : 0}%`, background: s.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <button onClick={() => navigate("/processus")} style={{ background: "#1e3d2f", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          Gérer les processus
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Tab: Audits & NC ── */
function TabAudits({ navigate, diagnostics }) {
  const planifies = diagnostics.filter(d => d.statut === "brouillon").length;
  const enCours   = diagnostics.filter(d => d.statut === "soumis").length;
  const clotures  = diagnostics.filter(d => ["valide","archive"].includes(d.statut)).length;
  const totalNC   = diagnostics.reduce((s, d) => s + (d.nb_ecarts_majeurs || 0) + (d.nb_ecarts_mineurs || 0), 0);

  const recent = [...diagnostics].sort((a, b) => b.id - a.id).slice(0, 5).map(d => {
    const SMAP = { brouillon: { label: "Planifié", bg: "#dbeafe", c: "#1e40af" }, soumis: { label: "En cours", bg: "#fef3c7", c: "#92400e" }, valide: { label: "Validé", bg: "#d1fae5", c: "#065f46" }, archive: { label: "Clos", bg: "#f3f4f6", c: "#374151" } };
    return {
      id: d.id,
      proc: d.processus?.nom || `P-${d.processus_id}`,
      aud: d.auditeur ? `${d.auditeur.prenom || ""} ${d.auditeur.nom || ""}`.trim() : "—",
      date: d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—",
      stat: SMAP[d.statut] || { label: d.statut, bg: "#f3f4f6", c: "#374151" },
      score: d.score_global > 0 ? d.score_global : null,
      nc: (d.nb_ecarts_majeurs || 0) + (d.nb_ecarts_mineurs || 0),
    };
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
        {[
          { label: "Audits planifiés",      value: planifies, color: "#1e40af", bg: "#dbeafe" },
          { label: "En cours",              value: enCours,   color: "#92400e", bg: "#fef3c7" },
          { label: "Clôturés",              value: clotures,  color: "#2d9e5f", bg: "#dcfce7" },
          { label: "Non-conformités",       value: totalNC,   color: "#991b1b", bg: "#fee2e2" },
        ].map((k, i) => (
          <Card key={i} style={{ padding: "12px 14px", border: `1px solid ${k.bg}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 32, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <CardHead title="Audits récents" />
        {recent.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Aucun audit.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Processus","Auditeur","Date","Statut","Score","NC"].map(h=><th key={h} style={{ padding: "7px 14px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", background: "#fafafa", borderBottom: "1px solid #f0f2f4", whiteSpace: "nowrap" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#111" }}>{r.proc}</td>
                    <td style={{ padding: "8px 14px", fontSize: 11, color: "#6b7280" }}>{r.aud}</td>
                    <td style={{ padding: "8px 14px", fontSize: 11, color: "#6b7280" }}>{r.date}</td>
                    <td style={{ padding: "8px 14px" }}><span style={{ fontSize: 10, fontWeight: 700, color: r.stat.c, background: r.stat.bg, padding: "2px 7px", borderRadius: 20 }}>{r.stat.label}</span></td>
                    <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, color: r.score >= 80 ? "#166534" : r.score >= 60 ? "#92400e" : r.score !== null ? "#991b1b" : "#9ca3af" }}>{r.score !== null ? `${r.score}%` : "—"}</td>
                    <td style={{ padding: "8px 14px" }}>{r.nc > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "2px 8px", borderRadius: 20 }}>{r.nc} NC</span> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "8px 14px", borderTop: "1px solid #f0f2f4", flexShrink: 0 }}>
          <button onClick={() => navigate("/audits")} style={{ width: "100%", background: "#1e3d2f", color: "white", border: "none", borderRadius: 7, padding: "7px 0", cursor: "pointer", fontSize: 11.5, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Gérer les audits</button>
        </div>
      </Card>
    </div>
  );
}

/* ── Page root ── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [processus, setProcessus]   = useState([]);
  const [risques, setRisques]       = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [ncs, setNcs] = useState([]);

  const user = getCurrentUser();

  useEffect(() => {
    Promise.all([
      api.get("/processus/").catch(() => []),
      api.get("/risques/").catch(() => []),
      api.get("/diagnostics/").catch(() => []),
    ]).then(([procs, rqs, diags]) => {
      const procList = Array.isArray(procs) ? procs : [];
      setProcessus(procList);
      setRisques(Array.isArray(rqs) ? rqs : []);
      setDiagnostics(Array.isArray(diags) ? diags : []);
      chargerNonConformites(procList).then(setNcs).catch(() => {});
    });
  }, []);

  /* computed KPIs */
  const processusActifs = processus.filter(p => p.est_actif !== false).length;
  const scores     = diagnostics.filter(d => d.score_global > 0).map(d => d.score_global);
  const tauxConf   = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const enCours    = diagnostics.filter(d => d.statut === "soumis").length;
  // Mêmes NC réelles (Action + Dysfonctionnement) que l'onglet "NC & Actions" des audits —
  // on exclut les clôturées du total actif, comme là-bas.
  const ncsActives = ncs.filter((n) => n.statut !== "clos");
  const totalNC    = ncsActives.length;
  const ncMajeurs  = ncsActives.filter((n) => n.gravite === "Majeure" || n.gravite === "Critique").length;

  const kpi = [
    { label: "Processus actifs",   value: String(processusActifs), unit: "",  trend: "",    up: null, color: "#2d9e5f", bg: "#dcfce7", sub: `sur ${processus.length} total` },
    { label: "Taux de conformité", value: String(tauxConf),        unit: "%", trend: tauxConf >= 85 ? "+OK" : "", up: tauxConf >= 85, color: "#1e40af", bg: "#dbeafe", sub: "objectif 85%" },
    { label: "Audits en cours",    value: String(enCours),         unit: "",  trend: "",    up: null, color: "#92400e", bg: "#fef3c7", sub: `${diagnostics.length} audits` },
    { label: "Non-conformités",    value: String(totalNC),         unit: "",  trend: "",    up: null, color: "#991b1b", bg: "#fee2e2", sub: `${ncMajeurs} majeures` },
  ];

  const typeGroups = {};
  processus.forEach(p => { const k = p.type || "Autre"; typeGroups[k] = (typeGroups[k] || 0) + 1; });
  const deptData = Object.entries(typeGroups).map(([label, value], i) => ({ label, value, color: DEPT_COLORS[i % DEPT_COLORS.length] }));

  const historique = diagnostics
    .filter(d => d.score_global > 0 && d.date_diagnostic)
    .sort((a, b) => new Date(a.date_diagnostic) - new Date(b.date_diagnostic))
    .slice(-6);
  const conformite = historique.map(d => d.score_global);
  const months = historique.map(d =>
    new Date(d.date_diagnostic).toLocaleDateString("fr-FR", { month: "short" })
  );
  const objectif = conformite.map(() => OBJECTIF_CONFORMITE);

  const recent = processus.slice(0, 4).map(p => ({
    id: p.code || `P-${p.id}`,
    processus: p.nom,
    dept: p.type || "—",
    statut: p.est_actif !== false ? "Actif" : "Inactif",
    sC: p.est_actif !== false ? "#2d9e5f" : "#374151",
    sBg: p.est_actif !== false ? "#dcfce7" : "#f3f4f6",
  }));

  const alerts = risques
    .filter(r => ["critique","eleve"].includes(r.criticite))
    .slice(0, 4)
    .map(r => ({ level: r.criticite === "critique" ? "high" : "med", text: `${r.reference || ("R-" + r.id)} : ${r.titre}`, date: "Récent" }));
  if (!alerts.length && totalNC > 0) alerts.push({ level: "med", text: `${totalNC} non-conformité${totalNC > 1 ? "s" : ""} active${totalNC > 1 ? "s" : ""}`, date: "Aujourd'hui" });
  if (!alerts.length && tauxConf > 0 && tauxConf < 85) alerts.push({ level: "med", text: `Conformité sous objectif (${tauxConf}% / 85%)`, date: "Aujourd'hui" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#eaf5eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Topbar tab={tab} setTab={setTab} navigate={navigate} user={user} />
      <div style={{ flex: 1, minHeight: 0, padding: "12px 18px 12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === 0 && <TabGlobal navigate={navigate} kpi={kpi} deptData={deptData} conformite={conformite} objectif={objectif} months={months} recent={recent} alerts={alerts} />}
        {tab === 1 && <TabProcessus navigate={navigate} processus={processus} />}
        {tab === 2 && <TabAudits navigate={navigate} diagnostics={diagnostics} />}
      </div>
    </div>
  );
}
