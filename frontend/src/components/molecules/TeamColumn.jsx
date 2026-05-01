import { strings } from "../../strings/pt-BR.js";

/**
 * @param {{ title: string, names: string[] }} props
 */
export function TeamColumn({ title, names }) {
  return (
    <div className="fm-matchday-team-col">
      <h3 className="fm-matchday-team-col__title">{title}</h3>
      <ul className="fm-matchday-team-col__list">
        {names.length === 0 ? (
          <li className="fm-muted">{strings.matchDayNoPlayersInTeam}</li>
        ) : (
          names.map((n, i) => (
            <li key={`${n}-${i}`}>{n}</li>
          ))
        )}
      </ul>
    </div>
  );
}
