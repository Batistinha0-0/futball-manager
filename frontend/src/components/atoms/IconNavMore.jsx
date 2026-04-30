/**
 * Ícone decorativo para a aba Mais.
 */
export function IconNavMore({ className = "" }) {
  return (
    <svg
      className={`fm-nav-icon ${className}`.trim()}
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="6" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
