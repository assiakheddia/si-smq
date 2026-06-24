import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setTokens } from "../lib/api";

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const userRaw = params.get("user");
    const error = params.get("error");

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (!accessToken) {
      navigate("/login?error=Connexion+Google+%C3%A9chou%C3%A9e", { replace: true });
      return;
    }

    let user = null;
    try {
      user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
      // user restera null, setTokens le tolère
    }

    setTokens(accessToken, refreshToken, user);
    const roleDest = {
      preparateur: "/dashboard",
      "auditeur-interne": "/ai/dashboard",
      "auditeur-externe": "/ae/dashboard",
      direction: "/dir/dashboard",
    };
    navigate(roleDest[user?.role] || "/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#FAFAFA", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24" style={{ color: "#2D604F" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm" style={{ color: "#6B7280" }}>Connexion en cours…</p>
      </div>
    </div>
  );
}
