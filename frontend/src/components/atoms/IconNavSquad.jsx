/**
 * Ícone decorativo para a aba Elenco.
 */
export function IconNavSquad({ className = "" }) {
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
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5.5 20v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1" />
    </svg>
  );
}
