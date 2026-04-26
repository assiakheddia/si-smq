import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";

// ──────────────────────────────────────────────────────────────────
//  Page Dashboard temporaire — à remplacer par votre vrai dashboard
// ──────────────────────────────────────────────────────────────────
function Dashboard() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "#F0FFEB", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div
        className="px-8 py-6 rounded-2xl text-center space-y-2"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 4px 20px rgba(45,96,79,0.12)",
        }}
      >
        <p
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: "#77D58F" }}
        >
          QualiaFlow · SI-SMQ
        </p>
        <h1 className="text-2xl font-bold" style={{ color: "#2D604F" }}>
          Bienvenue sur le tableau de bord
        </h1>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Votre espace de management de la qualité ISO 9001.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirection racine vers /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Page de connexion */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard (placeholder) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Toute route inconnue → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
