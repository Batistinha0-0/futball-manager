import { CircleSpinner } from "../atoms/CircleSpinner.jsx";

/**
 * @param {{
 *   message?: string,
 *   centered?: boolean,
 *   className?: string,
 *   spinnerSize?: "sm" | "md" | "lg",
 * }} props
 */
export function LoadingBlock({ message, centered = true, className = "", spinnerSize = "md" }) {
  const rootClass = ["fm-loading-block", centered ? "fm-loading-block--centered" : "", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <CircleSpinner size={spinnerSize} />
      {message ? <p className="fm-muted fm-loading-block__msg">{message}</p> : null}
    </div>
  );
}
