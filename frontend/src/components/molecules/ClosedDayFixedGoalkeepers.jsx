import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";

/**
 * @param {{
 *   session: Record<string, unknown>,
 *   displayNameById: Record<string, string>,
 * }} props
 */
export function ClosedDayFixedGoalkeepers({ session, displayNameById }) {
  const enabled = Boolean(session?.fixed_goalkeepers_enabled);
  if (!enabled) return null;
  const id1 = session.fixed_goalkeeper_player_id_1 ? String(session.fixed_goalkeeper_player_id_1) : "";
  const id2 = session.fixed_goalkeeper_player_id_2 ? String(session.fixed_goalkeeper_player_id_2) : "";
  if (!id1 && !id2) return null;

  const line = (slot, pid) => {
    if (!pid) return null;
    const name = displayNameById[pid] || pid.slice(0, 8);
    return (
      <li key={slot} className="fm-closed-day-gk__item">
        {strings.matchDayArchiveFixedGkSlot.replace("{n}", String(slot)).replace("{name}", name)}
      </li>
    );
  };

  return (
    <div className="fm-closed-day-gk" role="region" aria-label={strings.matchDayArchiveFixedGkAria}>
      <Text as="h3" className="fm-matchday-subtitle fm-closed-day-gk__title">
        {strings.matchDayArchiveFixedGkTitle}
      </Text>
      <p className="fm-muted fm-closed-day-gk__lead">{strings.matchDayArchiveFixedGkLead}</p>
      <ul className="fm-closed-day-gk__list">{line(1, id1)}{line(2, id2)}</ul>
    </div>
  );
}
