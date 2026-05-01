import { useEffect, useState } from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Mostra tempo restante (duração − decorrido) alinhado ao relógio do servidor.
 * @param {{
 *   startedAt: string | null | undefined,
 *   durationSeconds: number,
 *   serverSkewMs: number,
 *   active: boolean,
 * }} props
 */
export function MatchTimerDisplay({ startedAt, durationSeconds, serverSkewMs, active }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (!active || !startedAt) {
    return <span className="fm-matchday-timer">—:—</span>;
  }

  const startedMs = new Date(startedAt).getTime();
  const nowMs = Date.now() + serverSkewMs;
  const elapsed = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  const remaining = Math.max(0, durationSeconds - elapsed);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <span className="fm-matchday-timer" aria-live="polite">
      {pad2(m)}:{pad2(s)}
    </span>
  );
}
