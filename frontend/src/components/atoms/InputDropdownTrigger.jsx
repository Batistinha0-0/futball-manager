import { IconChevronDown } from "./IconChevronDown.jsx";

/**
 * Gatilho estilo input (listbox custom).
 * @param {{
 *   id: string,
 *   triggerRef: import("react").RefObject<HTMLButtonElement | null>,
 *   open: boolean,
 *   disabled?: boolean,
 *   ariaControls: string,
 *   ariaLabelledby: string,
 *   onToggle: () => void,
 *   children: import("react").ReactNode,
 * }} props
 */
export function InputDropdownTrigger({
  id,
  triggerRef,
  open,
  disabled = false,
  ariaControls,
  ariaLabelledby,
  onToggle,
  children,
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      id={id}
      className={`fm-input-dropdown__trigger${open ? " is-open" : ""}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={ariaControls}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="fm-input-dropdown__value">{children}</span>
      <IconChevronDown className={`fm-input-dropdown__chevron${open ? " is-open" : ""}`} />
    </button>
  );
}
