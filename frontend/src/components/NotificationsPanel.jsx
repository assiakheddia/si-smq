import { useState, useEffect, useRef } from "react";

const TYPE_STYLE = {
  publish:    { icon: "🚀", color: "#166534", bg: "#dcfce7", label: "Publication" },
  diagnostic: { icon: "🔬", color: "#1e40af", bg: "#dbeafe", label: "Diagnostic" },
  audit:      { icon: "📧", color: "#92400e", bg: "#fef3c7", label: "Audit" },
  info:       { icon: "ℹ️",  color: "#374151", bg: "#f3f4f6", label: "Info" },
};

function timeSince(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export function pushNotification(type, title, message) {
  try {
    const notifs = JSON.parse(localStorage.getItem("smq_notifications") || "[]");
    notifs.unshift({ id: `n_${Date.now()}`, type, title, message, timestamp: new Date().toISOString(), read: false });
    localStorage.setItem("smq_notifications", JSON.stringify(notifs.slice(0, 50)));
  } catch {}
}

export function getUnreadCount() {
  try {
    const notifs = JSON.parse(localStorage.getItem("smq_notifications") || "[]");
    return notifs.filter((n) => !n.read).length;
  } catch { return 0; }
}

export default function NotificationsPanel({ onClose }) {
  const [notifs, setNotifs] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("smq_notifications") || "[]");
      // Seed demo notifications if empty
      if (stored.length === 0) {
        const demos = [
          { id: "n_demo1", type: "publish", title: "Processus publié", message: "Le processus 'Gestion PFE' a été publié avec succès.", timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
          { id: "n_demo2", type: "diagnostic", title: "Diagnostic SMQ complété", message: "L'analyse du processus 'Audit Labo' a identifié 3 dysfonctionnements.", timestamp: new Date(Date.now() - 86400000).toISOString(), read: false },
          { id: "n_demo3", type: "audit", title: "Fiche envoyée à l'auditeur", message: "La fiche a été transmise à meziani@esi.dz pour confirmation.", timestamp: new Date(Date.now() - 172800000).toISOString(), read: true },
          { id: "n_demo4", type: "audit", title: "Recommandations reçues", message: "L'auditeur Meziani a soumis ses recommandations pour 'Contrôle Qualité'.", timestamp: new Date(Date.now() - 259200000).toISOString(), read: true },
        ];
        localStorage.setItem("smq_notifications", JSON.stringify(demos));
        setNotifs(demos);
      } else {
        setNotifs(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const markRead = (id) => {
    const updated = notifs.map((n) => n.id === id ? { ...n, read: true } : n);
    setNotifs(updated);
    localStorage.setItem("smq_notifications", JSON.stringify(updated));
  };

  const markAllRead = () => {
    const updated = notifs.map((n) => ({ ...n, read: true }));
    setNotifs(updated);
    localStorage.setItem("smq_notifications", JSON.stringify(updated));
  };

  const deleteNotif = (id) => {
    const updated = notifs.filter((n) => n.id !== id);
    setNotifs(updated);
    localStorage.setItem("smq_notifications", JSON.stringify(updated));
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div ref={panelRef} style={{
      position: "fixed", top: 70, right: 20, width: 380,
      maxHeight: "calc(100vh - 90px)", background: "#fff",
      borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      border: "1px solid #e8eaed", zIndex: 8000,
      display: "flex", flexDirection: "column",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      animation: "notifSlide 0.2s ease",
    }}>
      <style>{`@keyframes notifSlide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
            Notifications
            {unread > 0 && (
              <span style={{ marginLeft: 8, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {unread}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1e3d2f", fontWeight: 600 }}>
              Tout marquer lu
            </button>
          )}
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifs.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            <div style={{ fontWeight: 600 }}>Aucune notification</div>
          </div>
        ) : (
          notifs.map((n) => {
            const ts = TYPE_STYLE[n.type] || TYPE_STYLE.info;
            return (
              <div
                key={n.id}
                style={{
                  padding: "13px 18px", borderBottom: "1px solid #f0f2f4",
                  background: n.read ? "#fff" : "#f8fffe",
                  display: "flex", gap: 12, alignItems: "flex-start",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onClick={() => markRead(n.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8fffe"}
                onMouseLeave={(e) => e.currentTarget.style.background = n.read ? "#fff" : "#f8fffe"}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ts.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {ts.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 600 : 700, color: "#111", marginBottom: 3 }}>{n.title}</div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1e3d2f", flexShrink: 0, marginTop: 5 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{timeSince(n.timestamp)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: "2px 4px", borderRadius: 4, lineHeight: 1 }}
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {notifs.length > 0 && (
        <div style={{ padding: "10px 18px", borderTop: "1px solid #f0f2f4", textAlign: "center" }}>
          <button
            onClick={() => { const u = []; setNotifs(u); localStorage.setItem("smq_notifications", "[]"); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af" }}
          >
            Effacer toutes les notifications
          </button>
        </div>
      )}
    </div>
  );
}
