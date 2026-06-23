import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationsPanel, { getUnreadCount } from "../components/NotificationsPanel.jsx";
import { api, clearTokens } from "../lib/api.js";

const C = { dark: "#1e3d2f", primary: "#2D604F", accent: "#77D58F", lightBg: "#eaf5eb", white: "#FAFAFA", border: "#d4e9d7", text: "#1a2e22", muted: "#6b8c75" };

/* ── SVG icons ── */
const UserIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const BellIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const SettingsIcon= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const LockIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const InfoIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const LogOutIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const SunIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const SaveIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const CheckIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const AlertIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const ROLE_LABELS = { admin: "Administrateur", pilote: "Pilote", contributeur: "Contributeur", auditeur: "Auditeur" };

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 99, background: on ? C.primary : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", animation: "fadeUp 0.35s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.primary }}>{icon}</span>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 200 }}>{children}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: `1.5px solid ${C.border}`, background: "#f0ffeb",
  fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "'Plus Jakarta Sans',sans-serif", color: C.text,
};

export default function ParametresPage() {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [activeSection, setActiveSection] = useState("profil");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({ nom: "", prenom: "", email: "", role: "", poste: "", departement: "", telephone: "" });
  const [notifSettings, setNotifSettings] = useState({ publication: true, diagnostic: true, audit: true, rappels: true, email: false, rapport: false });
  const [sysSettings, setSysSettings] = useState({ langue: "fr", theme: "light", dateFormat: "DD/MM/YYYY" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  useEffect(() => {
    setUnread(getUnreadCount());
    api.get("/auth/me").then((me) => {
      setProfile({
        nom: me.nom || "",
        prenom: me.prenom || "",
        email: me.email || "",
        role: ROLE_LABELS[me.role] || me.role || "",
        poste: me.poste || "",
        departement: me.departement || "",
        telephone: me.telephone || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const initials = profile.prenom && profile.nom
    ? `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase()
    : "??";

  const setN = (k) => setNotifSettings((f) => ({ ...f, [k]: !f[k] }));
  const setS = (k, v) => setSysSettings((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async () => {
    setPwdError("");
    if (!passwords.current || !passwords.next) { setPwdError("Tous les champs sont requis."); return; }
    if (passwords.next !== passwords.confirm) { setPwdError("Les mots de passe ne correspondent pas."); return; }
    try {
      await api.put("/auth/me/password", { ancien_password: passwords.current, nouveau_password: passwords.next, confirmer_password: passwords.next });
      setPasswords({ current: "", next: "", confirm: "" });
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 2500);
    } catch (err) {
      setPwdError(err.message || "Erreur lors du changement de mot de passe.");
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  const SECTIONS = [
    { id: "profil",   label: "Profil utilisateur", icon: <UserIcon /> },
    { id: "notifs",   label: "Notifications",       icon: <BellIcon /> },
    { id: "systeme",  label: "Système",             icon: <SettingsIcon /> },
    { id: "securite", label: "Sécurité",            icon: <LockIcon /> },
    { id: "apropos",  label: "À propos",            icon: <InfoIcon /> },
  ];

  const renderSection = () => {
    if (loading && activeSection === "profil") {
      return (
        <div style={{ background: "#fff", borderRadius: 18, padding: "40px", textAlign: "center", color: C.muted }}>
          Chargement du profil…
        </div>
      );
    }

    switch (activeSection) {
      case "profil":
        return (
          <Section icon={<UserIcon />} title="Profil utilisateur">
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "18px", background: C.lightBg, borderRadius: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: "#152b21", flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>{profile.prenom} {profile.nom}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{profile.role}{profile.departement ? ` · ${profile.departement}` : ""}</div>
              </div>
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#78350f", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ color: "#92400e" }}><AlertIcon /></span>
              La modification du profil est gérée par l'administrateur système.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
              {[
                { key: "nom",         label: "Nom" },
                { key: "prenom",      label: "Prénom" },
                { key: "email",       label: "Email",       type: "email" },
                { key: "telephone",   label: "Téléphone",   type: "tel" },
                { key: "role",        label: "Rôle" },
                { key: "departement", label: "Département" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>
                  <input
                    type={type || "text"}
                    value={profile[key]}
                    readOnly
                    style={{ ...inputStyle, background: "#f3f4f6", cursor: "default", color: C.text }}
                  />
                </div>
              ))}
            </div>
          </Section>
        );

      case "notifs":
        return (
          <Section icon={<BellIcon />} title="Préférences de notification">
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Choisissez les événements pour lesquels vous souhaitez recevoir des notifications.</div>
            {[
              { key: "publication", label: "Publication de processus",  sub: "Notif quand un processus est publié" },
              { key: "diagnostic",  label: "Diagnostic SMQ",            sub: "Notif quand un diagnostic est terminé" },
              { key: "audit",       label: "Audits & évaluations",      sub: "Notif sur les audits planifiés et terminés" },
              { key: "rappels",     label: "Rappels d'échéances",       sub: "Rappels sur les dysfonctionnements en retard" },
              { key: "email",       label: "Notifications par email",   sub: "Recevoir les notifications sur votre email" },
              { key: "rapport",     label: "Rapports automatiques",     sub: "Recevoir les bilans mensuels automatiquement" },
            ].map(({ key, label, sub }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
                </div>
                <Toggle on={notifSettings[key]} onChange={() => setN(key)} />
              </div>
            ))}
          </Section>
        );

      case "systeme":
        return (
          <Section icon={<SettingsIcon />} title="Paramètres du système">
            <FieldRow label="Langue d'interface" sub="Langue utilisée dans l'application">
              <div style={{ position: "relative" }}>
                <select value={sysSettings.langue} onChange={(e) => setS("langue", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }}>▾</span>
              </div>
            </FieldRow>

            <FieldRow label="Thème de l'interface" sub="Apparence visuelle de l'application">
              <div style={{ display: "flex", gap: 10 }}>
                {[["light", <SunIcon />, "Clair"], ["dark", <MoonIcon />, "Sombre"]].map(([val, icon, label]) => (
                  <button key={val} onClick={() => setS("theme", val)} style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: `2px solid ${sysSettings.theme === val ? C.primary : C.border}`, background: sysSettings.theme === val ? C.lightBg : "#fff", color: sysSettings.theme === val ? C.primary : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label="Format de date" sub="Format d'affichage des dates">
              <div style={{ position: "relative" }}>
                <select value={sysSettings.dateFormat} onChange={(e) => setS("dateFormat", e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }}>▾</span>
              </div>
            </FieldRow>

            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#856404", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#92400e" }}><AlertIcon /></span>
              Le thème sombre et certaines options système seront disponibles dans une prochaine version.
            </div>
          </Section>
        );

      case "securite":
        return (
          <Section icon={<LockIcon />} title="Sécurité & accès">
            <div style={{ background: C.lightBg, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>Session active</div>
              <div style={{ fontSize: 13, color: C.muted }}>Connecté depuis : {profile.email || "—"}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Date : {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: 16 }}>Changer le mot de passe</div>
              {pwdError && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 14 }}>{pwdError}</div>
              )}
              {[
                { key: "current", label: "Mot de passe actuel",           placeholder: "••••••••" },
                { key: "next",    label: "Nouveau mot de passe",           placeholder: "••••••••" },
                { key: "confirm", label: "Confirmer le nouveau mot de passe", placeholder: "••••••••" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type="password" value={passwords[key]} onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                    style={{ ...inputStyle }}
                    onFocus={(e) => e.target.style.borderColor = C.primary}
                    onBlur={(e) => e.target.style.borderColor = C.border}
                  />
                </div>
              ))}
              {pwdSaved && (
                <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckIcon /> Mot de passe mis à jour avec succès.
                </div>
              )}
              <button onClick={handlePasswordChange} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                Mettre à jour le mot de passe
              </button>
            </div>

            <div style={{ paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 10 }}>Zone dangereuse</div>
              <button onClick={handleLogout} style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid #fca5a5", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Se déconnecter
              </button>
            </div>
          </Section>
        );

      case "apropos":
        return (
          <Section icon={<InfoIcon />} title="À propos de VERIDIA">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: "20px", background: `linear-gradient(135deg, ${C.primary}, #3a7a62)`, borderRadius: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #5ecf7a, #2d9e5f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,255,255,0.15)" />
                  <circle cx="12" cy="12" r="2.5" fill="white" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: 2 }}>VERIDIA</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Système de Management de la Qualité — ISO 9001</div>
              </div>
            </div>

            {[
              { label: "Version",            value: "1.0.0-beta" },
              { label: "Environnement",      value: "Production" },
              { label: "Établissement",      value: "École Nationale Supérieure d'Informatique (ESI)" },
              { label: "Norme de référence", value: "ISO 9001:2015" },
              { label: "Développé avec",     value: "React 19 · Vite · Python FastAPI" },
              { label: "Dernière mise à jour", value: new Date().toLocaleDateString("fr-FR") },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 20, fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.7 }}>
              © 2026 VERIDIA SMQ. Tous droits réservés.<br />
              Conçu pour simplifier la gestion qualité ISO 9001.
            </div>
          </Section>
        );

      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .par-wrap { padding: clamp(14px,2vw,20px) clamp(14px,2.5vw,26px) 48px; min-height:100vh; background:#eaf5eb; font-family:'Plus Jakarta Sans',sans-serif; }
        .par-topbar { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e8ede9; border-radius:clamp(12px,1.3vw,16px); height:clamp(52px,6vw,62px); padding:0 clamp(12px,1.5vw,20px); margin-bottom:clamp(16px,2vw,24px); box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:fadeUp 0.3s ease; gap:10px; }
        .par-tb-r { display:flex; align-items:center; gap:clamp(6px,0.9vw,12px); }
        .par-icon-btn { height:34px; min-width:34px; border-radius:10px; border:1px solid #e8eaed; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; padding:0 10px; position:relative; transition:all 0.15s; }
        .par-icon-btn:hover { background:#f3f5f7; transform:translateY(-1px); }
        .par-n-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid white; }
        .par-u-chip { display:flex; align-items:center; gap:8px; background:#f3f5f7; border:1px solid #e8eaed; border-radius:11px; padding:4px 10px 4px 5px; cursor:pointer; transition:all 0.15s; }
        .par-u-chip:hover { background:#ebeef1; }
        .par-u-av { width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#5ecf7a,#2d9e5f); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:900; font-size:10px; color:#152b21; }
        .par-sidebar-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; cursor:pointer; transition:all 0.15s; border:1.5px solid transparent; }
        .par-sidebar-item:hover { background:rgba(45,96,79,0.06); }
        .par-sidebar-item.active { background:#f0fdf4; border-color:#bbf7d0; }
        .par-layout { display:grid; grid-template-columns:220px 1fr; gap:20px; align-items:start; }
        @media (max-width:900px) { .par-layout { grid-template-columns:1fr; } }
      `}</style>

      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}

      {saved && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: C.primary, color: "#fff", borderRadius: 12, padding: "14px 22px", fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "fadeUp 0.3s ease", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckIcon /> Modifications enregistrées
        </div>
      )}

      <div className="par-wrap">
        {/* Topbar */}
        <div className="par-topbar">
          <div style={{ fontSize: 14, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/processus")}>Tableau de bord</span>
            <span style={{ color: C.border }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>Paramètres</span>
          </div>
          <div className="par-tb-r">
            <div className="par-icon-btn" onClick={() => setShowNotifs((v) => !v)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              {unread > 0 && <span className="par-n-dot" />}
            </div>
            <div className="par-u-chip" onClick={() => navigate("/parametres")}>
              <div className="par-u-av">{initials}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{profile.prenom} {profile.nom}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{profile.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page header */}
        <div style={{ marginBottom: 22, animation: "fadeUp 0.3s ease 0.05s both" }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: "clamp(20px,2.5vw,28px)", color: "#111" }}>Paramètres</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Gérez votre profil, vos préférences et la configuration du système</div>
        </div>

        <div className="par-layout">
          {/* Sidebar */}
          <div style={{ background: "#fff", borderRadius: 18, padding: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", animation: "fadeUp 0.35s ease 0.08s both" }}>
            {SECTIONS.map((sec) => (
              <div
                key={sec.id}
                className={`par-sidebar-item ${activeSection === sec.id ? "active" : ""}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <span style={{ color: activeSection === sec.id ? C.primary : C.muted }}>{sec.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: activeSection === sec.id ? C.primary : C.text }}>{sec.label}</span>
                {activeSection === sec.id && <span style={{ marginLeft: "auto", color: C.accent, fontWeight: 700 }}>›</span>}
              </div>
            ))}

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <div className="par-sidebar-item" onClick={handleLogout} style={{ color: "#991b1b" }}>
                <span style={{ color: "#991b1b" }}><LogOutIcon /></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>Déconnexion</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            {renderSection()}

            {activeSection !== "apropos" && activeSection !== "securite" && activeSection !== "profil" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button style={{ padding: "10px 22px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  Annuler
                </button>
                <button onClick={handleSave} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(45,96,79,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
                  <SaveIcon /> Enregistrer les modifications
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
