import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient.js";

/**
 * @param {{ activeOnly?: boolean }} [opts]
 */
export function listPlayers(opts = {}) {
  const q = opts.activeOnly === false ? "?active_only=false" : "";
  return apiGet(`/api/v1/players${q}`);
}

/**
 * @param {{
 *   display_name: string,
 *   skill_stars?: number | null,
 *   profile: string,
 *   position?: string | null,
 *   active?: boolean,
 * }} body
 */
export function createPlayer(body) {
  return apiPost("/api/v1/players", body);
}

/**
 * @param {string} playerId
 * @param {Record<string, unknown>} patch
 */
export function updatePlayer(playerId, patch) {
  return apiPatch(`/api/v1/players/${encodeURIComponent(playerId)}`, patch);
}

/**
 * @param {string} playerId
 */
export function deletePlayer(playerId) {
  return apiDelete(`/api/v1/players/${encodeURIComponent(playerId)}`);
}
