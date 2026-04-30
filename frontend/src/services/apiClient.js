/**
 * @returns {string} API base URL without trailing slash (empty = same origin + Vite proxy)
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL ?? "";
  return raw.replace(/\/$/, "");
}

function buildUrl(path) {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

const AUTH_REFRESH_PATH = "/api/v1/auth/refresh";

/** 401 on these paths must not trigger POST /auth/refresh (wrong password, health, etc.). */
const NO_REFRESH_ON_401 = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/refresh",
  "/health",
]);

function shouldAttemptRefresh(path, status) {
  if (status !== 401) return false;
  const normalized = path.split("?")[0];
  return !NO_REFRESH_ON_401.has(normalized);
}

function apiRequestOnce(path, init = {}) {
  const url = buildUrl(path);
  return fetch(url, {
    credentials: "include",
    ...init,
  });
}

let refreshInFlight = null;

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = apiRequestOnce(AUTH_REFRESH_PATH, { method: "POST" })
      .then((r) => r.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Fetch with cookies; on 401 (except auth paths), tries one refresh then retries the request once.
 * @param {string} path
 * @param {RequestInit} [init]
 */
export async function apiRequest(path, init = {}) {
  let res = await apiRequestOnce(path, init);
  if (shouldAttemptRefresh(path, res.status)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await apiRequestOnce(path, init);
    }
  }
  return res;
}

/**
 * @param {string} path
 */
export async function apiGet(path) {
  const res = await apiRequest(path, { method: "GET" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * POST JSON or empty body (logout).
 * @param {string} path
 * @param {Record<string, unknown> | null | undefined} body
 */
export async function apiPost(path, body) {
  /** @type {RequestInit} */
  const init = { method: "POST" };
  if (body !== null && body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await apiRequest(path, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export async function apiPatch(path, body) {
  const res = await apiRequest(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

/**
 * @param {string} path
 */
export async function apiDelete(path) {
  const res = await apiRequest(path, { method: "DELETE" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
}
