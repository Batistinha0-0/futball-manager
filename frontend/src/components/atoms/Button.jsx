/**
 * @param {{ children: import("react").ReactNode, type?: "button" | "submit", onClick?: () => void, disabled?: boolean, className?: string }} props
 */
export function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`fm-btn ${className}`.trim()}
    >
      {children}
    </button>
  );
}
