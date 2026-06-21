import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "./NotificationsPanel.jsx";

const C = {
  white: "#FAFAFA",
  border: "#d4e9d7",
  muted: "#6b8c75",
  primary: "#2D604F",
  text: "#1a2e22",
};

const styles = {
  topbar: {
    height: 60,
    background: C.white,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    flexShrink: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: C.muted,
  },
  breadcrumbActive: { color: C.text, fontWeight: 600 },
  topbarRight: { display: "flex", alignItems: "center", gap: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: C.primary,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
};

export default function Topbar({ 
  title, 
  showBack = false, 
  onBackClick = null,
  showNotifications = true,
  userName = "Atir Zineb",
  userRole = "Admin",
  userInitials = "AZ"
}) {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());

  return (
    <>
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      
      <div style={styles.topbar}>
        <div style={styles.breadcrumb}>
          {showBack ? (
            <>
              <span
                style={{ cursor: "pointer", color: C.muted }}
                onClick={onBackClick || (() => navigate("/processus"))}
              >
                ← Retour
              </span>
              <span style={{ color: C.border }}>/</span>
            </>
          ) : null}
          <span style={styles.breadcrumbActive}>{title}</span>
        </div>
        
        <div style={styles.topbarRight}>
          {showNotifications && (
            <div
              style={{
                position: "relative",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
              }}
              onClick={() => { setShowNotifs((v) => !v); setUnreadCount(0); }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid " + C.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
          )}
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>🇫🇷</span>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
              Français
            </span>
          </div>
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
            onClick={() => navigate("/parametres")}
          >
            <div
              style={{
                ...styles.avatar,
                background: `linear-gradient(135deg, ${C.primary}, #3a7a62)`,
              }}
            >
              {userInitials}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  lineHeight: 1.2,
                }}
              >
                {userName}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{userRole}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}