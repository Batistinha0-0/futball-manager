import { useEffect, useRef } from "react";

/** Assinatura estável da lista para detetar mudanças de elenco. */
export function playersRosterSignature(players) {
  return players
    .map((p) => /** @type {{ id: string }} */ (p).id)
    .sort()
    .join("\u0000");
}

/**
 * Micro-animção na área da lista quando o conjunto de IDs do elenco muda.
 * @param {unknown[]} players
 * @param {boolean} loading
 * @param {import("react").RefObject<HTMLDivElement | null>} listStageRef
 */
export function useSquadListStagePulse(players, loading, listStageRef) {
  const prevSigRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (loading) return;
    const sig = playersRosterSignature(/** @type {Array<{ id: string }>} */ (players));
    const el = listStageRef.current;
    if (!el) {
      prevSigRef.current = sig;
      return;
    }
    if (prevSigRef.current !== null && prevSigRef.current !== sig) {
      el.classList.remove("fm-squad-list-stage--pulse");
      void el.offsetWidth;
      el.classList.add("fm-squad-list-stage--pulse");
    }
    prevSigRef.current = sig;
  }, [players, loading, listStageRef]);
}
