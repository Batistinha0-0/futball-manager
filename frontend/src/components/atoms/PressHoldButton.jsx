import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Completa a ação só após manter premido (pointer ou tecla Space).
 * @param {{
 *   label: string,
 *   onComplete: () => void,
 *   holdMs?: number,
 *   disabled?: boolean,
 *   className?: string,
 *   variant?: "danger" | "primary",
 * }} props
 */
export function PressHoldButton({
  label,
  onComplete,
  holdMs = 1200,
  disabled = false,
  className = "",
  variant = "danger",
}) {
  const [progress, setProgress] = useState(0);
  const holdRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setProgress(0);
    completedRef.current = false;
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    clearHold();
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / holdMs);
      setProgress(p);
      if (p < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };
    rafRef.current = window.requestAnimationFrame(tick);
    holdRef.current = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      clearHold();
    }, holdMs);
  }, [clearHold, disabled, holdMs, onComplete]);

  useEffect(() => () => clearHold(), [clearHold]);

  const mod = variant === "danger" ? "fm-press-hold--danger" : "fm-press-hold--primary";

  return (
    <button
      type="button"
      className={`fm-press-hold ${mod} ${className}`.trim()}
      disabled={disabled}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        startHold();
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={(e) => {
        if (e.pressure === 0) clearHold();
      }}
      onKeyDown={(e) => {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(e) => {
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          clearHold();
        }
      }}
    >
      <span className="fm-press-hold__fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="fm-press-hold__label">{label}</span>
    </button>
  );
}
