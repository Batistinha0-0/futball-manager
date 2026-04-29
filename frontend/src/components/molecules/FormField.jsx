import { Input } from "../atoms/Input.jsx";
import { Text } from "../atoms/Text.jsx";

/**
 * @param {{ id: string, label: string, value?: string, onChange?: (e: import("react").ChangeEvent<HTMLInputElement>) => void, placeholder?: string }} props
 */
export function FormField({ id, label, value, onChange, placeholder }) {
  return (
    <div className="fm-field">
      <Text as="label" htmlFor={id} className="fm-field__label">
        {label}
      </Text>
      <Input id={id} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
