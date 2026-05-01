import { strings } from "../../strings/pt-BR.js";
import { IconSquadEdit } from "../atoms/IconSquadEdit.jsx";
import { IconSquadTrash } from "../atoms/IconSquadTrash.jsx";

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
        <div className="fm-squad-row__title">
          <span className="fm-squad-row__name">{player.display_name}</span>
          <span
            className="fm-squad-row__status"
            aria-label={player.active ? strings.squadRowStatusActiveAria : strings.squadRowStatusInactiveAria}
            title={player.active ? strings.squadActive : strings.squadInactive}
          >
            <span
              className={
                player.active ? "fm-squad-row__status-dot fm-squad-row__status-dot--live" : "fm-squad-row__status-dot"
              }
            />
          </span>
        </div>
        <div className="fm-squad-row__head-right">
          <div className="fm-squad-row__actions">
            <button type="button" className="fm-squad-row__icon-btn" onClick={onEdit} aria-label={strings.squadRowEditAria}>
              <IconSquadEdit />
            </button>
            <button
              type="button"
              className="fm-squad-row__icon-btn fm-squad-row__icon-btn--danger"
              onClick={onDelete}
              aria-label={strings.squadRowRemoveAria}
            >
              <IconSquadTrash />
            </button>
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
