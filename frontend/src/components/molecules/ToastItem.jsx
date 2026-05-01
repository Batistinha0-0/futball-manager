import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_DISMISS_PX = 72;

/**
 * @param {{
 *   id: string,
 *   message: string,
 *   variant: "success" | "error" | "info",
 *   duration: number,
 *   onExited: (id: string) => void,
 * }} props
 */
export function ToastItem({ id, message, variant, duration, onExited }) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const progressRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const timerRef = useRef(/** @type {number | null} */ (null));
  const pointerIdRef = useRef(/** @type {number | null} */ (null));
  const startXRef = useRef(0);

  const [exiting, setExiting] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const exitRequestedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const requestExit = useCallback(() => {
    if (exitRequestedRef.current) return;
    exitRequestedRef.current = true;
    clearTimer();
    if (progressRef.current) {
      progressRef.current.style.animationPlayState = "paused";
    }
    setExiting(true);
  }, [clearTimer]);

  useEffect(() => {
    if (exiting) return undefined;
    timerRef.current = window.setTimeout(() => {
      requestExit();
    }, duration);
    return () => {
      clearTimer();
    };
  }, [duration, exiting, requestExit, clearTimer]);

  useEffect(() => {
    if (!exiting) return undefined;
    const el = rootRef.current;
    if (!el) {
      onExited(id);
      return undefined;
    }
    let done = false;
    /** @param {TransitionEvent} e */
    function onTransitionEnd(e) {
      if (e.target !== el || done) return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
      done = true;
      el.removeEventListener("transitionend", onTransitionEnd);
      onExited(id);
    }
    el.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(() => {
      el.removeEventListener("transitionend", onTransitionEnd);
      if (!done) {
        done = true;
        onExited(id);
      }
    }, 500);
    return () => {
      el.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [exiting, id, onExited]);

  /** @param {React.PointerEvent<HTMLDivElement>} e */
  function onPointerDown(e) {
    if (exiting) return;
    if (e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  /** @param {React.PointerEvent<HTMLDivElement>} e */
  function onPointerMove(e) {
    if (exiting || pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    const right = Math.max(0, dx);
    setDragX(right);
  }

  /** @param {React.PointerEvent<HTMLDivElement>} e */
  function onPointerUp(e) {
    if (pointerIdRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointerIdRef.current = null;
    setDragging(false);
    const dx = e.clientX - startXRef.current;
    if (!exiting && dx >= SWIPE_DISMISS_PX) {
      setDragX(0);
      requestExit();
    } else {
      setDragX(0);
      if (progressRef.current && !exiting) {
        progressRef.current.style.animationPlayState = "running";
      }
    }
  }

  /** @param {React.PointerEvent<HTMLDivElement>} e */
  function onPointerCancel(e) {
    if (pointerIdRef.current === e.pointerId) {
      pointerIdRef.current = null;
      setDragging(false);
      setDragX(0);
    }
  }

  const dragStyle =
    !exiting && dragX > 0
      ? {
          transform: `translate3d(${dragX}px, 0, 0)`,
          opacity: Math.max(0.58, 1 - dragX / 240),
        }
      : undefined;

  return (
    <div
      ref={rootRef}
      className={`fm-toast fm-toast--${variant} ${exiting ? "fm-toast--exiting" : ""} ${dragging ? "fm-toast--dragging" : ""}`}
      style={dragStyle}
      role="status"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="fm-toast__body">{message}</div>
      <div className="fm-toast__footer" aria-hidden="true">
        <div className="fm-toast__progress-track">
          <div
            ref={progressRef}
            className="fm-toast__progress-bar"
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: exiting ? "paused" : dragging ? "paused" : "running",
            }}
          />
        </div>
      </div>
    </div>
  );
}
