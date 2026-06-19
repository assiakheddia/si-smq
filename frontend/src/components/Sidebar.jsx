import { useState, useEffect } from "react";
import { getCurrentUser } from "../lib/api";
import { useNavigate, useLocation } from "react-router-dom";

const NAV = [
  {
    id: "dashboard",
    path: "/dashboard",
    label: "Tableau de bord",
    sub: "Vue d'ensemble",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "processus",
    path: "/processus",
    label: "Processus",
    sub: "Fiches & gestion",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    id: "audits",
    path: "/audits",
    label: "Audits",
    sub: "Contrôle qualité",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: "risques",
    path: "/risques",
    label: "Risques",
    sub: "ISO 9001 § 6.1",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: "rapports",
    path: "/rapports",
    label: "Rapports",
    sub: "Analyses & exports",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-6" />
      </svg>
    ),
  },
  {
    id: "parametres",
    path: "/parametres",
    label: "Paramètres",
    sub: "Configuration",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  activeNav,
  setActiveNav,
  sidebarWidth,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId]   = useState(null);
  const [mounted, setMounted]       = useState(false);

  const currentUser = getCurrentUser();
  const userDisplayName = currentUser?.nom_complet || "Utilisateur";
  const userRole        = currentUser?.role        || "—";
  const userInitials    = userDisplayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    <>
      <style>{`
        .sb-outer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: ${sidebarWidth}px;
          z-index: 100;
          transition: width 0.25s ease;
        }
        .sb-inner {
          position: absolute; inset: 0;
          background: #162b22;
          display: flex; flex-direction: column;
          padding: ${collapsed ? "20px 8px" : "20px 10px"};
          overflow-y: auto; overflow-x: hidden;
          transition: padding 0.25s ease;
        }
        .sb-inner::-webkit-scrollbar { width: 0; }
        .sb-collapse-btn {
          position: absolute; top: 24px; right: -10px;
          width: 20px; height: 20px; border-radius: 50%;
          border: 1px solid rgba(94,207,122,0.3);
          background: #1e3d2f;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 200;
          transition: background 0.15s;
        }
        .sb-collapse-btn:hover { background: #2a5240; }
        .sb-item {
          display: flex; align-items: center;
          border-radius: 10px; cursor: pointer;
          padding: ${collapsed ? "9px 0" : "8px 10px"};
          gap: ${collapsed ? "0" : "10px"};
          justify-content: ${collapsed ? "center" : "flex-start"};
          border: 1px solid transparent;
          transition: background 0.15s, border-color 0.15s;
          position: relative;
        }
        .sb-item:hover { background: rgba(94,207,122,0.08); }
        .sb-item.active {
          background: rgba(94,207,122,0.14);
          border-color: rgba(94,207,122,0.28);
        }
        .sb-item.active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; border-radius: 0 2px 2px 0;
          background: #5ecf7a;
        }
        .sb-item-icon { color: rgba(240,255,244,0.38); flex-shrink: 0; transition: color 0.15s; }
        .sb-item.active .sb-item-icon { color: #5ecf7a; }
        .sb-item:hover .sb-item-icon { color: rgba(240,255,244,0.7); }
        .sb-item-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12.5px; font-weight: 600; line-height: 1.2;
          color: rgba(240,255,244,0.5); white-space: nowrap;
          transition: color 0.15s;
        }
        .sb-item.active .sb-item-label { color: #f0fff4; }
        .sb-item:hover .sb-item-label { color: rgba(240,255,244,0.85); }
        .sb-item-sub {
          font-size: 10px; color: rgba(240,255,244,0.22); margin-top: 1px;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .sb-tooltip {
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%);
          background: #1a3628; color: #e8f5e1;
          font-size: 11.5px; font-weight: 600;
          padding: 5px 10px; border-radius: 7px; white-space: nowrap;
          border: 1px solid rgba(94,207,122,0.2);
          pointer-events: none; z-index: 1000;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        @media (max-width: 768px) { .sb-outer { display: none; } }
      `}</style>

      <div className="sb-outer">
        <div
          className="sb-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d={collapsed ? "M2 1.5l3.5 2.5L2 6.5" : "M6 1.5L2.5 4 6 6.5"}
              stroke="rgba(240,255,244,0.8)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="sb-inner">
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
              justifyContent: collapsed ? "center" : "flex-start",
              paddingLeft: collapsed ? 0 : 2,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                flexShrink: 0,
                background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 7v10l8 5 8-5V7L12 2z"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  fill="rgba(255,255,255,0.12)"
                />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </div>
            {!collapsed && (
              <div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 900,
                    fontSize: 14,
                    color: "#f0fff4",
                    letterSpacing: 2,
                    lineHeight: 1,
                  }}
                >
                  AQIPP
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(240,255,244,0.32)",
                    marginTop: 3,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Système Qualité
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(240,255,244,0.2)",
                letterSpacing: 2.5,
                textTransform: "uppercase",
                marginBottom: 8,
                paddingLeft: 10,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Menu
            </div>
          )}

          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV.map((item) => {
              const isActive = activeId === item.id;
              return (
                <div
                  key={item.id}
                  className={`sb-item${isActive ? " active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sb-item-icon">{item.icon}</span>
                  {!collapsed && (
                    <div style={{ overflow: "hidden", minWidth: 0 }}>
                      <div className="sb-item-label">{item.label}</div>
                      <div className="sb-item-sub">{item.sub}</div>
                    </div>
                  )}
                  {collapsed && (
                    <span className="sb-tooltip">{item.label}</span>
                  )}
                </div>
              );
            })}
          </nav>

          <div
            style={{
              height: 1,
              background: "rgba(94,207,122,0.08)",
              margin: "12px 0",
            }}
          />

          {/* Profile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 9,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "4px 0" : "5px 4px",
              borderRadius: 9,
              cursor: "pointer",
            }}
            onClick={() => navigate("/parametres")}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: 11,
                color: "#152b21",
              }}
            >
              {userInitials}
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#f0fff4",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userDisplayName}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "rgba(240,255,244,0.3)",
                  }}
                >
                  {userRole}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
