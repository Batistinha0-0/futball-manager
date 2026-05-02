/** @typedef {{ x: number, y: number }} PitchSlot */

/**
 * Posições do time que defende o gol ao norte (y ≈ 0), em metros no viewBox 68×105.
 * Índice 0 = goleiro. Formações inspiradas em society (losango, 2-2-1, 3-3-1) e
 * linhas compactas de campo (3-2-1, etc.). Campo próprio fica abaixo da linha média (y &lt; 52,5).
 * @type {Record<number, ReadonlyArray<readonly [number, number]>>}
 */
const NORTH_HOME_SLOTS = {
  /** 1 — só GR */
  1: [[34, 5.3]],
  /** 2 — GR + último homem (sweep) ao centro */
  2: [
    [34, 5.3],
    [34, 21],
  ],
  /** 3 — GR + linha de 2 (zaga “na frente do goleiro”, society) */
  3: [
    [34, 5.3],
    [21, 17.5],
    [47, 17.5],
  ],
  /** 4 — triângulo 1-2 (GR + volante + duas alas; sem referência fixa) */
  4: [
    [34, 5.3],
    [34, 16.5],
    [18, 31],
    [50, 31],
  ],
  /** 5 — losango 1-2-1 (volante, alas e referência) */
  5: [
    [34, 5.3],
    [34, 15],
    [18, 28],
    [50, 28],
    [34, 43],
  ],
  /** 6 — 2-2-1 (dupla de zaga, dupla no meio, centroavante) */
  6: [
    [34, 5.3],
    [17, 16.5],
    [51, 16.5],
    [19, 31],
    [49, 31],
    [34, 45.5],
  ],
  /** 7 — 3-2-1 (linha de três, dois meias, ponta) */
  7: [
    [34, 5.3],
    [13, 16],
    [34, 15.2],
    [55, 16],
    [22, 31.5],
    [46, 31.5],
    [34, 46],
  ],
  /** 8 — 3-3-1 (três defesas, três meios, um atacante central) */
  8: [
    [34, 5.3],
    [12, 15.8],
    [34, 14.8],
    [56, 15.8],
    [12, 31.5],
    [34, 32.8],
    [56, 31.5],
    [34, 47],
  ],
};

export const PITCH_PLAYERS_PER_SIDE_MIN = 1;
export const PITCH_PLAYERS_PER_SIDE_MAX = 8;

/**
 * @param {number} raw
 * @returns {number}
 */
export function clampPlayersPerSide(raw) {
  const n = Math.round(Number(raw));
  if (Number.isNaN(n)) return 6;
  return Math.min(PITCH_PLAYERS_PER_SIDE_MAX, Math.max(PITCH_PLAYERS_PER_SIDE_MIN, n));
}

/**
 * @param {number} n jogadores por time (1–8), incluindo GR.
 * @returns {{ home: PitchSlot[], visitor: PitchSlot[] }}
 */
export function getPitchSlotsForSides(n) {
  const count = clampPlayersPerSide(n);
  const tpl = NORTH_HOME_SLOTS[count];
  const home = tpl.map(([x, y]) => ({ x, y }));
  const visitor = tpl.map(([x, y]) => ({ x, y: 105 - y }));
  return { home, visitor };
}
