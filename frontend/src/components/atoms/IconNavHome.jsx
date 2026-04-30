/**
 * Ícone decorativo para a aba Início (não transmite significado sozinho).
 */
export function IconNavHome({ className = "" }) {
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
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}
