import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { strings } from "../strings/pt-BR.js";
import {
  getMatchDayRecentSessions,
  getMatchDayToday,
  patchMatchDayTodaySettings,
  postFixtureEvent,
  postFixtureFinish,
  postFixtureStart,
  postFixtureTimeExpired,
  postCloseMatchDay,
  postMatchDayDraw,
  postUnlockPartidaBoard,
} from "../services/matchdayApi.js";
import {
  getMatchDaySessionDate,
  setMatchDaySessionDate,
  subscribeMatchDaySessionDate,
} from "../stores/matchDaySessionDateStore.js";

/** Normaliza o valor da store (null = “hoje” no servidor). */
function normalizeSessionDate(/** @type {string | null | undefined} */ d) {
  if (d == null || String(d).trim() === "") return null;
  return String(d).trim();
}

/**
 * Estado do dia de jogo (GET /match-day/today) com polling quando há partida ao vivo
 * ou fixture pendente. A data da sessão alvo (últimos 14 dias) partilha-se via store + localStorage.
 * Erros e sucessos de mutações usam toasts (ver useToast).
 * @returns {{
 *   today: Record<string, unknown> | null,
 *   loading: boolean,
 *   error: boolean,
 *   busy: boolean,
 *   settingsSaving: boolean,
 *   refetch: () => Promise<void>,
 *   draw: () => Promise<void>,
 *   unlockPartidaBoard: () => Promise<void>,
 *   patchSettings: (patch: Record<string, unknown>) => Promise<void>,
 *   startFixture: (fixtureId: string) => Promise<void>,
 *   finishFixture: (fixtureId: string) => Promise<void>,
 *   timeExpiredFixture: (fixtureId: string) => Promise<void>,
 *   recordEvent: (fixtureId: string, body: Record<string, unknown>) => Promise<Record<string, unknown>>,
 *   closeDay: () => Promise<Record<string, unknown>>,
 *   selectedSessionDate: string | null,
 *   setSelectedSessionDate: (d: string | null) => void,
 *   recentSessions: Record<string, unknown>[],
 *   reloadRecentSessions: () => Promise<void>,
 * }}
 */
