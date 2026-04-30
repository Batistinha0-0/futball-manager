import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";

function profileLabel(profile) {
  if (profile === "attack") return strings.squadProfileAttack;
  if (profile === "defense") return strings.squadProfileDefense;
  return strings.squadProfileMixed;
}

function formatStars(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(1);
}

/**
 * @param {{
 *   player: { id: string, display_name: string, skill_stars: number, profile: string, position: string | null, active: boolean },
 *   onEdit: () => void,
 *   onDelete: () => void,
 * }} props
 */
export function SquadPlayerRow({ player, onEdit, onDelete }) {
  return (
    <li className="fm-squad-row">
      <div className="fm-squad-row__head">
        <span className="fm-squad-row__name">{player.display_name}</span>
        <div className="fm-squad-row__head-right">
          {player.active ? (
            <span className="fm-pill fm-pill--ok fm-squad-row__pill">{strings.squadActive}</span>
          ) : (
            <span className="fm-pill fm-pill--pending fm-squad-row__pill">{strings.squadInactive}</span>
          )}
          <div className="fm-squad-row__actions">
            <Button type="button" className="fm-btn--ghost" onClick={onEdit}>
              {strings.squadEdit}
            </Button>
            <Button type="button" className="fm-btn--ghost fm-btn--danger" onClick={onDelete}>
              {strings.squadRemove}
            </Button>
          </div>
        </div>
      </div>
      <dl className="fm-squad-row__meta">
        <div className="fm-squad-row__meta-item">
          <dt>{strings.squadStars}</dt>
          <dd>
            {formatStars(player.skill_stars)}
            <span aria-hidden="true"> ★</span>
          </dd>
        </div>
        <div className="fm-squad-row__meta-item">
          <dt>{strings.squadProfile}</dt>
          <dd>{profileLabel(player.profile)}</dd>
        </div>
        {player.position ? (
          <div className="fm-squad-row__meta-item">
            <dt>{strings.squadPosition}</dt>
            <dd>{player.position}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}
