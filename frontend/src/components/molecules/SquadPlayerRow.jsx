import { strings } from "../../strings/pt-BR.js";

function profileLabel(profile) {
  if (profile === "attack") return strings.squadProfileAttack;
  if (profile === "defense") return strings.squadProfileDefense;
  return strings.squadProfileMixed;
}

function formatStars(value) {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(1);
}

/**
 * @param {{
 *   player: { id: string, display_name: string, skill_stars: number | null, profile: string, position: string | null, active: boolean },
 *   onOpen: () => void,
 *   onActiveChange: (nextActive: boolean) => void,
 *   activeToggleError?: boolean,
 * }} props
 */
export function SquadPlayerRow({
  player,
  onOpen,
  onActiveChange,
  activeToggleError = false,
}) {
  /** @param {import("react").KeyboardEvent<HTMLLIElement>} e */
  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <li
      className="fm-squad-row fm-squad-row--clickable"
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-label={`${strings.squadRowOpenSheetAria}: ${player.display_name}`}
    >
      <div className="fm-squad-row__main">
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
      </div>
      <div
        className="fm-squad-row__switch-slot"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <label className="fm-squad-row-active-control fm-squad-row-active-control--hero" title={strings.squadRowActiveSwitchAria}>
          <input
            type="checkbox"
            className="fm-squad-row-active-control__input"
            checked={player.active}
            onChange={(e) => onActiveChange(e.target.checked)}
            aria-label={strings.squadRowActiveSwitchAria}
          />
          <span className="fm-squad-row-active-control__track" aria-hidden="true">
            <span className="fm-squad-row-active-control__thumb" />
          </span>
        </label>
      </div>
      {activeToggleError ? (
        <p className="fm-squad-row__active-toggle-error" role="alert">
          {strings.squadRowActiveToggleError}
        </p>
      ) : null}
    </li>
  );
}
