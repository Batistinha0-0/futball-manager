import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Completa a ação só após manter premido (pointer ou tecla Space).
 * O preenchimento é um gradiente suave revelado com borda arredondada (clip-path), não uma barra reta.
 * @param {{
 *   label: string,
 *   onComplete: () => void,
 *   holdMs?: number,
 *   disabled?: boolean,
 *   className?: string,
 *   variant?: "danger" | "primary",
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function PressHoldButton({
  label,
  onComplete,
  holdMs = 1200,
  disabled = false,
  className = "",
  variant = "danger",
  ...rest
}) {
  const [progress, setProgress] = useState(0);
  const holdRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);
  /** True enquanto o usuário mantém o gesto (pointer ou tecla) e o temporizador ainda pode cancelar. */
  const inHoldRef = useRef(false);

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    inHoldRef.current = false;
    setProgress(0);
    completedRef.current = false;
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    clearHold();
    inHoldRef.current = true;
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
  const progressPct = Math.round(progress * 100);
  /** Borda direita em arco (pílula), em vez de corte reto com scaleX. */
  const fillClip =
    progress <= 0
      ? "inset(0 100% 0 0)"
      : progress >= 1
        ? "inset(0 0 0 0)"
        : `inset(0 ${(1 - progress) * 100}% 0 0 round 0 999px 999px 0)`;

  const endPointerHold = useCallback(() => {
    if (inHoldRef.current) clearHold();
  }, [clearHold]);

  return (
    <button
      type="button"
      {...rest}
      className={`fm-press-hold ${mod} ${className}`.trim()}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={progress > 0 && progress < 1 ? `${progressPct}%` : undefined}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (disabled) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture opcional */
        }
        startHold();
      }}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* já libertado */
        }
        endPointerHold();
      }}
      onPointerCancel={endPointerHold}
      onLostPointerCapture={endPointerHold}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.repeat) return;
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(e) => {
        if (e.code === "Space" || e.code === "Enter") endPointerHold();
      }}
      onBlur={endPointerHold}
    >
      <span
        className="fm-press-hold__fill"
        style={{ clipPath: fillClip, WebkitClipPath: fillClip }}
        aria-hidden="true"
      />
      <span className="fm-press-hold__content">
        <span className="fm-press-hold__label">{label}</span>
      </span>
    </button>
  );
}
