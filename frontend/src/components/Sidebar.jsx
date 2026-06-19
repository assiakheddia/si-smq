import { useState, useEffect } from "react";
import { getCurrentUser } from "../lib/api";

const NAV = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    sub: "Vue d'ensemble",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "processus",
    label: "Processus",
    sub: "Fiches & gestion",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    id: "audits",
    label: "Audits",
    sub: "Contrôle qualité",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: "rapports",
    label: "Rapports",
    sub: "Analyses & exports",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-6" />
      </svg>
    ),
  },
  {
    id: "parametres",
    label: "Paramètres",
    sub: "Configuration",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
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
        @keyframes slideInNav {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(94,207,122,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(94,207,122,0); }
        }
        .sb-nav-item {
          display: flex; align-items: center; border-radius: 12px;
          cursor: pointer; position: relative; overflow: hidden;
          border: 1.5px solid transparent;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
        }
        .sb-nav-item:hover { transform: translateX(3px); }
        .sb-nav-item.active {
          background: rgba(94,207,122,0.18) !important;
          border-color: rgba(94,207,122,0.35) !important;
        }
        .sb-nav-item.active::before {
          content: '';
          position: absolute; left: 0; top: 18%; bottom: 18%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #5ecf7a, #3dab6a);
        }

        /* ── DESKTOP SIDEBAR WRAPPER ──
           overflow: visible so the collapse button can stick out to the right */
        .sb-desktop-outer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: ${sidebarWidth}px;
          overflow: visible;          /* ✅ KEY FIX — button is visible outside */
          z-index: 100;
          transition: width 0.3s cubic-bezier(.4,0,.2,1);
        }

        /* Inner scroll container — clips content but not the button */
        .sb-desktop-inner {
          position: absolute; inset: 0;
          background: linear-gradient(170deg, #152b21 0%, #1e3d2f 40%, #152b21 100%);
          display: flex; flex-direction: column;
          box-shadow: none;  /* ✅ removed — was casting dark line on content edge */
          overflow-y: auto; overflow-x: visible;
          padding: ${collapsed ? "22px 8px" : "22px 12px"};
          transition: padding 0.3s;
        }
        .sb-desktop-inner::-webkit-scrollbar { width: 3px; }
        .sb-desktop-inner::-webkit-scrollbar-thumb { background: rgba(94,207,122,0.2); border-radius: 10px; }

        /* ✅ Collapse button — placed on outer so it's never clipped */
        .sb-collapse-btn {
          position: absolute;
          top: 26px;
          right: -11px;
          width: 22px; height: 22px; border-radius: 50%;
          border: 1.5px solid rgba(94,207,122,0.4);
          background: #1e3d2f;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 200;
          transition: background 0.16s, transform 0.16s, border-color 0.16s;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4), 0 0 0 1px rgba(94,207,122,0.15);
        }
        .sb-collapse-btn:hover {
          background: #2d5a42;
          border-color: rgba(94,207,122,0.7);
          transform: scale(1.12);
        }

        .sb-tooltip {
          position: absolute; left: 110%; top: 50%; transform: translateY(-50%);
          background: #1a3628; color: #e8f5e1;
          font-size: clamp(10px, 0.9vw, 12px); font-weight: 600;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          border: 1px solid rgba(94,207,122,0.2);
          pointer-events: none; z-index: 1000;
          font-family: 'Plus Jakarta Sans', sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }

        .mob-toggle {
          position: fixed; top: 14px; left: 14px; z-index: 500;
          width: 40px; height: 40px; border-radius: 10px; border: none;
          background: #1a3628; cursor: pointer;
          display: none;
          align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }

        /* Responsive breakpoints */
        @media (max-width: 900px) {
          .sb-collapse-btn { display: none !important; }
        }
        @media (max-width: 768px) {
          .sb-desktop-outer { display: none !important; }
          .mob-toggle { display: flex !important; }
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="sb-desktop-outer">
        {/* Collapse button lives on the outer wrapper — never clipped */}
        <div
          className="sb-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path
              d={collapsed ? "M2 1.5l4 3-4 3" : "M7 1.5L3 4.5l4 3"}
              stroke="rgba(240,255,244,0.9)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="sb-desktop-inner">
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 32,
              justifyContent: collapsed ? "center" : "flex-start",
              paddingLeft: collapsed ? 0 : 2,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
                background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulseGlow 3s ease-in-out infinite",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 7v10l8 5 8-5V7L12 2z"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  fill="rgba(255,255,255,0.15)"
                />
                <circle cx="12" cy="12" r="2.5" fill="white" />
              </svg>
            </div>
            {!collapsed && (
              <div
                style={{
                  overflow: "hidden",
                  animation: mounted ? "slideInNav 0.25s ease" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 900,
                    fontSize: "clamp(13px,1.2vw,15px)",
                    color: "#f0fff4",
                    letterSpacing: 2.5,
                    lineHeight: 1,
                  }}
                >
                  VERIDIA
                </div>
                <div
                  style={{
                    fontSize: "clamp(8px,0.75vw,9.5px)",
                    color: "rgba(240,255,244,0.38)",
                    marginTop: 3,
                  }}
                >
                  Qualité & Processus
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div
              style={{
                fontSize: "clamp(7.5px,0.7vw,9px)",
                fontWeight: 700,
                color: "rgba(240,255,244,0.22)",
                letterSpacing: 2.8,
                textTransform: "uppercase",
                marginBottom: 10,
                paddingLeft: 10,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Navigation
            </div>
          )}

          <nav
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {NAV.map((item, i) => {
              const isActive = activeNav === item.id;
              const isHovered = hoveredId === item.id;
              return (
                <div
                  key={item.id}
                  className={`sb-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveNav(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: collapsed ? "10px 0" : "9px 10px",
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? "center" : "flex-start",
                    background:
                      isHovered && !isActive
                        ? "rgba(94,207,122,0.09)"
                        : "transparent",
                    animation: mounted
                      ? `slideInNav 0.25s ease ${i * 0.05}s both`
                      : "none",
                  }}
                >
                  <span
                    style={{
                      color: isActive
                        ? "#5ecf7a"
                        : isHovered
                          ? "#a8e6b8"
                          : "rgba(240,255,244,0.4)",
                      flexShrink: 0,
                      transition: "color 0.18s",
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <div style={{ overflow: "hidden", minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontSize: "clamp(11.5px,1.05vw,13px)",
                          fontWeight: 600,
                          lineHeight: 1.25,
                          whiteSpace: "nowrap",
                          color: isActive
                            ? "#f0fff4"
                            : isHovered
                              ? "#d4f0da"
                              : "rgba(240,255,244,0.65)",
                          transition: "color 0.18s",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(9px,0.85vw,10px)",
                          color: "rgba(240,255,244,0.28)",
                          marginTop: 1,
                        }}
                      >
                        {item.sub}
                      </div>
                    </div>
                  )}
                  {collapsed && isHovered && (
                    <span className="sb-tooltip">{item.label}</span>
                  )}
                </div>
              );
            })}
          </nav>

          <div
            style={{
              height: 1,
              background: "rgba(94,207,122,0.1)",
              margin: "14px 0",
            }}
          />

          {/* Profile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 9,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "4px 0" : "4px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                flexShrink: 0,
                background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: "clamp(10px,0.9vw,12px)",
                color: "#152b21",
              }}
            >
              {userInitials}
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(11px,1vw,12.5px)",
                    color: "#f0fff4",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userDisplayName}
                </div>
                <div
                  style={{
                    fontSize: "clamp(8.5px,0.8vw,10px)",
                    color: "rgba(240,255,244,0.35)",
                  }}
                >
                  {userRole}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE toggle ── */}
      <button className="mob-toggle" onClick={() => setMobileOpen(true)}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 400,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: mobileOpen ? 0 : "-260px",
          bottom: 0,
          width: 240,
          background:
            "linear-gradient(170deg, #152b21 0%, #1e3d2f 40%, #152b21 100%)",
          zIndex: 410,
          transition: "left 0.28s cubic-bezier(.4,0,.2,1)",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            alignSelf: "flex-end",
            background: "rgba(94,207,122,0.12)",
            border: "none",
            borderRadius: 8,
            width: 30,
            height: 30,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="rgba(240,255,244,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L4 7v10l8 5 8-5V7L12 2z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinejoin="round"
                fill="rgba(255,255,255,0.15)"
              />
              <circle cx="12" cy="12" r="2.5" fill="white" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: 14,
                color: "#f0fff4",
                letterSpacing: 2,
              }}
            >
              VERIDIA
            </div>
            <div style={{ fontSize: 9, color: "rgba(240,255,244,0.38)" }}>
              Qualité & Processus
            </div>
          </div>
        </div>

        <nav
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {NAV.map((item) => (
            <div
              key={item.id}
              className={`sb-nav-item ${activeNav === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveNav(item.id);
                setMobileOpen(false);
              }}
              style={{ padding: "10px 11px", gap: 10 }}
            >
              <span
                style={{
                  color:
                    activeNav === item.id
                      ? "#5ecf7a"
                      : "rgba(240,255,244,0.45)",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      activeNav === item.id
                        ? "#f0fff4"
                        : "rgba(240,255,244,0.7)",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(240,255,244,0.3)" }}>
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div
          style={{
            borderTop: "1px solid rgba(94,207,122,0.1)",
            paddingTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#5ecf7a,#2d9e5f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: "#152b21",
            }}
          >
            RF
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#f0fff4",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Ryma Felkir
            </div>
            <div style={{ fontSize: 9.5, color: "rgba(240,255,244,0.35)" }}>
              Admin Système
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
