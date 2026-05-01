/**
 * Opção do listbox do InputDropdown.
 * @param {{
 *   optionId: string,
 *   selected: boolean,
 *   disabled?: boolean,
 *   onSelect: () => void,
 *   children: import("react").ReactNode,
 * }} props
 */
export function InputDropdownOption({ optionId, selected, disabled = false, onSelect, children }) {
  return (
    <li className="fm-input-dropdown__option-wrap" role="presentation">
      <button
        type="button"
        id={optionId}
        role="option"
        aria-selected={selected}
        className={`fm-input-dropdown__option${selected ? " is-selected" : ""}`}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          onSelect();
        }}
      >
        {children}
      </button>
    </li>
  );
}
