/**
 * Relógio tipo MM:SS (ex.: 01:05).
 * @param {number} totalSeconds
 */
export function formatMatchClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Tempo na linha de eventos (ex.: 4:37), sem zero à esquerda nos minutos.
 * @param {number} totalSeconds
 */
export function formatMatchEventTime(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
