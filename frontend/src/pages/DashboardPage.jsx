import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── data ── */
const KPI = [
  { label: "Processus actifs",   value: "12",  unit: "",  trend: "+2",  up: true,  color: "#2d9e5f", bg: "#dcfce7", sub: "sur 15 total" },
  { label: "Taux de conformité", value: "87",  unit: "%", trend: "+4%", up: true,  color: "#1e40af", bg: "#dbeafe", sub: "objectif 90%" },
  { label: "Audits en cours",    value: "3",   unit: "",  trend: "=",   up: null,  color: "#92400e", bg: "#fef3c7", sub: "8 planifiés" },
  { label: "Non-conformités",    value: "5",   unit: "",  trend: "-2",  up: false, color: "#991b1b", bg: "#fee2e2", sub: "2 critiques" },
];

const DEPT_DATA = [
  { label: "Soutenances", value: 5, color: "#2d9e5f" },
  { label: "Laboratoire", value: 4, color: "#1e40af" },
  { label: "Qualité",     value: 3, color: "#92400e" },
  { label: "Informatique",value: 2, color: "#6b21a8" },
  { label: "RH",          value: 1, color: "#0e7490" },
];

const MONTHS    = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
const CONFORMITE = [78, 81, 79, 84, 85, 87];
const OBJECTIF   = [85, 85, 85, 85, 85, 85];

const RECENT = [
  { id: "P-012", processus: "Gestion PFE",      action: "Mis à jour",     dept: "Soutenances", date: "17 mai", statut: "Actif",     sC: "#2d9e5f", sBg: "#dcfce7" },
  { id: "P-011", processus: "Audit Labo Q2",    action: "Audit ouvert",   dept: "Laboratoire", date: "16 mai", statut: "En cours",  sC: "#92400e", sBg: "#fef3c7" },
  { id: "P-010", processus: "Contrôle Qualité", action: "Non-conformité", dept: "Qualité",     date: "15 mai", statut: "Alerte",    sC: "#991b1b", sBg: "#fee2e2" },
  { id: "P-009", processus: "Formation ISO",    action: "Clôturé",        dept: "RH",          date: "14 mai", statut: "Inactif",   sC: "#374151", sBg: "#f3f4f6" },
];

const ALERTS = [
  { level: "high", text: "NC-005 : Écart documentaire — Qualité",    date: "Aujourd'hui" },
  { level: "high", text: "Audit P-011 dépasse la date limite",        date: "Hier" },
  { level: "med",  text: "Conformité sous objectif (87% / 90%)",      date: "16 mai" },
  { level: "low",  text: "3 processus non révisés depuis 90 j.",      date: "15 mai" },
];

/* ── Donut SVG ── */
function Donut({ data }) {
  const R = 48, CX = 70, CY = 70, INNER = 30;
  const total = data.reduce((s, d) => s + d.value, 0);
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
            <span style={{ fontSize: 11, color: "#374151", fontFamily: "'Plus Jakarta Sans',sans-serif", flex: 1, whiteSpace: "nowrap" }}>{s.label}</span>
            <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line chart SVG ── */
function LineChart({ values, target, labels }) {
  const W = 320, H = 100, pad = { t: 8, r: 8, b: 20, l: 24 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const mn = 70, mx = 100;
  const tx = (i) => pad.l + (i / (values.length - 1)) * iW;
  const ty = (v) => pad.t + iH - ((v - mn) / (mx - mn)) * iH;
  const line  = values.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  const area  = `${line} L${tx(values.length - 1)},${H - pad.b} L${tx(0)},${H - pad.b} Z`;
  const tline = target.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {[75, 85, 95].map((v) => (
        <g key={v}>
          <line x1={pad.l} y1={ty(v)} x2={W - pad.r} y2={ty(v)} stroke="#f0f2f4" strokeWidth="1" />
          <text x={pad.l - 3} y={ty(v) + 3} textAnchor="end" fontSize="7" fill="#d1d5db" fontFamily="Plus Jakarta Sans,sans-serif">{v}</text>
        </g>
      ))}
      <path d={area}  fill="#2d9e5f" opacity=".07" />
      <path d={tline} stroke="#f59e0b" strokeWidth="1.2" fill="none" strokeDasharray="4 3" />
      <path d={line}  stroke="#2d9e5f" strokeWidth="2"   fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => <circle key={i} cx={tx(i)} cy={ty(v)} r="2.8" fill="#2d9e5f" stroke="white" strokeWidth="1.4" />)}
      {labels.map((l, i) => <text key={i} x={tx(i)} y={H - 3} textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontFamily="Plus Jakarta Sans,sans-serif">{l}</text>)}
    </svg>
  );
}

