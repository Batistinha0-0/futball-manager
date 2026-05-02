import { strings } from "../../strings/pt-BR.js";

/**
 * Indicador circular no estilo da app (teal sobre track discreto).
 * @param {{
 *   size?: "sm" | "md" | "lg",
 *   className?: string,
 *   label?: string,
 *   decorative?: boolean,
 * }} props
 */
export function CircleSpinner({ size = "md", className = "", label, decorative = false }) {
  const aria = label ?? strings.loadingSpinnerAria;
  const cls = `fm-spinner fm-spinner--${size} ${className}`.trim();

  if (decorative) {
    return <span className={cls} aria-hidden="true" />;
  }

  return (
    <span
      className={cls}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={aria}
    />
  );
}
