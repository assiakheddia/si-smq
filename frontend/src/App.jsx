import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login.jsx";
import MainContent from "./components/MainContent.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProcessFormPage from "./pages/ProcessFormPage.jsx";
import FicheProcessus from "./pages/FicheProcessus.jsx";
import AuditsPage from "./pages/AuditsPage.jsx";
import RapportsPage from "./pages/RapportsPage.jsx";
import ParametresPage from "./pages/ParametresPage.jsx";

function AppLayout({ children, active }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 70 : 245;
  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb" }}>
      <style>{`.app-content { margin-left: ${sidebarWidth}px; transition: margin-left 0.3s cubic-bezier(.4,0,.2,1); } @media (max-width: 768px) { .app-content { margin-left: 0; } }`}</style>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} sidebarWidth={sidebarWidth} />
      <main className="app-content">{children}</main>
    </div>
  );
}

// NEW: Layout for FicheProcessus
function FicheProcessusLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("processus");
  const sidebarWidth = collapsed ? 70 : 245;

  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb" }}>
      <style>{`
        .app-content {
          margin-left: ${sidebarWidth}px;
          transition: margin-left 0.3s cubic-bezier(.4,0,.2,1);
        }

        @media (max-width: 768px) {
          .app-content {
            margin-left: 0;
          }
        }
      `}</style>

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        sidebarWidth={sidebarWidth}
      />

      <main className="app-content">
        <FicheProcessus />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/processus" element={<AppLayout active="processus"><MainContent /></AppLayout>} />
        <Route path="/processus/new" element={<AppLayout active="processus"><ProcessFormPage /></AppLayout>} />
        <Route path="/processus/:id" element={<AppLayout active="processus"><ProcessFormPage /></AppLayout>} />
        <Route path="/fiche-processus/:id" element={<AppLayout active="processus"><FicheProcessus /></AppLayout>} />
        <Route path="/audits" element={<AppLayout active="audits"><AuditsPage /></AppLayout>} />
        <Route path="/rapports" element={<AppLayout active="rapports"><RapportsPage /></AppLayout>} />
        <Route path="/parametres" element={<AppLayout active="parametres"><ParametresPage /></AppLayout>} />
        <Route path="/dashboard" element={<Navigate to="/processus" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="/fiche-processus/:id" element={<FicheProcessusLayout />} /> {/* UPDATED */}
      </Routes>
    </BrowserRouter>
  );
}
