import { strings } from "../../strings/pt-BR.js";

/** Empty roster message; primary action stays on ``SquadToolbar``. */
export function SquadPlayersEmptyState() {
  return (
    <div className="fm-squad-empty fm-squad-empty--hint-only">
      <p className="fm-muted fm-squad-list-placeholder fm-squad-list-placeholder--empty">
        {strings.playersEmpty}
      </p>
      <p className="fm-muted fm-squad-empty__hint">{strings.squadEmptyHint}</p>
    </div>
  );
}
