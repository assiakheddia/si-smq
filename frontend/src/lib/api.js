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
    clearTokens();
    window.location.href = "/login";
    return;
  }

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
};
