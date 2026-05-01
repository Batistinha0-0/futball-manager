import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { strings } from "../strings/pt-BR.js";
import { ToastItem } from "../components/molecules/ToastItem.jsx";

const MAX_TOASTS = 3;

/** @typedef {{ id: string, message: string, variant: "success" | "error" | "info", duration: number }} ToastRecord */

/** @type {import("react").Context<{ showToast: (opts: { message: string, variant?: "success" | "error" | "info", duration?: number }) => string, dismissToast: (id: string) => void } | null>} */
const ToastContext = createContext(null);

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(/** @type {ToastRecord[]} */ ([]));

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const showToast = useCallback((opts) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = typeof opts.duration === "number" && opts.duration > 0 ? opts.duration : 5200;
    const variant = opts.variant ?? "info";
    const record = /** @type {ToastRecord} */ ({
      id,
      message: opts.message,
      variant,
      duration,
    });
    setToasts((prev) => [record, ...prev].slice(0, MAX_TOASTS));
    return id;
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fm-toast-viewport" aria-label={strings.toastRegionLabel} role="region">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            variant={t.variant}
            duration={t.duration}
            onExited={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
