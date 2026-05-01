/**
 * Interruptor estilizado (mesmas classes do ativo/inativo no elenco — trilho + bolinha).
 * @param {{
 *   id: string,
 *   label: string,
 *   checked: boolean,
 *   onChange: (checked: boolean) => void,
 *   disabled?: boolean,
 *   large?: boolean,
 * }} props
 */
export function SwitchField({ id, label, checked, onChange, disabled = false, large = false }) {
  const rootClass = ["fm-squad-row-active-control", large ? "fm-squad-row-active-control--settings-lg" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={rootClass} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="fm-squad-row-active-control__input"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="fm-squad-row-active-control__track" aria-hidden="true">
        <span className="fm-squad-row-active-control__thumb" />
      </span>
      <span className="fm-squad-row-active-control__label">{label}</span>
    </label>
  );
}
