/**
 * Rotas da área de relatórios (sessão YYYY-MM-DD ou lista “hoje” no servidor).
 */

/**
 * @param {string | null | undefined} sessionDate `YYYY-MM-DD` ou null = visão padrão (/relatorios)
 * @returns {string} pathname relativo ao router
 */
export function matchDayReportsPathForSessionDate(sessionDate) {
  const d = sessionDate != null && String(sessionDate).trim() !== "" ? String(sessionDate).trim() : null;
  if (d == null) return "/relatorios";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "/relatorios";
  return `/relatorios/dia/${d}`;
}
