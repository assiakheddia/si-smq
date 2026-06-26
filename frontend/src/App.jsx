import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "./lib/api";

const ROLE_HOME = {
  preparateur:      "/dashboard",
  auditeur_interne: "/ai/dashboard",
  direction:        "/dir/dashboard",
};
import Login from "./pages/auth/login.jsx";
import GoogleCallback from "./pages/GoogleCallback.jsx";
import MainContent from "./components/MainContent.jsx";
import Sidebar from "./components/Sidebar.jsx";

/* ── Préparateur ── */
import ProcessFormPage from "./pages/preparateur/ProcessFormPage.jsx";
import FicheProcessus from "./pages/preparateur/FicheProcessus.jsx";
import AuditsPage from "./pages/preparateur/AuditsPage.jsx";
import RapportsPage from "./pages/preparateur/RapportsPage.jsx";
import ParametresPage from "./pages/preparateur/ParametresPage.jsx";
import DashboardPage from "./pages/preparateur/DashboardPage.jsx";

/* ── Auditeur Interne ── */
import AIDashboard from "./pages/auditeur-interne/Dashboard.jsx";
import AIReviewFiches from "./pages/auditeur-interne/ReviewFiches.jsx";
import AIImprovements from "./pages/auditeur-interne/ImprovementRequests.jsx";
import AIValidation from "./pages/auditeur-interne/ValidationPage.jsx";

/* ── Direction ── */
import DirDashboard from "./pages/direction/Dashboard.jsx";
import DirMonitoring from "./pages/direction/GlobalMonitoring.jsx";
import DirAuditMgmt from "./pages/direction/AuditManagement.jsx";
import DirKPI from "./pages/direction/KPIAnalytics.jsx";
import DirReports from "./pages/direction/StrategicReports.jsx";

function AppLayout({ children, role }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 220;

  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb" }}>
      <style>{`.app-content { margin-left: ${sidebarWidth}px; transition: margin-left 0.25s ease; } @media (max-width: 768px) { .app-content { margin-left: 0; } }`}</style>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} sidebarWidth={sidebarWidth} role={role} />
      <main className="app-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />

        {/* ── Préparateur routes ── */}
        <Route path="/dashboard" element={<AppLayout role="preparateur"><DashboardPage /></AppLayout>} />
        <Route path="/processus" element={<AppLayout role="preparateur"><MainContent /></AppLayout>} />
        <Route path="/processus/new" element={<AppLayout role="preparateur"><ProcessFormPage /></AppLayout>} />
        <Route path="/processus/:id" element={<AppLayout role="preparateur"><ProcessFormPage /></AppLayout>} />
        <Route path="/fiche-processus/:id" element={<AppLayout role="preparateur"><FicheProcessus /></AppLayout>} />
        <Route path="/audits" element={<AppLayout role="preparateur"><AuditsPage /></AppLayout>} />
        <Route path="/rapports" element={<AppLayout role="preparateur"><RapportsPage /></AppLayout>} />
        <Route path="/parametres" element={<AppLayout role="preparateur"><ParametresPage /></AppLayout>} />

        {/* ── Auditeur Interne routes ── */}
        <Route path="/ai/dashboard" element={<AppLayout role="auditeur_interne"><AIDashboard /></AppLayout>} />
        <Route path="/ai/review" element={<AppLayout role="auditeur_interne"><AIReviewFiches /></AppLayout>} />
        <Route path="/ai/fiche-processus/:id" element={<AppLayout role="auditeur_interne"><FicheProcessus /></AppLayout>} />
        <Route path="/ai/improvements" element={<AppLayout role="auditeur_interne"><AIImprovements /></AppLayout>} />
        <Route path="/ai/validation" element={<AppLayout role="auditeur_interne"><AIValidation /></AppLayout>} />

        {/* ── Direction routes ── */}
        <Route path="/dir/dashboard" element={<AppLayout role="direction"><DirDashboard /></AppLayout>} />
        <Route path="/dir/monitoring" element={<AppLayout role="direction"><DirMonitoring /></AppLayout>} />
        <Route path="/dir/audit-management" element={<AppLayout role="direction"><DirAuditMgmt /></AppLayout>} />
        <Route path="/dir/kpi" element={<AppLayout role="direction"><DirKPI /></AppLayout>} />
        <Route path="/dir/reports" element={<AppLayout role="direction"><DirReports /></AppLayout>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
