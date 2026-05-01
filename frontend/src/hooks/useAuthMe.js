import { useEffect, useState } from "react";
import { fetchCurrentUser } from "../services/authApi.js";

/**
 * Usuário autenticado (GET /auth/me) ou null.
 * @returns {{ user: object | null, loading: boolean, error: boolean, reload: () => void }}
 */
export function useAuthMe() {
  const [user, setUser] = useState(/** @type {object | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  function reload() {
    setTick((t) => t + 1);
  }

  return { user, loading, error, reload };
}
