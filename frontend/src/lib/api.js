const BASE = "/api/v1";

function getToken() {
  return localStorage.getItem("access_token");
}

export function setTokens(access, refresh, user) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  if (user) localStorage.setItem("current_user", JSON.stringify(user));
}

export function getCurrentUser() {
  const raw = localStorage.getItem("current_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_user");
}

let _refreshing = null;

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("no refresh token");
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error("refresh failed");
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token, {
      id: data.utilisateur_id,
      nom_complet: data.nom_complet,
      email: data.email,
      role: data.role,
    });
    return data.access_token;
  })().finally(() => { _refreshing = null; });
  return _refreshing;
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    let refreshedToken = null;
    try {
      refreshedToken = await tryRefresh();
    } catch {
      clearTokens();
      if (window.location.pathname !== "/login") window.location.replace("/login");
      throw new Error("Session expirée");
    }
    const retryRes = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${refreshedToken}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (retryRes.status === 401) {
      clearTokens();
      if (window.location.pathname !== "/login") window.location.replace("/login");
      throw new Error("Session expirée");
    }
    const retryData = await retryRes.json().catch(() => null);
    if (!retryRes.ok) {
      const msg = retryData?.detail ?? `Erreur ${retryRes.status}`;
      throw new Error(Array.isArray(msg) ? msg[0]?.msg : msg);
    }
    return retryData;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.detail ?? `Erreur ${res.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg : message);
  }
  return data;
}

async function requestBlob(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshedToken = await tryRefresh().catch(() => {
      clearTokens();
      if (window.location.pathname !== "/login") window.location.replace("/login");
      throw new Error("Session expirée");
    });
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${refreshedToken}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.detail ?? `Erreur ${res.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg : message);
  }

  const filename = /filename="?([^";]+)"?/i.exec(
    res.headers.get("Content-Disposition") || "",
  )?.[1];
  return { blob: await res.blob(), filename };
}

async function upload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.detail ?? `Erreur ${res.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg : message);
  }
  return data;
}

export const api = {
  get:    (path)        => request("GET",    path),
  post:   (path, body)  => request("POST",   path, body),
  put:    (path, body)  => request("PUT",    path, body),
  patch:  (path, body)  => request("PATCH",  path, body),
  delete: (path)        => request("DELETE", path),
  postBlob: (path, body) => requestBlob("POST", path, body),
  upload,
};
