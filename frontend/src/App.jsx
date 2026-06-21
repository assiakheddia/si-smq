import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/login.jsx";
import MainContent from "./components/MainContent.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProcessFormPage from "./pages/ProcessFormPage.jsx";
import FicheProcessus from "./pages/FicheProcessus.jsx";
import AuditsPage from "./pages/AuditsPage.jsx";
import RapportsPage from "./pages/RapportsPage.jsx";
import ParametresPage from "./pages/ParametresPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RisquesPage from "./pages/RisquesPage.jsx";

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 220;
  return (
    <div style={{ minHeight: "100vh", background: "#eaf5eb" }}>
      <style>{`.app-content { margin-left: ${sidebarWidth}px; transition: margin-left 0.25s ease; } @media (max-width: 768px) { .app-content { margin-left: 0; } }`}</style>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        sidebarWidth={sidebarWidth}
      />
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
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/processus"
          element={
            <AppLayout>
              <MainContent />
            </AppLayout>
          }
        />
        <Route
          path="/processus/new"
          element={
            <AppLayout>
              <ProcessFormPage />
            </AppLayout>
          }
        />
        <Route
          path="/processus/:id"
          element={
            <AppLayout>
              <ProcessFormPage />
            </AppLayout>
          }
        />
        <Route
          path="/fiche-processus/:id"
          element={
            <AppLayout>
              <FicheProcessus />
            </AppLayout>
          }
        />
        <Route
          path="/risques"
          element={
            <AppLayout>
              <RisquesPage />
            </AppLayout>
          }
        />
        <Route
          path="/audits"
          element={
            <AppLayout>
              <AuditsPage />
            </AppLayout>
          }
        />
        <Route
          path="/rapports"
          element={
            <AppLayout>
              <RapportsPage />
            </AppLayout>
          }
        />
        <Route
          path="/parametres"
          element={
            <AppLayout>
              <ParametresPage />
            </AppLayout>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
