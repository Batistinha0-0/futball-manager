import { useCallback, useEffect, useRef, useState } from "react";
import { getMatchDayRecentSessions, getMatchDayToday } from "../services/matchdayApi.js";

/** @param {string | null | undefined} d */
function normalizeViewDate(d) {
  if (d == null || String(d).trim() === "") return null;
  const s = String(d).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Leitura de GET /match-day/today para a página de relatórios (sem partilhar a store do sorteio).
 * @param {string | null} viewDate `YYYY-MM-DD` ou null = hoje no servidor
 */
export function useMatchDayReportView(/** @type {string | null} */ viewDate) {
  const wantedRef = useRef(/** @type {string | null} */ (normalizeViewDate(viewDate)));
  wantedRef.current = normalizeViewDate(viewDate);

  const [today, setToday] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recentSessions, setRecentSessions] = useState(/** @type {Record<string, unknown>[]} */ ([]));
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    const wanted = wantedRef.current;
    setLoading(true);
    try {
      const [data, rows] = await Promise.all([
        getMatchDayToday(wanted ?? undefined),
        getMatchDayRecentSessions(),
      ]);
      if (wantedRef.current !== wanted) return;
      setToday(data);
      setRecentSessions(Array.isArray(rows) ? rows : []);
      setError(false);
    } catch {
      if (!hasLoadedRef.current) setError(true);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [viewDate, refetch]);

  return {
    today,
    loading,
    error,
    recentSessions,
    refetch,
  };
}
