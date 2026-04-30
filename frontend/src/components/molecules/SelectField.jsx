import { Text } from "../atoms/Text.jsx";

/**
 * @param {{
 *   id: string,
 *   label: string,
 *   value: string,
 *   onChange: (e: import("react").ChangeEvent<HTMLSelectElement>) => void,
 *   disabled?: boolean,
 *   children: import("react").ReactNode,
 * }} props
 */
export function SelectField({ id, label, value, onChange, disabled = false, children }) {
  return (
    <div className="fm-field">
      <Text as="label" htmlFor={id} className="fm-field__label">
        {label}
      </Text>
      <select id={id} className="fm-input" value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
    </div>
  );
}
