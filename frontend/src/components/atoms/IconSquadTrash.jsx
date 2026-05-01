/**
 * Ícone de lixeira (excluir jogador do elenco).
 * @param {{ className?: string }} props
 */
export function IconSquadTrash({ className = "" }) {
  return (
    <svg
      className={className}
      width="1.25rem"
      height="1.25rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 6h18" />
      <path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
      <path d="M6 6h12l-1 14H7L6 6zM10 10v7M14 10v7" />
    </svg>
  );
}
