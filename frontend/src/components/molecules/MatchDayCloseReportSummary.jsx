import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { ClosedDayFixtureReportCard } from "./ClosedDayFixtureReportCard.jsx";

/**
 * @param {{
 *   daySummary: Record<string, unknown>,
 *   displayNameById: Record<string, string>,
 * }} props
 */
export function MatchDayCloseReportSummary({ daySummary, displayNameById }) {
  const fixtures = /** @type {Record<string, unknown>[]} */ (
    Array.isArray(daySummary.fixtures) ? daySummary.fixtures : []
  );
  const players = /** @type {Record<string, unknown>[]} */ (
    Array.isArray(daySummary.players) ? daySummary.players : []
  );

  const teamLabel = (slot) => strings.matchDayTeamN.replace("{n}", String(slot));

  return (
    <div className="fm-matchday-close-report">
      <Text as="h3" className="fm-matchday-subtitle">
        {strings.matchDayCloseReportTitle}
      </Text>
      <Text as="h4" className="fm-matchday-close-report__sub">
        {strings.matchDayCloseReportFixtures}
      </Text>
      <div className="fm-matchday-close-report__fixture-cards">
        {fixtures.map((f, i) => {
          const homeSlot = Number(f.home_team_slot ?? 1);
          const awaySlot = Number(f.away_team_slot ?? 2);
          const orderLabel = strings.matchDayCloseReportOrder.replace(
            "{n}",
            String(Number(f.order_index ?? i) + 1),
          );
          return (
            <ClosedDayFixtureReportCard
              key={String(f.fixture_id ?? i)}
              fixture={f}
              homeTeamLabel={teamLabel(homeSlot)}
              awayTeamLabel={teamLabel(awaySlot)}
              displayNameById={displayNameById}
              orderLabel={orderLabel}
            />
          );
        })}
      </div>
      <Text as="h4" className="fm-matchday-close-report__sub">
        {strings.matchDayCloseReportPlayers}
      </Text>
      {players.length === 0 ? (
        <p className="fm-muted">{strings.matchDayCloseReportPlayersEmpty}</p>
      ) : (
        <div className="fm-matchday-close-report__table-wrap">
          <table className="fm-matchday-close-report__table">
            <thead>
              <tr>
                <th scope="col">{strings.matchDayCloseReportColPlayer}</th>
                <th scope="col">{strings.matchDayCloseReportColGoals}</th>
                <th scope="col">{strings.matchDayCloseReportColAssists}</th>
                <th scope="col">{strings.matchDayCloseReportColSaves}</th>
                <th scope="col">{strings.matchDayCloseReportColYellow}</th>
                <th scope="col">{strings.matchDayCloseReportColRed}</th>
                <th scope="col">{strings.matchDayCloseReportColFixtures}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((row) => {
                const pid = String(row.player_id ?? "");
                const name = displayNameById[pid] || pid.slice(0, 8);
                return (
                  <tr key={pid}>
                    <td>{name}</td>
                    <td>{Number(row.goals ?? 0)}</td>
                    <td>{Number(row.assists ?? 0)}</td>
                    <td>{Number(row.goalkeeper_saves ?? 0)}</td>
                    <td>{Number(row.yellow_cards ?? 0)}</td>
                    <td>{Number(row.red_cards ?? 0)}</td>
                    <td>{Number(row.fixtures_played ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
