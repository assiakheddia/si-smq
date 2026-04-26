import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("processus");
  const SW = collapsed ? 64 : 220;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: clamp(13px, 1.1vw, 15px); }
        html, body, #root {
          height: 100%;
          background: #eaf5eb;
        }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #c8dfc9; border-radius: 10px; }
      `}</style>

      <div
        style={{
          display: "flex",
          minHeight: "100%",
          background: "#eaf5eb",
          position: "relative",
        }}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          sidebarWidth={SW}
        />

        <div
          style={{
            marginLeft: SW,
            flex: 1,
            minWidth: 0,
            background: "#eaf5eb",
            transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
            position: "relative",
            /* Ensure background covers full scroll height */
          }}
        >
          {/* Decorative blob */}
          <div
            style={{
              position: "fixed",
              top: -100,
              right: -100,
              width: 500,
              height: 500,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(94,207,122,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <MainContent collapsed={collapsed} />
        </div>
      </div>
    </>
  );
}