export function useMatchDayToday() {
  const { showToast } = useToast();
  const selectedSessionDate = useSyncExternalStore(
    subscribeMatchDaySessionDate,
    getMatchDaySessionDate,
    getMatchDaySessionDate,
  );

  const [today, setToday] = useState(/** @type {Record<string, unknown> | null> */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [recentSessions, setRecentSessions] = useState(/** @type {Record<string, unknown>[]} */ ([]));
  const hasLoadedRef = useRef(false);

  const session = /** @type {Record<string, unknown> | undefined} */ (today?.session);
  const fixtures = /** @type {Record<string, unknown>[] | undefined} */ (session?.fixtures);
  const hasLive = Boolean(fixtures?.some((f) => f.status === "live"));
  const hasPendingFixture = Boolean(fixtures?.some((f) => f.status === "pending"));
  const teamCount = Number(session?.team_count ?? 0);
  const pollMs = hasLive ? 45000 : hasPendingFixture && teamCount > 2 ? 45000 : hasPendingFixture ? 30000 : 0;

  const reloadRecentSessions = useCallback(async () => {
    try {
      const rows = await getMatchDayRecentSessions();
      setRecentSessions(Array.isArray(rows) ? rows : []);
    } catch {
      setRecentSessions([]);
    }
  }, []);

  const refetch = useCallback(async () => {
    const wanted = normalizeSessionDate(getMatchDaySessionDate());
    try {
      const data = await getMatchDayToday(wanted ?? undefined);
      if (normalizeSessionDate(getMatchDaySessionDate()) !== wanted) return;
      setToday(data);
      setError(false);
      void reloadRecentSessions();
    } catch {
      if (!hasLoadedRef.current) {
        setError(true);
      }
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [reloadRecentSessions]);

  useEffect(() => {
    void refetch();
  }, [selectedSessionDate, refetch]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = setInterval(() => {
      const wanted = normalizeSessionDate(getMatchDaySessionDate());
      getMatchDayToday(wanted ?? undefined)
        .then((data) => {
          if (normalizeSessionDate(getMatchDaySessionDate()) !== wanted) return;
          setToday(data);
        })
        .catch(() => {});
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs, selectedSessionDate]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        const wanted = normalizeSessionDate(getMatchDaySessionDate());
        getMatchDayToday(wanted ?? undefined)
          .then((data) => {
            if (normalizeSessionDate(getMatchDaySessionDate()) !== wanted) return;
            setToday(data);
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [selectedSessionDate]);

  const run = useCallback(
    /**
     * @param {() => Promise<Record<string, unknown>>} fn
     * @param {{ successMessage?: string }} [opts]
     */
    async (fn, opts) => {
      setBusy(true);
      try {
        const data = await fn();
        setToday(data);
        void reloadRecentSessions();
        if (opts?.successMessage) {
          showToast({ message: opts.successMessage, variant: "success" });
        }
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast({ message: msg, variant: "error" });
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [reloadRecentSessions, showToast],
  );

  const draw = useCallback(
    () => run(() => postMatchDayDraw(selectedSessionDate ?? undefined), { successMessage: strings.toastMatchDayDrawOk }),
    [run, selectedSessionDate],
  );

  const unlockPartidaBoard = useCallback(
    () =>
      run(() => postUnlockPartidaBoard(selectedSessionDate ?? undefined), {
        successMessage: strings.toastMatchDayPartidaBoardUnlocked,
      }),
    [run, selectedSessionDate],
  );

  const patchSettings = useCallback(
    /** @param {Record<string, unknown>} patch */
    async (patch) => {
      setSettingsSaving(true);
      try {
        const data = await patchMatchDayTodaySettings(patch, selectedSessionDate ?? undefined);
        setToday(data);
        void reloadRecentSessions();
        showToast({ message: strings.toastMatchDaySettingsOk, variant: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast({ message: msg, variant: "error" });
        throw e;
      } finally {
        setSettingsSaving(false);
      }
    },
    [selectedSessionDate, reloadRecentSessions, showToast],
  );

  const startFixture = useCallback(
    /** @param {string} fixtureId */
    (fixtureId) => run(() => postFixtureStart(fixtureId), { successMessage: strings.toastMatchDayStartOk }),
    [run],
  );

  const finishFixture = useCallback(
    /** @param {string} fixtureId */
    (fixtureId) => run(() => postFixtureFinish(fixtureId), { successMessage: strings.toastMatchDayFinishOk }),
    [run],
  );

  const timeExpiredFixture = useCallback(
    /** @param {string} fixtureId */
    (fixtureId) => run(() => postFixtureTimeExpired(fixtureId), { successMessage: strings.toastMatchDayTimeExpiredOk }),
    [run],
  );

  const closeDay = useCallback(
    () => run(() => postCloseMatchDay(selectedSessionDate ?? undefined), { successMessage: strings.toastMatchDayCloseOk }),
    [run, selectedSessionDate],
  );

  const recordEvent = useCallback(
    /**
     * @param {string} fixtureId
     * @param {Record<string, unknown>} body
     */
    (fixtureId, body) => run(() => postFixtureEvent(fixtureId, body)),
    [run],
  );

  const setSelectedSessionDate = useCallback((/** @type {string | null} */ d) => {
    setMatchDaySessionDate(d);
  }, []);

  return {
    today,
    loading,
    error,
    busy,
    settingsSaving,
    refetch,
    draw,
    unlockPartidaBoard,
    patchSettings,
    startFixture,
    finishFixture,
    timeExpiredFixture,
    recordEvent,
    closeDay,
    selectedSessionDate,
    setSelectedSessionDate,
    recentSessions,
    reloadRecentSessions,
  };
}
