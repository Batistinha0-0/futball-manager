export function IconGkSave({ className = "", "aria-hidden": ariaHidden = true }) {
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
      <path
        d="M5 10c2-3 5-4 7-4s5 1 7 4v6c-2 2-4 3-7 3s-5-1-7-3v-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 9v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
