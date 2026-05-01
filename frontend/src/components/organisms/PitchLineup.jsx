import { TeamColumn } from "../molecules/TeamColumn.jsx";
import { strings } from "../../strings/pt-BR.js";

/**
 * @param {{
 *   teams: Array<{ slot: number, player_ids: string[] }>,
 *   players: Array<{ id: unknown, display_name?: string }>,
 * }} props
 */
export function PitchLineup({ teams, players }) {
  const byId = new Map(players.map((p) => [String(p.id), String(p.display_name ?? p.id)]));
  const sorted = [...teams].sort((a, b) => Number(a.slot) - Number(b.slot));

  return (
    <div className="fm-matchday-pitch" aria-label={strings.matchDayPitchAria}>
      <div className="fm-matchday-pitch__grid">
        {sorted.map((t) => {
          const names = (t.player_ids ?? []).map((id) => byId.get(String(id)) ?? String(id));
          const title = strings.matchDayTeamN.replace("{n}", String(t.slot));
          return <TeamColumn key={String(t.slot)} title={title} names={names} />;
        })}
      </div>
    </div>
  );
}
