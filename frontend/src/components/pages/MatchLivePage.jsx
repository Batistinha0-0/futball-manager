import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { useAuthMe } from "../../hooks/useAuthMe.js";
import { useMatchDayToday } from "../../hooks/useMatchDayToday.js";
import { usePlayers } from "../../hooks/usePlayers.js";
import { sandboxSaveHasStats } from "../../utils/sandboxMatchFromModalSave.js";
import { listFixtureEvents } from "../../services/matchdayApi.js";
import { FootballPitchTopDown } from "../organisms/FootballPitchTopDown.jsx";
import { MatchLivePanel } from "../organisms/MatchLivePanel.jsx";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";
import { Text } from "../atoms/Text.jsx";
import { MatchDayCloseDayHold } from "../molecules/MatchDayCloseDayHold.jsx";
import { GoalLimitCelebrationModal } from "../organisms/GoalLimitCelebrationModal.jsx";
import { LoadingBlock } from "../molecules/LoadingBlock.jsx";
import {
  buildGoalLimitCelebrationPayload,
  shouldCelebrateGoalCapFinish,
} from "../../utils/goalLimitCelebration.js";
import { buildLivePitchLineupsWithFixedGoalkeepers } from "../../utils/matchLivePitchLineups.js";
import { matchDayHomePath } from "../../utils/matchDayHomeRoutes.js";
import { matchDayReportsPathForSessionDate } from "../../utils/matchDayReportsRoutes.js";
import { setMatchDaySessionDate } from "../../stores/matchDaySessionDateStore.js";

/** @param {{ permissions?: string[] }} user */
function userCanWritePlayers(user) {
  return Boolean(user?.permissions?.includes("players:write"));
}

/**
 * @param {string} displayName
 * @param {string[]} playerIds
 * @param {Array<{ id: unknown, display_name?: string }>} players
 */
function resolvePlayerId(displayName, playerIds, players) {
  const trimmed = (displayName || "").trim().toLowerCase();
  if (!trimmed) return null;
  for (const id of playerIds) {
    const p = players.find((x) => String(x.id) === String(id));
    const name = String(p?.display_name ?? "").trim().toLowerCase();
    if (name === trimmed) return String(id);
  }
  return null;
}

/**
 * @param {string | null | undefined} startedAt
 * @param {number} serverSkewMs
 * @param {boolean} active
 */
