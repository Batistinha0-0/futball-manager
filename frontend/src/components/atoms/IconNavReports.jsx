/**
 * Ícone decorativo para a aba Relatórios (não transmite significado sozinho).
 */
export function IconNavReports({ className = "" }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
