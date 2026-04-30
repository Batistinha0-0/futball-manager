import { Input } from "../atoms/Input.jsx";
import { Text } from "../atoms/Text.jsx";

/**
 * @param {{
 *   id: string,
 *   label: string,
 *   value?: string,
 *   onChange?: (e: import("react").ChangeEvent<HTMLInputElement>) => void,
 *   placeholder?: string,
 *   type?: string,
 *   name?: string,
 *   autoComplete?: string,
 *   disabled?: boolean,
 * }} props
 */
export function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  name,
  autoComplete,
  disabled = false,
}) {
  return (
    <div className="fm-field">
      <Text as="label" htmlFor={id} className="fm-field__label">
        {label}
      </Text>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
      />
    </div>
  );
}