function useApproxElapsed(startedAt, serverSkewMs, active) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) {
      setSec(0);
      return undefined;
    }
    const tick = () => {
      const started = new Date(String(startedAt)).getTime();
      setSec(Math.max(0, Math.floor((Date.now() + serverSkewMs - started) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, startedAt, serverSkewMs]);
  return sec;
}

/** @param {Record<string, unknown>} rec */
function eventRecordedAtMs(rec) {
  const s = rec.recorded_at;
  if (s == null) return 0;
  const t = new Date(String(s)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Segundos decorridos no jogo para o eixo da timeline: preferir diferença real
 * (`recorded_at` − início da partida) quando `elapsed_seconds` não veio preenchido.
 * @param {Record<string, unknown>} rec
 * @param {string | null | undefined} fixtureStartedAtIso
 */
function inferElapsedSeconds(rec, fixtureStartedAtIso) {
  const startedRaw = fixtureStartedAtIso != null ? String(fixtureStartedAtIso).trim() : "";
  const startedMs = startedRaw ? new Date(startedRaw).getTime() : NaN;
  const recMs = eventRecordedAtMs(rec);
  const raw = rec.elapsed_seconds;
  const rawN =
    raw != null && raw !== "" && !Number.isNaN(Math.floor(Number(raw)))
      ? Math.max(0, Math.floor(Number(raw)))
      : null;

  if (!Number.isNaN(startedMs) && startedMs > 0 && recMs >= startedMs) {
    const inferred = Math.max(0, Math.floor((recMs - startedMs) / 1000));
    if (rawN == null) return inferred;
    if (rawN === 0 && inferred > 0) return inferred;
    if (rawN > 0) return rawN;
    return inferred;
  }
  if (rawN != null) return rawN;
  return 0;
}

/**
 * @param {Record<string, unknown> | null} today
 * @param {string} fixtureId
 * @returns {string | null}
 */
function pickStartedAtFromToday(today, fixtureId) {
  if (!today) return null;
  const sess = /** @type {Record<string, unknown> | undefined} */ (today.session);
  const fxs = /** @type {Record<string, unknown>[] | undefined} */ (sess?.fixtures);
  if (!Array.isArray(fxs)) return null;
  const fx = fxs.find((f) => String(f.id) === String(fixtureId));
  if (!fx || fx.started_at == null || fx.started_at === "") return null;
  return String(fx.started_at);
}

/**
 * Liga assistências ao gol mais recente do mesmo `team_slot` antes delas (até 2 min), para não duplicar linhas na timeline.
 * @param {Record<string, unknown>[]} ascending
 * @param {Array<{ id: unknown, display_name?: string }>} players
 */
function pairAssistsToGoals(ascending, players) {
  const displayNameFor = (playerId) => {
    const s = playerId != null ? String(playerId) : "";
    if (!s) return "";
    return String(players.find((x) => String(x.id) === s)?.display_name ?? "").trim();
  };
  /** @type {Map<string, string>} */
  const goalIdToAssistName = new Map();
  const consumedAssistIds = new Set();
  const maxDeltaMs = 120_000;

  for (let i = 0; i < ascending.length; i++) {
    const ev = ascending[i];
    if (String(ev.type ?? "") !== "assist") continue;
    const assistName = displayNameFor(ev.player_id);
    if (!assistName) continue;
    const assistSlot = Number(ev.team_slot);
    const assistT = eventRecordedAtMs(ev);

    for (let j = i - 1; j >= 0; j--) {
      const prev = ascending[j];
      if (String(prev.type ?? "") !== "goal") continue;
      if (Number(prev.team_slot) !== assistSlot) continue;
      const goalT = eventRecordedAtMs(prev);
      if (assistT < goalT) continue;
      if (assistT - goalT > maxDeltaMs) break;
      const gid = String(prev.id ?? "");
      if (!goalIdToAssistName.has(gid)) {
        goalIdToAssistName.set(gid, assistName);
        consumedAssistIds.add(String(ev.id ?? ""));
        break;
      }
    }
  }
  return { goalIdToAssistName, consumedAssistIds };
}

/**
 * @param {unknown} raw
 * @param {number} homeSlot
 * @param {number} awaySlot
 * @param {Array<{ id: unknown, display_name?: string }>} players
 * @param {string | null | undefined} fixtureStartedAtIso início da partida (fixture `started_at`) para inferir o minutagem na timeline
 */
function mapFixtureEventsToTimeline(raw, homeSlot, awaySlot, players, fixtureStartedAtIso) {
  if (!Array.isArray(raw)) return [];
  const normalized = raw.map((ev) => /** @type {Record<string, unknown>} */ (ev));
  const ascending = [...normalized].sort((a, b) => {
    const diff = eventRecordedAtMs(a) - eventRecordedAtMs(b);
    if (diff !== 0) return diff;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
  const { goalIdToAssistName, consumedAssistIds } = pairAssistsToGoals(ascending, players);

  const descending = ascending
    .filter((ev) => !consumedAssistIds.has(String(ev.id ?? "")))
    .sort((a, b) => {
      const diff = eventRecordedAtMs(b) - eventRecordedAtMs(a);
      if (diff !== 0) return diff;
      return String(b.id ?? "").localeCompare(String(a.id ?? ""));
    });

  return descending.map((rec) => {
    const teamSlot = Number(rec.team_slot);
    const team = teamSlot === homeSlot ? "home" : "visitor";
    const pid = rec.player_id != null ? String(rec.player_id) : "";
    const displayName = pid
      ? String(players.find((x) => String(x.id) === pid)?.display_name ?? "").trim()
      : "";
    const type = String(rec.type ?? "");
    let message = strings.matchLiveTimelineUnknown;
    /** @type {string | null} */
    let subMessage = null;

    if (type === "goal") {
      message = displayName
        ? strings.matchLiveTimelineGoalScored.replace("{name}", displayName)
        : strings.matchLiveTimelineGoalScoredAnonymous;
      const assistName = goalIdToAssistName.get(String(rec.id ?? ""));
      if (assistName) {
        subMessage = strings.matchLiveTimelineAssistUnderGoal.replace("{name}", assistName);
      }
    } else if (type === "goalkeeper_save") {
      message = displayName
        ? strings.matchLiveTimelineSaveNamed.replace("{name}", displayName)
        : strings.matchLiveTimelineSave;
    } else if (type === "assist") {
      message = displayName
        ? strings.matchLiveTimelineAssistNamed.replace("{name}", displayName)
        : strings.matchLiveTimelineAssist;
    } else if (type === "yellow_card") {
      message = displayName
        ? strings.matchLiveTimelineYellowNamed.replace("{name}", displayName)
        : strings.matchLiveTimelineYellow;
    } else if (type === "red_card") {
      message = displayName
        ? strings.matchLiveTimelineRedNamed.replace("{name}", displayName)
        : strings.matchLiveTimelineRed;
    }
    return {
      id: String(rec.id ?? ""),
      atSecond: inferElapsedSeconds(rec, fixtureStartedAtIso),
      team,
      message,
      subMessage,
    };
  });
}

export function MatchLivePage() {
  const navigate = useNavigate();
  const md = useMatchDayToday();
  const homeHref = useMemo(() => matchDayHomePath(), []);

  useEffect(() => {
    setMatchDaySessionDate(null);
  }, []);
  const { user } = useAuthMe();
  const canWrite = userCanWritePlayers(/** @type {{ permissions?: string[] }} */ (user ?? {}));
  const { players } = usePlayers({ activeOnly: true });
  const session = /** @type {Record<string, unknown> | undefined} */ (md.today?.session);
  const fixtures = /** @type {Record<string, unknown>[] } */ (session?.fixtures ?? []);
  const teams = /** @type {Array<{ slot: number, player_ids: string[] }>} */ (
    Array.isArray(session?.teams)
      ? session.teams.map((t) => ({
          slot: Number(/** @type {{ slot: unknown }} */ (t).slot),
          player_ids: (/** @type {{ player_ids?: unknown }} */ (t).player_ids ?? []).map(String),
        }))
      : []
  );

  const liveFx = useMemo(() => fixtures.find((f) => f.status === "live") ?? null, [fixtures]);
  const sessionPhase = String(session?.phase ?? "");
  const showCloseDayDock =
    Boolean(session) &&
    sessionPhase !== "closed" &&
    canWrite &&
    (fixtures.length > 0 || sessionPhase === "live");
  const nextPendingFx = useMemo(() => {
    if (liveFx) return null;
    const pend = fixtures.filter((f) => f.status === "pending");
    if (pend.length === 0) return null;
    return pend.reduce((a, b) => (Number(b.order_index) > Number(a.order_index) ? b : a));
  }, [fixtures, liveFx]);
  const focusFx = liveFx ?? nextPendingFx;

  const serverSkewMs = useMemo(() => {
    if (!md.today?.server_now) return 0;
    return new Date(String(md.today.server_now)).getTime() - Date.now();
  }, [md.today?.server_now]);

  const isLive = Boolean(focusFx && focusFx.status === "live");
  const startedAt = isLive && focusFx ? String(focusFx.started_at ?? "") : "";
  const wallElapsedSec = useApproxElapsed(startedAt || null, serverSkewMs, isLive);
  const wallSecRef = useRef(0);
  wallSecRef.current = wallElapsedSec;

  const [pauseClock, setPauseClock] = useState(
    /** @type {{ paused: boolean, pauseStartWall: number | null, accumulated: number }} */ ({
      paused: false,
      pauseStartWall: null,
      accumulated: 0,
    }),
  );

  useEffect(() => {
    setPauseClock({ paused: false, pauseStartWall: null, accumulated: 0 });
  }, [focusFx?.id]);

  const togglePauseClock = useCallback(() => {
    const w = wallSecRef.current;
    setPauseClock((s) => {
      if (!s.paused) {
        return { ...s, paused: true, pauseStartWall: w };
      }
      const delta = s.pauseStartWall != null ? Math.max(0, w - s.pauseStartWall) : 0;
      return { paused: false, pauseStartWall: null, accumulated: s.accumulated + delta };
    });
  }, []);

  const matchDurationSeconds =
    Number(focusFx?.duration_seconds ?? session?.default_match_duration_seconds ?? 420) || 420;

  const { playingElapsedSec, stoppageSeconds } = useMemo(() => {
    let currentPause = 0;
    if (pauseClock.paused && pauseClock.pauseStartWall != null) {
      currentPause = Math.max(0, wallElapsedSec - pauseClock.pauseStartWall);
    }
    const P = pauseClock.accumulated + currentPause;
    const T = Math.max(0, wallElapsedSec - P);
    return { playingElapsedSec: T, stoppageSeconds: P };
  }, [wallElapsedSec, pauseClock]);

  const playingElapsedSecRef = useRef(0);
  playingElapsedSecRef.current = playingElapsedSec;

  const homeSlot = Number(focusFx?.home_team_slot ?? 1);
  const awaySlot = Number(focusFx?.away_team_slot ?? 2);
  const homeTeamLabel = strings.matchDayTeamN.replace("{n}", String(homeSlot));
  const visitorTeamLabel = strings.matchDayTeamN.replace("{n}", String(awaySlot));
  const homeTeam = teams.find((t) => t.slot === homeSlot);
  const awayTeam = teams.find((t) => t.slot === awaySlot);
  const playersPerSide = Number(session?.players_per_team ?? 6) || 6;

  const pitchLineups = useMemo(() => {
    const fixedGk = Boolean(session?.fixed_goalkeepers_enabled);
    const g1 = session?.fixed_goalkeeper_player_id_1 ? String(session.fixed_goalkeeper_player_id_1) : null;
    const g2 = session?.fixed_goalkeeper_player_id_2 ? String(session.fixed_goalkeeper_player_id_2) : null;
    return buildLivePitchLineupsWithFixedGoalkeepers({
      fixedGoalkeepersEnabled: fixedGk,
      fixedGoalkeeperPlayerId1: g1,
      fixedGoalkeeperPlayerId2: g2,
      homePlayerIds: homeTeam?.player_ids ?? [],
      visitorPlayerIds: awayTeam?.player_ids ?? [],
      playersPerSide,
      players,
    });
  }, [
    session?.fixed_goalkeepers_enabled,
    session?.fixed_goalkeeper_player_id_1,
    session?.fixed_goalkeeper_player_id_2,
    homeTeam?.player_ids,
    awayTeam?.player_ids,
    playersPerSide,
    players,
  ]);

  const homeLineup = pitchLineups.homeNames;
  const visitorLineup = pitchLineups.visitorNames;
  const homeLineupPlayerIds = pitchLineups.homeIds;
  const visitorLineupPlayerIds = pitchLineups.visitorIds;
  const pitchSlotCount = pitchLineups.pitchSlotCount;

  const kingQueue = /** @type {{ queue?: unknown } | null | undefined} */ (session?.king_queue ?? null);
  const kingLine = useMemo(() => {
    if (!kingQueue || !Array.isArray(kingQueue.queue) || kingQueue.queue.length === 0) return null;
    const slots = kingQueue.queue
      .map((n) => strings.matchDayTeamN.replace("{n}", String(n)))
      .join(", ");
    return strings.matchLiveKingNext.replace("{slots}", slots);
  }, [kingQueue]);

  const [matchEvents, setMatchEvents] = useState(
    /** @type {{ id: string, atSecond: number, team: "home" | "visitor", message: string, subMessage: string | null }[]} */ (
      []
    ),
  );

  const homeScore = Number(focusFx?.home_goals ?? 0);
  const visitorScore = Number(focusFx?.away_goals ?? 0);

  const applyEventsFromApi = useCallback(
    /**
     * @param {string} fixtureId
     * @param {number} hs
     * @param {number} as_
     * @param {string | null | undefined} startedAtIso
     */
    async (fixtureId, hs, as_, startedAtIso) => {
      try {
        const raw = await listFixtureEvents(fixtureId);
        setMatchEvents(mapFixtureEventsToTimeline(raw, hs, as_, players, startedAtIso ?? null));
      } catch {
        /* ignore */
      }
    },
    [players],
  );

  useEffect(() => {
    if (!focusFx?.id) return undefined;
    const fid = String(focusFx.id);
    const startedAtForTimeline =
      focusFx && String(focusFx.status) === "live" && focusFx.started_at
        ? String(focusFx.started_at)
        : null;
    let cancelled = false;
    const load = () => {
      listFixtureEvents(fid)
        .then((raw) => {
          if (cancelled) return;
          setMatchEvents(mapFixtureEventsToTimeline(raw, homeSlot, awaySlot, players, startedAtForTimeline));
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [focusFx?.id, focusFx?.started_at, focusFx?.status, homeSlot, awaySlot, players]);

  const liveFixtureIdFromToday = useCallback((/** @type {Record<string, unknown>} */ data, curFid) => {
    const sess = /** @type {Record<string, unknown> | undefined} */ (data?.session);
    const fxs = /** @type {Record<string, unknown>[] | undefined} */ (sess?.fixtures);
    const live = Array.isArray(fxs) ? fxs.find((f) => f.status === "live") : null;
    return live?.id ? String(live.id) : curFid;
  }, []);

  const kingSeededSessionIdRef = useRef("");
  const kingShownFixtureIdsRef = useRef(/** @type {Set<string>} */ (new Set()));
  const [goalCapCelebration, setGoalCapCelebration] = useState(
    /** @type {{ title: string, scoreHome: number, scoreAway: number, goalLines: string[], rotationLine: string | null, finishedFixtureId: string } | null} */ (
      null
    ),
  );

  const queueGoalCapCelebrationIfNeeded = useCallback(
    /**
     * @param {string} finishedFixtureId
     * @param {Record<string, unknown> | null} todaySnapshot
     */
    async (finishedFixtureId, todaySnapshot) => {
      if (!todaySnapshot || kingShownFixtureIdsRef.current.has(finishedFixtureId)) return;
      const sess = /** @type {Record<string, unknown> | undefined} */ (todaySnapshot.session);
      if (!sess) return;
      const fxs = /** @type {Record<string, unknown>[] } */ (Array.isArray(sess.fixtures) ? sess.fixtures : []);
      const f = fxs.find((x) => String(x.id) === finishedFixtureId);
      if (!f || !shouldCelebrateGoalCapFinish(f, sess)) return;
      kingShownFixtureIdsRef.current.add(finishedFixtureId);
      try {
        const p = await buildGoalLimitCelebrationPayload(finishedFixtureId, todaySnapshot, players, strings);
        if (!p) {
          kingShownFixtureIdsRef.current.delete(finishedFixtureId);
          return;
        }
        setGoalCapCelebration(p);
      } catch {
        kingShownFixtureIdsRef.current.delete(finishedFixtureId);
      }
    },
    [players],
  );

  useEffect(() => {
    const sess = /** @type {Record<string, unknown> | undefined} */ (md.today?.session);
    if (!sess?.id) return;
    const sid = String(sess.id);
    if (kingSeededSessionIdRef.current === sid) return;
    kingSeededSessionIdRef.current = sid;
    kingShownFixtureIdsRef.current.clear();
    const fxs = /** @type {Record<string, unknown>[] } */ (Array.isArray(sess.fixtures) ? sess.fixtures : []);
    for (const fx of fxs) {
      if (shouldCelebrateGoalCapFinish(fx, sess)) {
        kingShownFixtureIdsRef.current.add(String(fx.id ?? ""));
      }
    }
  }, [md.today?.session?.id]);

  useEffect(() => {
    const sess = /** @type {Record<string, unknown> | undefined} */ (md.today?.session);
    if (!sess?.id || kingSeededSessionIdRef.current !== String(sess.id)) return;
    const fxs = /** @type {Record<string, unknown>[] } */ (Array.isArray(sess.fixtures) ? sess.fixtures : []);
    for (const fx of fxs) {
      const id = String(fx.id ?? "");
      if (kingShownFixtureIdsRef.current.has(id)) continue;
      if (!shouldCelebrateGoalCapFinish(fx, sess)) continue;
      void queueGoalCapCelebrationIfNeeded(id, md.today);
      break;
    }
  }, [md.today, queueGoalCapCelebrationIfNeeded]);

  const handleLiveStatsPersist = useCallback(
    async (/** @type {import("../../utils/sandboxMatchFromModalSave.js").SandboxModalSavePayload} */ payload) => {
      if (!liveFx || !sandboxSaveHasStats(payload)) return;
      const fid = String(liveFx.id);
      const teamSlot = payload.team === "home" ? homeSlot : awaySlot;
      const roster = payload.team === "home" ? homeTeam?.player_ids ?? [] : awayTeam?.player_ids ?? [];
      const pid =
        payload.playerId != null && String(payload.playerId).trim()
          ? String(payload.playerId).trim()
          : resolvePlayerId(payload.displayName, roster, players);
      const elapsedSnap = Math.max(0, Math.floor(Number(playingElapsedSecRef.current) || 0));
      const bodyBase = { player_id: pid ?? undefined, elapsed_seconds: elapsedSnap };

      try {
        let curFid = fid;
        /** @type {Record<string, unknown> | null} */
        let lastToday = null;
        for (let i = 0; i < (payload.gols ?? 0); i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const data = await md.recordEvent(curFid, { type: "goal", team_slot: teamSlot, ...bodyBase });
          lastToday = data;
          curFid = liveFixtureIdFromToday(data, curFid);
        }
        if ((payload.gols ?? 0) > 0 && (payload.goalAssistFromName || "").trim()) {
          const assistPid = resolvePlayerId(String(payload.goalAssistFromName).trim(), roster, players);
          if (assistPid) {
            // eslint-disable-next-line no-await-in-loop
            const data = await md.recordEvent(curFid, {
              type: "assist",
              team_slot: teamSlot,
              player_id: assistPid,
              elapsed_seconds: elapsedSnap,
            });
            lastToday = data;
            curFid = liveFixtureIdFromToday(data, curFid);
          }
        }
        for (let i = 0; i < (payload.cartoesAmarelos ?? 0); i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const data = await md.recordEvent(curFid, { type: "yellow_card", team_slot: teamSlot, ...bodyBase });
          lastToday = data;
          curFid = liveFixtureIdFromToday(data, curFid);
        }
        for (let i = 0; i < (payload.cartoesVermelhos ?? 0); i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const data = await md.recordEvent(curFid, { type: "red_card", team_slot: teamSlot, ...bodyBase });
          lastToday = data;
          curFid = liveFixtureIdFromToday(data, curFid);
        }
        for (let i = 0; i < (payload.defesas ?? 0); i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const data = await md.recordEvent(curFid, { type: "goalkeeper_save", team_slot: teamSlot, ...bodyBase });
          lastToday = data;
          curFid = liveFixtureIdFromToday(data, curFid);
        }
        const started =
          pickStartedAtFromToday(lastToday, curFid) ?? (liveFx?.started_at ? String(liveFx.started_at) : null);
        await applyEventsFromApi(curFid, homeSlot, awaySlot, started);
        const finishedSubmatchId = String(liveFx.id);
        if (lastToday) void queueGoalCapCelebrationIfNeeded(finishedSubmatchId, lastToday);
      } catch (e) {
        throw e;
      }
    },
    [
      applyEventsFromApi,
      awayTeam?.player_ids,
      homeSlot,
      awaySlot,
      homeTeam?.player_ids,
      liveFixtureIdFromToday,
      liveFx,
      md,
      players,
      queueGoalCapCelebrationIfNeeded,
    ],
  );

  const handleFinishMatch = useCallback(() => {
    if (!liveFx || !canWrite) return;
    if (!window.confirm(strings.matchLiveFinishConfirm)) return;
    void md.finishFixture(String(liveFx.id)).catch(() => {});
  }, [canWrite, liveFx, md]);

  const handleStartMatch = useCallback(() => {
    if (!focusFx || isLive || !canWrite) return;
    void md.startFixture(String(focusFx.id)).catch(() => {});
  }, [canWrite, focusFx, isLive, md]);

  const handleCloseDay = useCallback(async () => {
    try {
      const data = await md.closeDay();
      const sess = /** @type {Record<string, unknown> | undefined} */ (data?.session);
      const ymd = sess?.session_date != null ? String(sess.session_date).trim() : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        navigate(matchDayReportsPathForSessionDate(ymd));
      }
    } catch {
      /* toast no hook */
    }
  }, [md, navigate]);

  if (md.loading) {
    return (
      <MainLayout header={<AppHeader title={strings.matchLivePageTitle} subtitle={strings.matchDayLoading} />}>
        <div className="fm-page-grid">
          <LoadingBlock message={strings.matchDayLoading} />
        </div>
      </MainLayout>
    );
  }

  if (md.error) {
    return (
      <MainLayout header={<AppHeader title={strings.matchLivePageTitle} subtitle="" />}>
        <div className="fm-page-grid">
          <p className="fm-matchday-error">{strings.matchDayLoadError}</p>
          <Link className="fm-btn" to={homeHref}>
            {strings.matchLiveBackHome}
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (!focusFx) {
    return (
      <MainLayout
        header={<AppHeader title={strings.matchLivePageTitle} subtitle={strings.matchLivePageSubtitle} />}
      >
        <div className="fm-page-grid">
          <section className="fm-card fm-match-live-empty">
            <Text as="h2" className="fm-card__title">
              {strings.matchLivePageTitle}
            </Text>
            <p className="fm-muted">{strings.matchLiveNoActive}</p>
            <Link className="fm-btn" to={homeHref}>
              {strings.matchLiveBackHome}
            </Link>
          </section>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout header={<AppHeader title={strings.matchLivePageTitle} subtitle={strings.matchLivePageSubtitle} />}>
      <div className="fm-match-live-page">
        <div className="fm-page-grid">
          <div className="fm-match-live-toolbar">
            <Link className="fm-btn fm-btn--ghost" to={homeHref}>
              {strings.matchLiveBackHome}
            </Link>
          </div>
          {kingLine ? (
            <p className="fm-muted fm-match-live-king" role="status">
              {kingLine}
            </p>
          ) : null}
          <div className="fm-sandbox-stage fm-match-live-stage">
            <FootballPitchTopDown
              aria-label={strings.jogoRolandoPitchAria}
              playersPerSide={Math.min(8, Math.max(1, pitchSlotCount))}
              homeLineup={homeLineup}
              visitorLineup={visitorLineup}
              homeLineupPlayerIds={homeLineupPlayerIds}
              visitorLineupPlayerIds={visitorLineupPlayerIds}
              onLiveStatsPersist={(p) => handleLiveStatsPersist(p)}
              matchPlaying={isLive && !pauseClock.paused}
            />
            <div className="fm-match-live-panels">
              <MatchLivePanel
                homeTeamLabel={homeTeamLabel}
                visitorTeamLabel={visitorTeamLabel}
                homeScore={homeScore}
                visitorScore={visitorScore}
                playingElapsedSec={playingElapsedSec}
                stoppageSeconds={stoppageSeconds}
                matchDurationSeconds={matchDurationSeconds}
                clockPaused={pauseClock.paused}
                onClockPauseToggle={togglePauseClock}
                showMatchActions={isLive}
                events={matchEvents}
                showPlayControls={false}
                timelineEmptyLabel={strings.matchLiveTimelineEmpty}
                kickoffDenied={!isLive && !canWrite}
                showFinishFixture={isLive && canWrite && Boolean(liveFx)}
                onFinishFixture={handleFinishMatch}
                finishFixtureDisabled={md.busy}
                showStartMatch={!isLive && canWrite && Boolean(focusFx)}
                onStartMatch={handleStartMatch}
                startMatchDisabled={md.busy}
              />
            </div>
          </div>
        </div>
        {showCloseDayDock ? (
          <div
            className="fm-match-live__whistle-dock fm-match-live__whistle-dock--end"
            role="region"
            aria-label={strings.matchLiveCloseDayHold}
          >
            <MatchDayCloseDayHold
              label={strings.matchLiveCloseDayHold}
              hint={strings.sundayGameCloseDayHint}
              onComplete={handleCloseDay}
              disabled={md.busy}
              holdClassName="fm-match-live__whistle-dock-btn fm-match-live-close-day-hold"
            />
          </div>
        ) : null}
      </div>
      {goalCapCelebration ? (
        <GoalLimitCelebrationModal
          open
          onClose={() => setGoalCapCelebration(null)}
          title={goalCapCelebration.title}
          scoreHome={goalCapCelebration.scoreHome}
          scoreAway={goalCapCelebration.scoreAway}
          goalLines={goalCapCelebration.goalLines}
          rotationLine={goalCapCelebration.rotationLine}
        />
      ) : null}
    </MainLayout>
  );
}
