import { useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';

/* â”€â”€ Navigation per role â”€â”€ */
const NAV_PREPARATEUR = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Tableau de bord',
    sub: "Vue d'ensemble",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'processus',
    path: '/processus',
    label: 'Processus',
    sub: 'Fiches & gestion',
    matchPaths: ['/processus', '/fiche-processus'],
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'audits',
    path: '/audits',
    label: 'Audits',
    sub: 'ContrÃ´le qualitÃ©',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'rapports',
    path: '/rapports',
    label: 'Rapports',
    sub: 'Analyses & exports',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'parametres',
    path: '/parametres',
    label: 'ParamÃ¨tres',
    sub: 'Configuration',
    icon: (
      <svg
        width="16"
        height="16"
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

const NAV_AUDITEUR_INTERNE = [
  {
    id: 'dashboard',
    path: '/ai/dashboard',
    label: 'Tableau de bord',
    sub: "Vue d'ensemble",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'review',
    path: '/ai/review',
    label: 'RÃ©vision des fiches',
    sub: 'Fiches soumises',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'improvements',
    path: '/ai/improvements',
    label: 'Demandes',
    sub: 'Observations & corrections',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: 'validation',
    path: '/ai/validation',
    label: 'Validation',
    sub: 'Autoriser pour audit',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'parametres',
    path: '/parametres',
    label: 'ParamÃ¨tres',
    sub: 'Configuration',
    icon: (
      <svg
        width="16"
        height="16"
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

const NAV_AUDITEUR_EXTERNE = [
  {
    id: 'dashboard',
    path: '/ae/dashboard',
    label: 'Tableau de bord',
    sub: "Vue d'ensemble",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'audits',
    path: '/ae/audits',
    label: 'Audits assignÃ©s',
    sub: 'Processus Ã  auditer',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'evaluation',
    path: '/ae/evaluation',
    label: 'Ã‰valuation',
    sub: 'ConformitÃ© ISO',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'nonconformites',
    path: '/ae/nonconformites',
    label: 'Non-conformitÃ©s',
    sub: 'Constats & findings',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  {
    id: 'rapport',
    path: '/ae/rapport',
    label: "Rapport d'audit",
    sub: 'GÃ©nÃ©ration rapports',
    icon: (
      <svg
        width="16"
        height="16"
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
];

const NAV_DIRECTION = [
  {
    id: 'dashboard',
    path: '/dir/dashboard',
    label: 'Tableau de bord',
    sub: 'Vue exÃ©cutive',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'monitoring',
    path: '/dir/monitoring',
    label: 'Supervision globale',
    sub: 'ActivitÃ© systÃ¨me',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    id: 'audit-mgmt',
    path: '/dir/audit-management',
    label: 'Gestion des audits',
    sub: 'Lancer audits externes',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'kpi',
    path: '/dir/kpi',
    label: 'Analytique KPI',
    sub: 'Indicateurs avancÃ©s',
    icon: (
      <svg
        width="16"
        height="16"
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
    id: 'reports',
    path: '/dir/reports',
    label: 'Rapports stratÃ©giques',
    sub: 'Rapports direction',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
      </svg>
    ),
  },
];

const ROLE_CONFIG = {
  preparateur: {
    nav: NAV_PREPARATEUR,
    label: 'PrÃ©parateur',
    initials: 'PR',
    color: '#2D604F',
  },
  'auditeur-interne': {
    nav: NAV_AUDITEUR_INTERNE,
    label: 'Auditeur Interne',
    initials: 'AI',
    color: '#1e40af',
  },
  'auditeur-externe': {
    nav: NAV_AUDITEUR_EXTERNE,
    label: 'Auditeur Externe',
    initials: 'AE',
    color: '#b45309',
  },
  direction: {
    nav: NAV_DIRECTION,
    label: 'Direction',
    initials: 'DG',
    color: '#7c3aed',
  },
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  activeNav,
  setActiveNav,
  sidebarWidth,
  role = 'preparateur',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.preparateur;
  const NAV = cfg.nav;

  const activeId =
    NAV.find((n) => {
      if (n.matchPaths)
        return n.matchPaths.some((p) => location.pathname.startsWith(p));
      return (
        location.pathname === n.path ||
        location.pathname.startsWith(n.path + '/')
      );
    })?.id ?? NAV[0]?.id;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [mounted, setMounted] = useState(false);

  const currentUser = getCurrentUser();
  const userDisplayName = currentUser?.nom_complet || 'Utilisateur';
  const userRole = currentUser?.role || '—';
  const userInitials = userDisplayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    <>
      <style>{`
        .sb-outer { position:fixed;top:0;left:0;bottom:0;width:${sidebarWidth}px;z-index:100;transition:width 0.25s ease; }
        .sb-inner { position:absolute;inset:0;background:#162b22;display:flex;flex-direction:column;padding:${collapsed ? '20px 8px' : '20px 10px'};overflow-y:auto;overflow-x:hidden;transition:padding 0.25s ease; }
        .sb-inner::-webkit-scrollbar { width:0; }
        .sb-collapse-btn { position:absolute;top:24px;right:-10px;width:20px;height:20px;border-radius:50%;border:1px solid rgba(94,207,122,0.3);background:#1e3d2f;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:200;transition:background 0.15s; }
        .sb-collapse-btn:hover { background:#2a5240; }
        .sb-item { display:flex;align-items:center;border-radius:10px;cursor:pointer;padding:${collapsed ? '9px 0' : '8px 10px'};gap:${collapsed ? '0' : '10px'};justify-content:${collapsed ? 'center' : 'flex-start'};border:1px solid transparent;transition:background 0.15s,border-color 0.15s;position:relative; }
        .sb-item:hover { background:rgba(94,207,122,0.08); }
        .sb-item.active { background:rgba(94,207,122,0.14);border-color:rgba(94,207,122,0.28); }
        .sb-item.active::before { content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;border-radius:0 2px 2px 0;background:#5ecf7a; }
        .sb-item-icon { color:rgba(240,255,244,0.38);flex-shrink:0;transition:color 0.15s; }
        .sb-item.active .sb-item-icon { color:#5ecf7a; }
        .sb-item:hover .sb-item-icon { color:rgba(240,255,244,0.7); }
        .sb-item-label { font-family:'Plus Jakarta Sans',sans-serif;font-size:12.5px;font-weight:600;line-height:1.2;color:rgba(240,255,244,0.5);white-space:nowrap;transition:color 0.15s; }
        .sb-item.active .sb-item-label { color:#f0fff4; }
        .sb-item:hover .sb-item-label { color:rgba(240,255,244,0.85); }
        .sb-item-sub { fontSize:10px;color:rgba(240,255,244,0.22);margin-top:1px;font-family:'Plus Jakarta Sans',sans-serif; }
        .sb-tooltip { position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);background:#1a3628;color:#e8f5e1;fontSize:11.5px;font-weight:600;padding:5px 10px;border-radius:7px;white-space:nowrap;border:1px solid rgba(94,207,122,0.2);pointer-events:none;z-index:1000;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3); }
        @media(max-width:768px){.sb-outer{display:none;}}
      `}</style>

      <div className="sb-outer">
        <div
          className="sb-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d={collapsed ? 'M2 1.5l3.5 2.5L2 6.5' : 'M6 1.5L2.5 4 6 6.5'}
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
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 28,
              justifyContent: collapsed ? 'center' : 'flex-start',
              paddingLeft: collapsed ? 0 : 2,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #5ecf7a, #2d9e5f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 900,
                    fontSize: 14,
                    color: '#f0fff4',
                    letterSpacing: 2,
                    lineHeight: 1,
                  }}
                >
                  AQIPP
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: 'rgba(240,255,244,0.32)',
                    marginTop: 3,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  SystÃ¨me QualitÃ©
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(240,255,244,0.2)',
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingLeft: 10,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {cfg.label}
            </div>
          )}

          <nav
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {NAV.map((item) => {
              const isActive = activeId === item.id;
              return (
                <div
                  key={item.id}
                  className={`sb-item${isActive ? ' active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sb-item-icon">{item.icon}</span>
                  {!collapsed && (
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
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
              background: 'rgba(94,207,122,0.08)',
              margin: '12px 0',
            }}
          />

          {/* Profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 9,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '4px 0' : '5px 4px',
              borderRadius: 9,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/login')}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900,
                fontSize: 11,
                color: '#fff',
              }}
            >
              {cfg.initials}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#f0fff4',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cfg.label}
                </div>
                <div style={{ fontSize: 9.5, color: 'rgba(240,255,244,0.3)' }}>
                  Se dÃ©connecter
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
