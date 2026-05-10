import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login.jsx";
import MainContent from "./components/MainContent.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProcessFormPage from "./pages/ProcessFormPage.jsx";

function ProcessusPage() {
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
        <MainContent collapsed={collapsed} />
      </main>
    </div>
  );
}

function ProcessFormLayout() {
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
        <ProcessFormPage />
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
        <Route path="/processus" element={<ProcessusPage />} />
        <Route path="/processus/new" element={<ProcessFormLayout />} />
        <Route path="/processus/:id" element={<ProcessFormLayout />} />
        <Route path="/dashboard" element={<Navigate to="/processus" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}