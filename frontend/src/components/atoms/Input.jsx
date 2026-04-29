/**
 * @param {{ id?: string, name?: string, type?: string, value?: string, onChange?: (e: import("react").ChangeEvent<HTMLInputElement>) => void, placeholder?: string, "aria-label"?: string, className?: string }} props
 */
export function Input({
  id,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className = "",
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`fm-input ${className}`.trim()}
    />
  );
}
