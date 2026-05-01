/**
 * Interruptor estilizado (mesmo padrão visual do elenco).
 * @param {{
 *   id: string,
 *   label: string,
 *   checked: boolean,
 *   onChange: (checked: boolean) => void,
 *   disabled?: boolean,
 * }} props
 */
export function SwitchField({ id, label, checked, onChange, disabled = false }) {
  return (
    <label className="fm-squad-inactive-toggle">
      <input
        id={id}
        type="checkbox"
        className="fm-squad-inactive-toggle__input"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="fm-squad-inactive-toggle__track" aria-hidden="true">
        <span className="fm-squad-inactive-toggle__thumb" />
      </span>
      <span className="fm-squad-inactive-toggle__label">{label}</span>
    </label>
  );
}
