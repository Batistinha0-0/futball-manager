import { CircleSpinner } from "./CircleSpinner.jsx";

/**
 * @param {{
 *   children: import("react").ReactNode,
 *   type?: "button" | "submit",
 *   onClick?: () => void,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   className?: string,
 *   form?: string,
 * }} props
 */
export function Button({ children, type = "button", onClick, disabled = false, loading = false, className = "", form }) {
  const busy = Boolean(loading);
  const effectiveDisabled = disabled || busy;
  const btnClass = ["fm-btn", busy ? "fm-btn--loading" : "", className].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={effectiveDisabled}
      form={form}
      className={btnClass.trim()}
      aria-busy={busy || undefined}
    >
      {busy ? <CircleSpinner size="sm" decorative /> : null}
      {children}
    </button>
  );
}
