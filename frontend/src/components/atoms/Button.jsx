/**
 * @param {{
 *   children: import("react").ReactNode,
 *   type?: "button" | "submit",
 *   onClick?: () => void,
 *   disabled?: boolean,
 *   className?: string,
 *   form?: string,
 * }} props
 */
export function Button({ children, type = "button", onClick, disabled = false, className = "", form }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      form={form}
      className={`fm-btn ${className}`.trim()}
    >
      {children}
    </button>
  );
}
