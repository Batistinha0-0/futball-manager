import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMatchDayToday,
  patchMatchDayTodaySettings,
  postFixtureEvent,
  postFixtureFinish,
  postFixtureStart,
  postMatchDayDraw,
} from "../services/matchdayApi.js";

/**
 * Estado do dia de jogo (GET /match-day/today) com polling leve em partida ao vivo.
 * @returns {{
 *   today: Record<string, unknown> | null,
 *   loading: boolean,
 *   error: boolean,
 *   busy: boolean,
 *   settingsSaving: boolean,
 *   actionError: string | null,
 *   clearActionError: () => void,
 *   refetch: () => Promise<void>,
 *   draw: () => Promise<void>,
 *   patchSettings: (patch: Record<string, unknown>) => Promise<void>,
 *   startFixture: (fixtureId: string) => Promise<void>,
 *   finishFixture: (fixtureId: string) => Promise<void>,
 *   recordEvent: (fixtureId: string, body: Record<string, unknown>) => Promise<void>,
 * }}
 */
export function useMatchDayToday() {
  const [today, setToday] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null));
  const hasLoadedRef = useRef(false);

  const session = /** @type {Record<string, unknown> | undefined} */ (today?.session);
  const fixtures = /** @type {Record<string, unknown>[] | undefined} */ (session?.fixtures);
  const hasLive = Boolean(fixtures?.some((f) => f.status === "live"));
  const pollMs = hasLive ? 45000 : 0;

  const refetch = useCallback(async () => {
    try {
      const data = await getMatchDayToday();
      setToday(data);
      setError(false);
    } catch {
      if (!hasLoadedRef.current) {
        setError(true);
      }
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = setInterval(() => {
      getMatchDayToday()
        .then(setToday)
        .catch(() => {});
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        getMatchDayToday()
          .then(setToday)
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const run = useCallback(
    /** @param {() => Promise<Record<string, unknown>>} fn */
    async (fn) => {
      setBusy(true);
      setActionError(null);
      try {
        const data = await fn();
        setToday(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setActionError(msg);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const draw = useCallback(() => run(() => postMatchDayDraw()), [run]);

  const patchSettings = useCallback(
    /** @param {Record<string, unknown>} patch */
    async (patch) => {
      setActionError(null);
      setSettingsSaving(true);
      try {
        const data = await patchMatchDayTodaySettings(patch);
        setToday(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setActionError(msg);
        throw e;
      } finally {
        setSettingsSaving(false);
      }
    },
    [],
  );

  const startFixture = useCallback(
    /** @param {string} fixtureId */
    (fixtureId) => run(() => postFixtureStart(fixtureId)),
    [run],
  );

  const finishFixture = useCallback(
    /** @param {string} fixtureId */
    (fixtureId) => run(() => postFixtureFinish(fixtureId)),
    [run],
  );

  const recordEvent = useCallback(
    /**
     * @param {string} fixtureId
     * @param {Record<string, unknown>} body
     */
    (fixtureId, body) => run(() => postFixtureEvent(fixtureId, body)),
    [run],
  );

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    today,
    loading,
    error,
    busy,
    settingsSaving,
    actionError,
    clearActionError,
    refetch,
    draw,
    patchSettings,
    startFixture,
    finishFixture,
    recordEvent,
  };
}
