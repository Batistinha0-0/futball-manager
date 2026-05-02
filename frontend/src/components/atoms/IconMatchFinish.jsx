/** Ícone de bandeira / fim de partida (uso decorativo ao lado do texto). */
export function IconMatchFinish({ className = "", "aria-hidden": ariaHidden = true }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
    >
      <path d="M5 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M7 5h11l-2 3 2 3H7V5Z"
        fill="currentColor"
        fillOpacity="0.9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
