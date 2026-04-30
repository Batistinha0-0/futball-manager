/**
 * @param {{ id?: string, name?: string, type?: string, value?: string, onChange?: (e: import("react").ChangeEvent<HTMLInputElement>) => void, placeholder?: string, autoComplete?: string, "aria-label"?: string, className?: string, disabled?: boolean }} props
 */
export function Input({
  id,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  "aria-label": ariaLabel,
  className = "",
  disabled = false,
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`fm-input ${className}`.trim()}
    />
  );
}
