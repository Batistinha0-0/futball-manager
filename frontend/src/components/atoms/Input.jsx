/**
 * Campos controlados comuns + demais atributos nativos (`enterKeyHint`, `inputMode`, etc.).
 * @param {import("react").InputHTMLAttributes<HTMLInputElement> & { className?: string }} props
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
  inputMode,
  ...rest
}) {
  const effectiveInputMode = inputMode ?? (type === "number" ? "numeric" : undefined);
  return (
    <input
      {...rest}
      id={id}
      name={name}
      type={type}
      {...(effectiveInputMode != null ? { inputMode: effectiveInputMode } : {})}
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
