/**
 * Busca de jogadores por nome (normalização para acentos / caixa).
 * Mantido fora de componentes para SRP e reutilização.
 */

/** @param {string} s */
export function foldForSearch(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * @param {Array<Record<string, unknown>>} players
 * @param {string} rawQuery
 */
export function filterPlayersByNameQuery(players, rawQuery) {
  const q = foldForSearch(rawQuery.trim());
  if (!q) return players;
  return players.filter((p) => {
    const name = foldForSearch(/** @type {{ display_name?: string }} */ (p).display_name ?? "");
    return name.includes(q);
  });
}
