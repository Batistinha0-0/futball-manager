import { strings } from "../../strings/pt-BR.js";

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
 * Uma linha de jogador (dados da API `/api/v1/players`).
 * @param {{ player: { id: string, display_name: string, skill_stars: number, profile: string, position: string | null, active: boolean } }} props
 */
export function SquadPlayerRow({ player }) {
  return (
    <li className="fm-squad-row">
      <div className="fm-squad-row__head">
        <span className="fm-squad-row__name">{player.display_name}</span>
        {player.active ? (
          <span className="fm-pill fm-pill--ok fm-squad-row__pill">{strings.squadActive}</span>
        ) : (
          <span className="fm-pill fm-pill--pending fm-squad-row__pill">{strings.squadInactive}</span>
        )}
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