/* ── Bar chart SVG ── */
function BarChart({ data }) {
  const W = 260, H = 100, pad = { t: 10, r: 6, b: 20, l: 6 };
  const max = Math.max(...data.map((d) => d.value));
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
            <text x={x + bW / 2} y={H - 5}  textAnchor="middle" fontSize="6.5" fill="#9ca3af" fontFamily="Plus Jakarta Sans,sans-serif">{d.label.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Shared topbar ── */
function Topbar({ tab, setTab, navigate }) {
  return (
    <div style={{
      height: 56, background: "#fff", borderBottom: "1px solid #e8ede9",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 22px", flexShrink: 0,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#111", lineHeight: 1 }}>Tableau de bord</div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>ISO 9001 · 17 mai 2026</div>
      </div>

      <div style={{ display: "flex", gap: 2, background: "#f3f5f7", borderRadius: 8, padding: 3 }}>
        {["Vue globale", "Processus", "Audits & NC"].map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: "4px 13px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 11.5, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif",
            background: tab === i ? "white" : "transparent",
            color: tab === i ? "#1e3d2f" : "#6b7280",
            boxShadow: tab === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.12s",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "#f3f5f7", border: "1px solid #e8eaed",
          borderRadius: 7, padding: "4px 10px", cursor: "pointer",
          fontSize: 11, fontWeight: 600, color: "#555",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Exporter
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "#f3f5f7", border: "1px solid #e8eaed",
          borderRadius: 8, padding: "3px 8px 3px 3px", cursor: "pointer",
        }} onClick={() => navigate("/parametres")}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 9, color: "#152b21",
          }}>AZ</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#111" }}>Atir Zineb</span>
        </div>
      </div>
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "white", borderRadius: 11,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f0f2f4",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHead({ title, sub, right }) {
  return (
    <div style={{
      padding: "10px 14px 8px",
      borderBottom: "1px solid #f4f5f6",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111" }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ══════════════════════════════════════════
   TABS
══════════════════════════════════════════ */

function TabGlobal({ navigate }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
        {KPI.map((k, i) => (
          <Card key={i} style={{ border: `1px solid ${k.bg}`, padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: 1,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}>{k.label}</span>
              {k.up !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: k.up ? "#2d9e5f" : "#e53935",
                  background: k.up ? "#dcfce7" : "#fee2e2",
                  padding: "1px 6px", borderRadius: 20,
                }}>{k.trend}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 30, color: k.color, lineHeight: 1 }}>
                {k.value}
              </span>
              {k.unit && <span style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.unit}</span>}
            </div>
            <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{k.sub}</div>
            {k.unit === "%" && (
              <div style={{ height: 3, background: "#f3f4f6", borderRadius: 99, marginTop: 7 }}>
                <div style={{ height: "100%", width: `${k.value}%`, background: k.color, borderRadius: 99 }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── Middle row: line chart | donut | alerts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 230px", gap: 10, flex: 1, minHeight: 0 }}>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead
            title="Évolution de la conformité"
            sub="6 derniers mois"
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
            <LineChart values={CONFORMITE} target={OBJECTIF} labels={MONTHS} />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Processus par département" sub="Répartition actuelle" />
          <div style={{ flex: 1, minHeight: 0, padding: "10px 14px", display: "flex", alignItems: "center" }}>
            <Donut data={DEPT_DATA} />
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Alertes actives" />
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {ALERTS.map((a, i) => {
              const c = a.level === "high" ? { dot: "#e53935", bg: "#fff5f5", border: "#fecaca" }
                      : a.level === "med"  ? { dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a" }
                      :                      { dot: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" };
              return (
                <div key={i} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 7, padding: "7px 9px",
                  display: "flex", gap: 7, alignItems: "flex-start", flexShrink: 0,
                }}>
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

      {/* ── Activity table ── */}
      <Card style={{ flexShrink: 0 }}>
        <CardHead
          title="Activité récente"
          right={
            <button onClick={() => navigate("/processus")} style={{
              fontSize: 11, fontWeight: 600, color: "#2d9e5f",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>Voir tout</button>
          }
        />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ID", "Processus", "Action", "Département", "Date", "Statut"].map((h) => (
                <th key={h} style={{
                  padding: "5px 14px", textAlign: "left",
                  fontSize: 9.5, fontWeight: 700, color: "#9ca3af",
                  letterSpacing: 1, textTransform: "uppercase",
                  background: "#fafafa", borderBottom: "1px solid #f0f2f4",
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r, i) => (
              <tr key={i} style={{ borderBottom: i < RECENT.length - 1 ? "1px solid #f8f9fa" : "none" }}>
                <td style={{ padding: "7px 14px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{r.id}</td>
                <td style={{ padding: "7px 14px", fontSize: 11.5, color: "#111", fontWeight: 600 }}>{r.processus}</td>
                <td style={{ padding: "7px 14px", fontSize: 11, color: "#374151" }}>{r.action}</td>
                <td style={{ padding: "7px 14px", fontSize: 11, color: "#6b7280" }}>{r.dept}</td>
                <td style={{ padding: "7px 14px", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{r.date}</td>
                <td style={{ padding: "7px 14px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.sC, background: r.sBg, padding: "2px 7px", borderRadius: 20 }}>{r.statut}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TabProcessus({ navigate }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, flexShrink: 0 }}>
        {[
          { label: "Total processus", value: 15, color: "#1e3d2f", bg: "#dcfce7", desc: "Tous statuts confondus" },
          { label: "Actifs",          value: 12, color: "#2d9e5f", bg: "#dcfce7", desc: "En cours d'exécution" },
          { label: "En révision",     value: 2,  color: "#92400e", bg: "#fef3c7", desc: "Attendent validation" },
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
          <CardHead title="Processus par département" />
          <div style={{ flex: 1, minHeight: 0, padding: "10px 14px", display: "flex", alignItems: "center" }}>
            <BarChart data={DEPT_DATA} />
          </div>
        </Card>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Répartition par statut" />
          <div style={{ flex: 1, minHeight: 0, padding: "14px 18px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
            {[
              { label: "Actifs",      val: 12, total: 15, color: "#2d9e5f" },
              { label: "En révision", val: 2,  total: 15, color: "#f59e0b" },
              { label: "Inactifs",    val: 1,  total: 15, color: "#d1d5db" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{s.val} / {s.total}</span>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99 }}>
                  <div style={{ height: "100%", width: `${(s.val / s.total) * 100}%`, background: s.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <button onClick={() => navigate("/processus")} style={{
          background: "#1e3d2f", color: "white", border: "none",
          borderRadius: 8, padding: "8px 18px", cursor: "pointer",
          fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          Gérer les processus
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

function TabAudits({ navigate }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
        {[
          { label: "Audits planifiés",  value: 8, color: "#1e40af", bg: "#dbeafe" },
          { label: "En cours",          value: 3, color: "#92400e", bg: "#fef3c7" },
          { label: "Clôturés",          value: 5, color: "#2d9e5f", bg: "#dcfce7" },
          { label: "Non-conformités",   value: 5, color: "#991b1b", bg: "#fee2e2" },
        ].map((k, i) => (
          <Card key={i} style={{ padding: "12px 14px", border: `1px solid ${k.bg}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 32, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 10, flex: 1, minHeight: 0 }}>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Audits planifiés" />
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Processus", "Auditeur", "Date", "Priorité", "Statut"].map((h) => (
                    <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #f0f2f4", whiteSpace: "nowrap", background: "#fafafa" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { proc: "Audit Labo Q2",    aud: "M. Bensalem",  date: "20 mai", pri: "Haute",   pC: "#991b1b", pBg: "#fee2e2", stat: "En cours",  sC: "#92400e", sBg: "#fef3c7" },
                  { proc: "Contrôle Qualité", aud: "Mme Meziani",  date: "22 mai", pri: "Haute",   pC: "#991b1b", pBg: "#fee2e2", stat: "Planifié",  sC: "#1e40af", sBg: "#dbeafe" },
                  { proc: "Gestion PFE",      aud: "M. Haddadou",  date: "28 mai", pri: "Normale", pC: "#374151", pBg: "#f3f4f6", stat: "Planifié",  sC: "#1e40af", sBg: "#dbeafe" },
                  { proc: "Formation ISO",    aud: "Mme Kaci",     date: "2 juin", pri: "Basse",   pC: "#374151", pBg: "#f3f4f6", stat: "Planifié",  sC: "#1e40af", sBg: "#dbeafe" },
                  { proc: "Sécurité Labo",    aud: "M. Bensalem",  date: "5 juin", pri: "Normale", pC: "#374151", pBg: "#f3f4f6", stat: "Planifié",  sC: "#1e40af", sBg: "#dbeafe" },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#111" }}>{r.proc}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11,  color: "#374151" }}>{r.aud}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11,  color: "#9ca3af", whiteSpace: "nowrap" }}>{r.date}</td>
                    <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, color: r.pC, background: r.pBg, padding: "2px 7px", borderRadius: 20 }}>{r.pri}</span></td>
                    <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, color: r.sC, background: r.sBg, padding: "2px 7px", borderRadius: 20 }}>{r.stat}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead title="Non-conformités ouvertes" />
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { id: "NC-005", desc: "Écart documentaire — Qualité",  grav: "Critique", gC: "#991b1b", gBg: "#fee2e2" },
              { id: "NC-004", desc: "Procédure obsolète — Labo",     grav: "Majeur",   gC: "#92400e", gBg: "#fef3c7" },
              { id: "NC-003", desc: "Enregistrement manquant — RH",  grav: "Mineur",   gC: "#374151", gBg: "#f3f4f6" },
              { id: "NC-002", desc: "Formation non complétée",        grav: "Mineur",   gC: "#374151", gBg: "#f3f4f6" },
              { id: "NC-001", desc: "Non-respect délai révision",     grav: "Majeur",   gC: "#92400e", gBg: "#fef3c7" },
            ].map((nc, i) => (
              <div key={i} style={{ border: "1px solid #f0f2f4", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", marginBottom: 2 }}>{nc.id}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1f2937" }}>{nc.desc}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: nc.gC, background: nc.gBg, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{nc.grav}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 10px", borderTop: "1px solid #f0f2f4", flexShrink: 0 }}>
            <button onClick={() => navigate("/audits")} style={{
              width: "100%", background: "#1e3d2f", color: "white",
              border: "none", borderRadius: 7, padding: "7px 0",
              cursor: "pointer", fontSize: 11.5, fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>Gérer les audits</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden",
      background: "#eaf5eb",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <Topbar tab={tab} setTab={setTab} navigate={navigate} />

      <div style={{
        flex: 1, minHeight: 0,
        padding: "12px 18px 12px",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {tab === 0 && <TabGlobal navigate={navigate} />}
        {tab === 1 && <TabProcessus navigate={navigate} />}
        {tab === 2 && <TabAudits navigate={navigate} />}
      </div>
    </div>
  );
}
