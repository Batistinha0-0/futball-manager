import { useEffect, useState } from "react";
import { apiGet } from "../services/apiClient.js";

/**
 * @returns {{ players: unknown[], loading: boolean, error: boolean }}
 */
export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet("/api/v1/players")
      .then((data) => {
        if (!cancelled) {
          setPlayers(Array.isArray(data) ? data : []);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { players, loading, error };
}
