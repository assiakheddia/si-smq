import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "./lib/api";
import Login from "./pages/login.jsx";
import GoogleCallback from "./pages/GoogleCallback.jsx";
import MainContent from "./components/MainContent.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProcessFormPage from "./pages/ProcessFormPage.jsx";
import FicheProcessus from "./pages/FicheProcessus.jsx";
import AuditsPage from "./pages/AuditsPage.jsx";
import RapportsPage from "./pages/RapportsPage.jsx";
import ParametresPage from "./pages/ParametresPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RisquesPage from "./pages/RisquesPage.jsx";

function PrivateRoute({ children }) {
  const user = getCurrentUser();
  const token = localStorage.getItem("access_token");
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 220;
  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb" }}>
      <style>{`.app-content { margin-left: ${sidebarWidth}px; transition: margin-left 0.25s ease; } @media (max-width: 768px) { .app-content { margin-left: 0; } }`}</style>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} sidebarWidth={sidebarWidth} />
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
        <Route path="/dashboard" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
        <Route path="/processus" element={<PrivateRoute><AppLayout><MainContent /></AppLayout></PrivateRoute>} />
        <Route path="/processus/new" element={<PrivateRoute><AppLayout><ProcessFormPage /></AppLayout></PrivateRoute>} />
        <Route path="/processus/:id" element={<PrivateRoute><AppLayout><ProcessFormPage /></AppLayout></PrivateRoute>} />
        <Route path="/fiche-processus/:id" element={<PrivateRoute><AppLayout><FicheProcessus /></AppLayout></PrivateRoute>} />
        <Route path="/risques" element={<PrivateRoute><AppLayout><RisquesPage /></AppLayout></PrivateRoute>} />
        <Route path="/audits" element={<PrivateRoute><AppLayout><AuditsPage /></AppLayout></PrivateRoute>} />
        <Route path="/rapports" element={<PrivateRoute><AppLayout><RapportsPage /></AppLayout></PrivateRoute>} />
        <Route path="/parametres" element={<PrivateRoute><AppLayout><ParametresPage /></AppLayout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
