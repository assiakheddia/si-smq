import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../../assets/Vector.svg";
import { api, setTokens } from "../../lib/api";
/* ── role definitions ── */
const ROLES = [
  { id: "preparateur",      label: "Préparateur",       sub: "Gestion des processus",    color: "#2D604F", path: "/dashboard",    initials: "PR" },
  { id: "auditeur_interne", label: "Auditeur Interne",  sub: "Révision & validation",    color: "#1e40af", path: "/ai/dashboard", initials: "AI" },
  { id: "direction",        label: "Direction",          sub: "Supervision stratégique",  color: "#7c3aed", path: "/dir/dashboard",initials: "DR" },
  { id: "auditeur_externe", label: "Auditeur Externe",  sub: "Audit ISO externe",        color: "#b45309", path: "/ae/dashboard", initials: "AE" },
];


const LogoPlaceholder = () => (
  <div className="flex flex-col items-center gap-3">

<img src={logo} alt="Veridia" className="h-16 w-auto" />

  </div>
);

// Icône œil pour show/hide mot de passe
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );

// Icône Google
const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="h-5 w-5 flex-shrink-0"
  >
    <path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.991 21.991 0 002 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [step, setStep] = useState("role"); // "role" | "credentials"

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(urlError);
  }, [searchParams]);
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep("credentials");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      const destRole = ROLES.find((r) => r.id === data.role);
      if (!destRole) {
        setError("Rôle de compte inconnu. Contactez un administrateur.");
        setLoading(false);
        return;
      }
      if (selectedRole && data.role !== selectedRole.id) {
        setError(
          `Ce compte est associé au rôle "${destRole.label}". Veuillez sélectionner ce rôle pour vous connecter.`
        );
        setLoading(false);
        return;
      }
      setTokens(data.access_token, data.refresh_token, {
        id: data.utilisateur_id,
        nom_complet: data.nom_complet,
        email: data.email,
        role: data.role,
      });
      navigate(destRole.path);
    } catch (err) {
      setError(err.message || "Identifiants incorrects. Vérifiez votre email et mot de passe.");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = "/api/v1/auth/google";
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#FAFAFA", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Panneau gauche — Branding ─────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "#2D604F" }}
      >
        {/* Cercles décoratifs */}
        <div
          className="absolute -top-24 -left-24 rounded-full opacity-10"
          style={{ width: 380, height: 380, background: "#77D58F" }}
        />
        <div
          className="absolute bottom-0 right-0 rounded-full opacity-10"
          style={{ width: 300, height: 300, background: "#77D58F" }}
        />
        <div
          className="absolute top-1/2 -right-20 rounded-full opacity-5"
          style={{ width: 260, height: 260, background: "#F0FFEB" }}
        />

        {/* Logo + nom */}
        <div className="relative z-10 flex items-center gap-4">
          <LogoPlaceholder />
          <div>
            <p
              className="text-xl font-bold tracking-widest uppercase"
              style={{ color: "#77D58F", letterSpacing: "0.18em" }}
            >
              QualiaFlow™
            </p>
            <p className="text-xs" style={{ color: "rgba(240,255,235,0.55)" }}>
              VERIDIA
            </p>
          </div>
        </div>

        {/* Contenu central */}
        <div className="relative z-10 space-y-6">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(119,213,143,0.15)",
              color: "#77D58F",
              border: "1px solid rgba(119,213,143,0.3)",
            }}
          >
            SI-SMQ · ISO 9001
          </div>

          <h1
            className="text-4xl font-bold leading-tight"
            style={{ color: "#F0FFEB" }}
          >
            La qualité,
            <br />
            <span style={{ color: "#77D58F" }}>pensée</span>
            <br />
            en continu.
          </h1>

          <p
            className="text-base leading-relaxed max-w-xs"
            style={{ color: "rgba(240,255,235,0.65)" }}
          >
            Pilotez votre système de management de la qualité, préparez votre
            certification et suivez vos indicateurs en temps réel.
          </p>

          {/* Badges de fonctionnalités */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Non-conformités", "Audits", "Actions correctives", "Indicateurs"].map(
              (f) => (
                <span
                  key={f}
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={{
                    background: "rgba(240,255,235,0.08)",
                    color: "rgba(240,255,235,0.7)",
                    border: "1px solid rgba(240,255,235,0.12)",
                  }}
                >
                  {f}
                </span>
              )
            )}
          </div>
        </div>

        {/* Footer gauche */}
        <div
          className="relative z-10 text-xs"
          style={{ color: "rgba(240,255,235,0.35)" }}
        >
          © 2025 Veridia · Tous droits réservés
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ────────────────────────────── */}
      <div
        className="flex flex-1 items-center justify-center px-6 py-12"
        style={{ background: "#FAFAFA" }}
      >
        <div className="w-full max-w-md space-y-8">

          {/* Logo mobile uniquement */}
          <div className="lg:hidden flex flex-col items-center gap-2">
            <LogoPlaceholder />
            <p
              className="text-lg font-bold tracking-widest uppercase"
              style={{ color: "#2D604F" }}
            >
              VERIDIA
            </p>
          </div>

          {/* En-tête formulaire */}
          <div>
            <h2 className="text-3xl font-bold" style={{ color: "#2D604F" }}>
              {step === "role" ? "Sélectionnez votre rôle" : "Connexion"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              {step === "role"
                ? "Choisissez votre profil pour accéder à votre espace."
                : `Connectez-vous en tant que ${selectedRole?.label}`}
            </p>
          </div>

          {/* Role selection step */}
          {step === "role" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 12,
                    border: "1.5px solid #E5E7EB", background: "#fff",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${role.color}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: role.color, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13,
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    {role.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{role.label}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>{role.sub}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
              }}
            >
              <svg
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Credentials step */}
          {step === "credentials" && (<>
          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Champ Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "#374151" }}
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@veridia.dz"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: "#F0FFEB",
                  border: "1.5px solid #D1FAE5",
                  color: "#1F2937",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1.5px solid #77D58F";
                  e.target.style.boxShadow = "0 0 0 3px rgba(119,213,143,0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1.5px solid #D1FAE5";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Champ Mot de passe */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold"
                  style={{ color: "#374151" }}
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  className="text-xs font-medium hover:underline transition"
                  style={{ color: "#2D604F" }}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 pr-11"
                  style={{
                    background: "#F0FFEB",
                    border: "1.5px solid #D1FAE5",
                    color: "#1F2937",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1.5px solid #77D58F";
                    e.target.style.boxShadow = "0 0 0 3px rgba(119,213,143,0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1.5px solid #D1FAE5";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9CA3AF" }}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>

            {/* Bouton principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: loading ? "#77D58F" : "#2D604F",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(45,96,79,0.35)",
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#1e4a3a";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#2D604F";
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                "Se connecter"
              )}
            </button>

            {/* Séparateur */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
              <span className="text-xs" style={{ color: "#9CA3AF" }}>
                ou continuer avec
              </span>
              <div className="flex-1 h-px" style={{ background: "#E5E7EB" }} />
            </div>

            {/* Bouton Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E5E7EB",
                color: "#374151",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#77D58F";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(119,213,143,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
              }}
            >
              <GoogleIcon />
              Continuer avec Google
            </button>
          </form>

          {/* Back to role selection */}
          <button
            onClick={() => { setStep("role"); setError(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 13, margin: "4px auto 0" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Changer de rôle
          </button>
          </>)}

          {/* Note d'information */}
          <p className="text-center text-xs" style={{ color: "#9CA3AF" }}>
            Les comptes sont créés par l'administrateur système.
            <br />
            Contactez votre responsable qualité pour un accès.
          </p>

          {/* Footer mobile */}
          <p className="text-center text-xs lg:hidden" style={{ color: "#D1D5DB" }}>
            © 2025 Veridia · QualiaFlow™ · ISO 9001
          </p>
        </div>
      </div>
    </div>
  );
}
