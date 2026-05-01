import { apiGet, apiPatch, apiPost } from "./apiClient.js";

/** @returns {Promise<Record<string, unknown>>} */
export function getMatchDayToday() {
  return apiGet("/api/v1/match-day/today");
}

/** @returns {Promise<Record<string, unknown>>} */
export function postMatchDayDraw() {
  return apiPost("/api/v1/match-day/today/draw", {});
}

/**
 * @param {{
 *   default_match_duration_seconds?: number,
 *   default_max_goals_per_team?: number,
 *   team_count?: number,
 *   players_per_team?: number,
 *   fixed_goalkeepers_enabled?: boolean,
 *   fixed_goalkeeper_player_id_1?: string | null,
 *   fixed_goalkeeper_player_id_2?: string | null,
 *   phase?: string,
 * }} patch
 * @returns {Promise<Record<string, unknown>>}
 */
export function patchMatchDayTodaySettings(patch) {
  return apiPatch("/api/v1/match-day/today/settings", patch);
}

/** @param {string} fixtureId @returns {Promise<Record<string, unknown>>} */
export function postFixtureStart(fixtureId) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/start`, {});
}

/** @param {string} fixtureId @returns {Promise<Record<string, unknown>>} */
export function postFixtureFinish(fixtureId) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/finish`, {});
}

/**
 * @param {string} fixtureId
 * @param {{ type: string, team_slot: number, player_id?: string | null, elapsed_seconds?: number | null }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function postFixtureEvent(fixtureId, body) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/events`, body);
}

/** @param {string} fixtureId @returns {Promise<unknown[]>} */
export function listFixtureEvents(fixtureId) {
  return apiGet(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/events`);
}
