import { useCallback, useEffect, useRef, useState } from "react";
import { listPlayers } from "../services/playersApi.js";

/**
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {{
 *   players: unknown[],
 *   loading: boolean,
 *   error: boolean,
 *   refetch: () => void,
 * }}
 */
export function usePlayers(options = {}) {
  const { activeOnly = true } = options;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  /** After first successful fetch, filter/refetch updates data in place without global loading. */
  const hasLoadedSuccessfullyRef = useRef(false);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrapping = !hasLoadedSuccessfullyRef.current;
    if (bootstrapping) {
      setLoading(true);
    }

    listPlayers({ activeOnly })
      .then((data) => {
        if (cancelled) return;
        setPlayers(Array.isArray(data) ? data : []);
        setError(false);
        hasLoadedSuccessfullyRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        if (!hasLoadedSuccessfullyRef.current) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOnly, tick]);

  return { players, loading, error, refetch };
}
