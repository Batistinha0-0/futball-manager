import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";

/**
 * @param {{
 *   onAddPlayer: () => void,
 *   disabled?: boolean,
 * }} props
 */
export function SquadToolbar({ onAddPlayer, disabled = false }) {
  return (
    <div className="fm-squad-toolbar" aria-label={strings.squadToolbarLabel}>
      <Button type="button" onClick={onAddPlayer} disabled={disabled}>
        {strings.squadAddPlayer}
      </Button>
    </div>
  );
}
