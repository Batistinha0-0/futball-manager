/**
 * Escalação no campo ao vivo: goleiros fixos permanecem no slot 0 (meta norte = casa, sul = visitante),
 * alinhado a gol A / gol B nas configurações do dia.
 */

/**
 * @param {string} id
 * @param {Array<{ id: unknown, display_name?: string }>} players
 */
function displayNameForId(id, players) {
  const p = players.find((x) => String(x.id) === String(id));
  return String(p?.display_name ?? id).trim();
}

/**
 * @param {unknown[] | null | undefined} playerIds
 * @param {string | null | undefined} fixedAtSlot0
 * @param {string | null | undefined} otherFixedId excluir o GR do outro gol da lista de campo
 * @param {number} cap
 * @param {Array<{ id: unknown, display_name?: string }>} players
 * @returns {{ ids: string[], names: string[] }}
 */
export function buildAnchoredSideLineup(playerIds, fixedAtSlot0, otherFixedId, cap, players) {
  const fixed = fixedAtSlot0 != null && String(fixedAtSlot0).trim() ? String(fixedAtSlot0).trim() : null;
  const other = otherFixedId != null && String(otherFixedId).trim() ? String(otherFixedId).trim() : null;
  const raw = Array.isArray(playerIds) ? playerIds.map((x) => String(x)) : [];
  const rest = raw.filter((id) => id && id !== fixed && id !== other);
  const ordered = fixed ? [fixed, ...rest] : [...rest];
  const ids = ordered.slice(0, cap);
  const names = ids.map((id) => displayNameForId(id, players));
  return { ids, names };
}

/**
 * Goleiro fixo fora do `player_ids` do time sorteado conta como jogador extra na formação (ex.: 5 de linha + 1 GR = 6 no campo).
 * @param {unknown[] | null | undefined} teamPlayerIds
 * @param {number} baseCap `players_per_team` já limitado a 1–8
 * @param {string | null | undefined} fixedForThisSide id do GR fixo deste gol (slot 0)
 */
export function sidePitchCapWithExternalFixedGk(teamPlayerIds, baseCap, fixedForThisSide) {
  const cap = Math.min(8, Math.max(1, Math.round(Number(baseCap)) || 6));
  const fid = fixedForThisSide != null && String(fixedForThisSide).trim() ? String(fixedForThisSide).trim() : null;
  if (!fid) return cap;
  const inTeam = (teamPlayerIds ?? []).some((id) => String(id) === fid);
  if (inTeam) return cap;
  return Math.min(8, cap + 1);
}

/**
 * @param {{
 *   fixedGoalkeepersEnabled: boolean,
 *   fixedGoalkeeperPlayerId1: string | null | undefined,
 *   fixedGoalkeeperPlayerId2: string | null | undefined,
 *   homePlayerIds: unknown[] | null | undefined,
 *   visitorPlayerIds: unknown[] | null | undefined,
 *   playersPerSide: number,
 *   players: Array<{ id: unknown, display_name?: string }>,
 * }} p
 * @returns {{ homeNames: string[], visitorNames: string[], homeIds: string[], visitorIds: string[], pitchSlotCount: number }}
 */
export function buildLivePitchLineupsWithFixedGoalkeepers(p) {
  const players = p.players;
  const baseCap = Math.min(8, Math.max(1, Math.round(Number(p.playersPerSide)) || 6));
  const enabled = Boolean(p.fixedGoalkeepersEnabled);
  const g1 = p.fixedGoalkeeperPlayerId1 != null && String(p.fixedGoalkeeperPlayerId1).trim()
    ? String(p.fixedGoalkeeperPlayerId1).trim()
    : null;
  const g2 =
    p.fixedGoalkeeperPlayerId2 != null && String(p.fixedGoalkeeperPlayerId2).trim()
      ? String(p.fixedGoalkeeperPlayerId2).trim()
      : null;

  if (!enabled) {
    const h = buildAnchoredSideLineup(p.homePlayerIds, null, null, baseCap, players);
    const v = buildAnchoredSideLineup(p.visitorPlayerIds, null, null, baseCap, players);
    return {
      homeNames: h.names,
      visitorNames: v.names,
      homeIds: h.ids,
      visitorIds: v.ids,
      pitchSlotCount: baseCap,
    };
  }

  const homeCap = sidePitchCapWithExternalFixedGk(p.homePlayerIds, baseCap, g1);
  const visitorCap = sidePitchCapWithExternalFixedGk(p.visitorPlayerIds, baseCap, g2);
  const pitchSlotCount = Math.min(8, Math.max(1, homeCap, visitorCap));

  const home = buildAnchoredSideLineup(p.homePlayerIds, g1, g2, homeCap, players);
  const visitor = buildAnchoredSideLineup(p.visitorPlayerIds, g2, g1, visitorCap, players);
  return {
    homeNames: home.names,
    visitorNames: visitor.names,
    homeIds: home.ids,
    visitorIds: visitor.ids,
    pitchSlotCount,
  };
}
