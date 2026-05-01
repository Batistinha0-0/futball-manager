import { Text } from "../atoms/Text.jsx";
import { InputDropdown } from "./InputDropdown.jsx";

/**
 * Campo com etiqueta + dropdown estilizado (menu com scroll).
 * @param {{
 *   id: string,
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   options: { value: string, label: string }[],
 *   disabled?: boolean,
 * }} props
 */
export function SelectField({ id, label, value, onChange, disabled = false, options }) {
  const labelId = `${id}-label`;
  return (
    <div className="fm-field fm-field--select">
      <Text as="label" id={labelId} htmlFor={id} className="fm-field__label">
        {label}
      </Text>
      <InputDropdown
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        ariaLabelledby={labelId}
      />
    </div>
  );
}
