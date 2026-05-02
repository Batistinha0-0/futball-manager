/**
 * Data da sessão de match-day selecionada na UI (null = dia atual no servidor).
 * Módulo leve para sincronizar vários consumidores de `useMatchDayToday` e persistir em localStorage.
 */

const LS_KEY = "fm-match-day-session-date";

/**
 * Valor do picker “Ver dados de qual dia” para o dia atual no servidor (`null` na store).
 * Evita `value=""` (colisão com `session_date` vazio / bugs de select customizado).
 */
export const MATCH_DAY_SESSION_PICKER_TODAY = "__fm_session_today__";

/** @type {string | null} */
let sessionDate = null;

function readFromStorage() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return v;
  } catch {
    return null;
  }
}

sessionDate = readFromStorage();

/** @type {Set<() => void>} */
const listeners = new Set();

/** @returns {string | null} */
export function getMatchDaySessionDate() {
  return sessionDate;
}

/** @param {string | null} next */
export function setMatchDaySessionDate(next) {
  const n = next && String(next).trim() !== "" ? String(next).trim() : null;
  if (n === sessionDate) return;
  sessionDate = n;
  try {
    if (n) localStorage.setItem(LS_KEY, n);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => {
    fn();
  });
}

/** @param {() => void} fn @returns {() => void} */
export function subscribeMatchDaySessionDate(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
