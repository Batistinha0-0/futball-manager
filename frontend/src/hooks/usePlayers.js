import { useCallback, useEffect, useRef, useState } from "react";
import { listPlayers } from "../services/playersApi.js";

/**
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {{
 *   players: unknown[],
 *   loading: boolean,
 *   error: boolean,
 *   refetch: () => void,
 *   upsertPlayer: (player: Record<string, unknown>) => void,
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

  /** Atualiza a lista com o JSON do POST/PATCH (evita novo GET logo após criar/editar). */
  const upsertPlayer = useCallback(
    /** @param {Record<string, unknown>} player */
    (player) => {
      const id = player.id;
      if (id == null || id === "") return;
      const idStr = String(id);
      const isActive = Boolean(player.active);

      setPlayers((prev) => {
        const rest = prev.filter((p) => String(/** @type {{ id: unknown }} */ (p).id) !== idStr);
        if (activeOnly && !isActive) {
          return rest;
        }
        return [player, ...rest];
      });
    },
    [activeOnly],
  );

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
        // Sempre limpar loading: se `finally` só rodasse com !cancelled, pedidos antigos
        // cancelados (Strict Mode / troca de filtro) podiam deixar loading=true sem novo fetch.
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOnly, tick]);

  return { players, loading, error, refetch, upsertPlayer };
}
