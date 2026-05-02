/**
 * Separador de placar (casa : visitante) usado em toda a interface.
 * Ex.: 0:0, 1:0.
 */
export const MATCH_SCORE_SEP = ":";

/**
 * @param {unknown} homeGoals
 * @param {unknown} awayGoals
 * @returns {{ home: number, away: number }}
 */
export function matchScoreParts(homeGoals, awayGoals) {
  return {
    home: Math.max(0, Math.floor(Number(homeGoals) || 0)),
    away: Math.max(0, Math.floor(Number(awayGoals) || 0)),
  };
}

/**
 * Uma linha só (ex.: acessibilidade ou logs).
 * @param {unknown} homeGoals
 * @param {unknown} awayGoals
 */
export function formatMatchScoreLine(homeGoals, awayGoals) {
  const { home, away } = matchScoreParts(homeGoals, awayGoals);
  return `${home}${MATCH_SCORE_SEP}${away}`;
}
