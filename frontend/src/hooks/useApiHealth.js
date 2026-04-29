import { useEffect, useState } from "react";
import { apiGet } from "../services/apiClient.js";

/**
 * @typedef {"idle" | "loading" | "ok" | "error"} HealthState
 */

export function useApiHealth() {
  /** @type {[HealthState, import("react").Dispatch<import("react").SetStateAction<HealthState>>]} */
  const [state, setState] = useState(/** @type {HealthState} */ ("idle"));

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    apiGet("/health")
      .then((data) => {
        if (cancelled) return;
        if (data && data.status === "ok") setState("ok");
        else setState("error");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
