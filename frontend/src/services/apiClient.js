/**
 * @returns {string} API base URL without trailing slash
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL ?? "";
  return raw.replace(/\/$/, "");
}

/**
 * @param {string} path - absolute path starting with / (e.g. /health)
 */
export async function apiGet(path) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
