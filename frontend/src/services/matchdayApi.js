import { apiGet, apiPatch, apiPost } from "./apiClient.js";

/** @param {string | null | undefined} sessionDate */
function sessionDateSuffix(sessionDate) {
  if (!sessionDate) return "";
  return `?session_date=${encodeURIComponent(sessionDate)}`;
}

/** @returns {Promise<Record<string, unknown>[]>} */
export function getMatchDayRecentSessions() {
  return apiGet("/api/v1/match-day/recent-sessions");
}

/**
 * @param {string | null | undefined} [sessionDate] YYYY-MM-DD; omitir = hoje no servidor
 * @returns {Promise<Record<string, unknown>>}
 */
export function getMatchDayToday(sessionDate) {
  return apiGet(`/api/v1/match-day/today${sessionDateSuffix(sessionDate)}`);
}

/**
 * @param {string | null | undefined} [sessionDate]
 * @returns {Promise<Record<string, unknown>>}
 */
export function postMatchDayDraw(sessionDate) {
  return apiPost(`/api/v1/match-day/today/draw${sessionDateSuffix(sessionDate)}`, {});
}

/**
 * Libera a UI da aba Partida (sem iniciar o cronômetro) — após segurar o apito na Início.
 * @param {string | null | undefined} [sessionDate]
 * @returns {Promise<Record<string, unknown>>}
 */
export function postUnlockPartidaBoard(sessionDate) {
  return apiPost(`/api/v1/match-day/today/unlock-partida-board${sessionDateSuffix(sessionDate)}`, {});
}

/**
 * @param {string | null | undefined} [sessionDate]
 * @returns {Promise<Record<string, unknown>>}
 */
export function postCloseMatchDay(sessionDate) {
  return apiPost(`/api/v1/match-day/today/close-day${sessionDateSuffix(sessionDate)}`, {});
}

/**
 * @param {Record<string, unknown>} patch
 * @param {string | null | undefined} [sessionDate]
 * @returns {Promise<Record<string, unknown>>}
 */
export function patchMatchDayTodaySettings(patch, sessionDate) {
  return apiPatch(`/api/v1/match-day/today/settings${sessionDateSuffix(sessionDate)}`, patch);
}

/** @param {string} fixtureId @returns {Promise<Record<string, unknown>>} */
export function postFixtureStart(fixtureId) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/start`, {});
}

/** @param {string} fixtureId @returns {Promise<Record<string, unknown>>} */
export function postFixtureFinish(fixtureId) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/finish`, {});
}

/** @param {string} fixtureId @returns {Promise<Record<string, unknown>>} */
export function postFixtureTimeExpired(fixtureId) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/time-expired`, {});
}

/**
 * @param {string} fixtureId
 * @param {{ type: "goal"|"goalkeeper_save"|"assist"|"yellow_card"|"red_card", team_slot: number, player_id?: string | null, elapsed_seconds?: number | null }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export function postFixtureEvent(fixtureId, body) {
  return apiPost(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/events`, body);
}

/** @param {string} fixtureId @returns {Promise<unknown[]>} */
export function listFixtureEvents(fixtureId) {
  return apiGet(`/api/v1/match-day/today/fixtures/${encodeURIComponent(fixtureId)}/events`);
}
