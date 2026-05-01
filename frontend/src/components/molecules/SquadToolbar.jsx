import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";

/**
 * @param {{
 *   showInactive: boolean,
 *   onShowInactiveChange: (checked: boolean) => void,
 *   onAddPlayer: () => void,
 *   disabled?: boolean,
 * }} props
 */
export function SquadToolbar({ showInactive, onShowInactiveChange, onAddPlayer, disabled = false }) {
  return (
    <div className="fm-squad-toolbar" aria-label={strings.squadToolbarLabel}>
      <label className="fm-squad-inactive-toggle">
        <input
          type="checkbox"
          className="fm-squad-inactive-toggle__input"
          checked={showInactive}
          onChange={(e) => onShowInactiveChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="fm-squad-inactive-toggle__track" aria-hidden="true">
          <span className="fm-squad-inactive-toggle__thumb" />
        </span>
        <span className="fm-squad-inactive-toggle__label">{strings.squadShowInactive}</span>
      </label>
      <Button type="button" onClick={onAddPlayer} disabled={disabled}>
        {strings.squadAddPlayer}
      </Button>
    </div>
  );
}
