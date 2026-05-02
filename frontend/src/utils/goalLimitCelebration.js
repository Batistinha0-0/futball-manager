import { listFixtureEvents } from "../services/matchdayApi.js";

/** @param {Record<string, unknown>} rec */
function eventRecordedAtMs(rec) {
  const s = rec.recorded_at;
  if (s == null) return 0;
  const t = new Date(String(s)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** @param {Record<string, unknown> | null | undefined} sess */
export function isKingModeSession(sess) {
  return Number(sess?.team_count ?? 0) > 2 && Boolean(sess?.king_queue);
}

/**
 * Partida encerrada com pelo menos um time no teto de gols da sub-partida.
 * @param {Record<string, unknown>} f
 */
export function fixtureFinishedAtGoalCap(f) {
  if (String(f?.status ?? "") !== "finished") return false;
  const mx = Number(f?.max_goals_per_team ?? 0);
  if (mx <= 0) return false;
  const hg = Number(f?.home_goals ?? 0);
  const ag = Number(f?.away_goals ?? 0);
  return hg >= mx || ag >= mx;
}

/**
 * Mostrar celebração: rei da quadra (≥3 times + fila) ou dois times ao encerrar no teto.
 * @param {Record<string, unknown>} f
 * @param {Record<string, unknown> | null | undefined} sess
 */
export function shouldCelebrateGoalCapFinish(f, sess) {
  if (!sess || !fixtureFinishedAtGoalCap(f)) return false;
  if (isKingModeSession(sess)) return true;
  return Number(sess.team_count ?? 0) === 2;
}

/**
 * @param {Record<string, string>} str
 * @param {number} slot
 */
function teamLabel(str, slot) {
  return str.matchDayTeamN.replace("{n}", String(slot));
}

/**
 * @typedef {{
 *   title: string,
 *   scoreHome: number,
 *   scoreAway: number,
 *   goalLines: string[],
 *   rotationLine: string | null,
 *   finishedFixtureId: string,
 * }} GoalLimitCelebrationPayload
 */

/**
 * @param {string} finishedFixtureId
 * @param {Record<string, unknown> | null | undefined} todayData
 * @param {Array<{ id: unknown, display_name?: string }>} players
 * @param {Record<string, string>} str
 * @returns {Promise<GoalLimitCelebrationPayload | null>}
 */
export async function buildGoalLimitCelebrationPayload(finishedFixtureId, todayData, players, str) {
  const sess = /** @type {Record<string, unknown> | undefined} */ (todayData?.session);
  if (!sess) return null;
  const fxs = Array.isArray(sess.fixtures) ? /** @type {Record<string, unknown>[]} */ (sess.fixtures) : [];
  const f = fxs.find((x) => String(x.id) === String(finishedFixtureId));
  if (!f || !shouldCelebrateGoalCapFinish(f, sess)) return null;

  const hg = Number(f.home_goals ?? 0);
  const ag = Number(f.away_goals ?? 0);
  const hs = Number(f.home_team_slot);
  const as_ = Number(f.away_team_slot);
  const homeTeam = teamLabel(str, hs);
  const awayTeam = teamLabel(str, as_);

  const king = isKingModeSession(sess);
  const pending = fxs.filter((x) => String(x.status) === "pending");
  const nextFx = pending.reduce(
    (best, x) => (!best || Number(x.order_index) > Number(best.order_index) ? x : best),
    /** @type {Record<string, unknown> | null} */ (null),
  );

  const titleDraw = hg === ag;
  /** @type {number | null} */
  let winnerSlot = null;
  /** @type {number | null} */
  let loserSlot = null;
  /** @type {number | null} */
  let incomingSlot = null;

  if (king && nextFx) {
    const nhNext = Number(nextFx.home_team_slot);
    incomingSlot = Number(nextFx.away_team_slot);
    if (hg > ag) {
      winnerSlot = hs;
      loserSlot = as_;
    } else if (ag > hg) {
      winnerSlot = as_;
      loserSlot = hs;
    } else {
      loserSlot = hs === nhNext ? as_ : hs;
      winnerSlot = nhNext;
    }
  } else if (!titleDraw) {
    if (hg > ag) {
      winnerSlot = hs;
      loserSlot = as_;
    } else {
      winnerSlot = as_;
      loserSlot = hs;
    }
  }

  /** @type {string} */
  let title;
  if (titleDraw) {
    title = str.matchLiveGoalLimitTitleDraw;
  } else if (winnerSlot != null) {
    title = str.matchLiveGoalLimitTitleWin.replace("{team}", teamLabel(str, winnerSlot));
  } else {
    title = str.matchLiveGoalLimitTitleDraw;
  }

  /** @type {string[]} */
  const goalLines = [];
  try {
    const raw = await listFixtureEvents(finishedFixtureId);
    if (Array.isArray(raw)) {
      const goals = /** @type {Record<string, unknown>[]} */ (raw)
        .filter((e) => String(e.type) === "goal")
        .sort((a, b) => eventRecordedAtMs(a) - eventRecordedAtMs(b));
      for (const e of goals) {
        const slot = Number(e.team_slot);
        const team = slot === hs ? homeTeam : awayTeam;
        const pid = e.player_id != null ? String(e.player_id) : "";
        const name = pid
          ? String(players.find((p) => String(p.id) === pid)?.display_name ?? "").trim()
          : "";
        goalLines.push(
          name
            ? str.matchLiveGoalLimitGoalLine.replace("{name}", name).replace("{team}", team)
            : str.matchLiveGoalLimitGoalLineAnon.replace("{team}", team),
        );
      }
    }
  } catch {
    /* ignore */
  }

  let rotationLine = null;
  if (king && nextFx && incomingSlot != null && loserSlot != null) {
    rotationLine = str.matchLiveGoalLimitRotation
      .replace("{incoming}", teamLabel(str, incomingSlot))
      .replace("{loser}", teamLabel(str, loserSlot));
  }

  return {
    title,
    scoreHome: hg,
    scoreAway: ag,
    goalLines,
    rotationLine,
    finishedFixtureId: String(finishedFixtureId),
  };
}
