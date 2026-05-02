import { useId, useMemo, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { IconChevronDown } from "../atoms/IconChevronDown.jsx";
import { formatMatchEventTime } from "../../utils/formatMatchClock.js";
import { MATCH_SCORE_SEP, matchScoreParts } from "../../utils/formatMatchScore.js";

/** Igual à timeline ao vivo: assistência ligada ao gol mais recente do mesmo time até 2 min (relógio de jogo). */
const ASSIST_PAIR_MAX_DELTA_SEC = 120;

/** @param {Record<string, unknown>} rec */
function eventElapsedSeconds(rec) {
  const raw = rec.elapsed_seconds;
  if (raw == null || raw === "") return NaN;
  const n = Math.floor(Number(raw));
  return Number.isNaN(n) ? NaN : Math.max(0, n);
}

/**
 * @param {Record<string, unknown>[]} events ordem cronológica (como no relatório do servidor)
 * @param {Record<string, string>} displayNameById
 */
function pairAssistsToGoalsForReport(events, displayNameById) {
  /** @type {Map<number, string>} */
  const goalIndexToAssistName = new Map();
  const consumedAssistIndices = new Set();

  const nameFor = (/** @type {Record<string, unknown>} */ ev) => {
    const pid = ev.player_id ? String(ev.player_id) : "";
    return pid ? displayNameById[pid] || pid.slice(0, 8) : "";
  };

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i];
    if (String(ev.type ?? "") !== "assist") continue;
    const assistName = nameFor(ev);
    if (!assistName) continue;
    const assistSlot = Number(ev.team_slot);
    const assistT = eventElapsedSeconds(ev);
    if (Number.isNaN(assistT)) continue;

    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = events[j];
      if (String(prev.type ?? "") !== "goal") continue;
      if (Number(prev.team_slot) !== assistSlot) continue;
      const goalT = eventElapsedSeconds(prev);
      if (Number.isNaN(goalT)) continue;
      if (assistT < goalT) continue;
      if (assistT - goalT > ASSIST_PAIR_MAX_DELTA_SEC) break;
      if (!goalIndexToAssistName.has(j)) {
        goalIndexToAssistName.set(j, assistName);
        consumedAssistIndices.add(i);
        break;
      }
    }
  }

  return { goalIndexToAssistName, consumedAssistIndices };
}

/**
 * @param {string} type
 * @param {string} playerName
 */
function eventKindLabel(type, playerName) {
  const named = (tplNamed, tplAnon) => (playerName ? tplNamed.replace("{name}", playerName) : tplAnon);
  switch (type) {
    case "goal":
      return named(strings.matchLiveTimelineGoalNamed, strings.matchLiveTimelineGoal);
    case "assist":
      return named(strings.matchLiveTimelineAssistNamed, strings.matchLiveTimelineAssist);
    case "goalkeeper_save":
      return named(strings.matchLiveTimelineSaveNamed, strings.matchLiveTimelineSave);
    case "yellow_card":
      return named(strings.matchLiveTimelineYellowNamed, strings.matchLiveTimelineYellow);
    case "red_card":
      return named(strings.matchLiveTimelineRedNamed, strings.matchLiveTimelineRed);
    default:
      return strings.matchLiveTimelineUnknown;
  }
}

/**
 * @param {{
 *   fixture: Record<string, unknown>,
 *   homeTeamLabel: string,
 *   awayTeamLabel: string,
 *   displayNameById: Record<string, string>,
 *   orderLabel: string,
 * }} props
 */
export function ClosedDayFixtureReportCard({
  fixture,
  homeTeamLabel,
  awayTeamLabel,
  displayNameById,
  orderLabel,
}) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const headerId = `${baseId}-header`;

  const { home, away } = matchScoreParts(fixture.home_goals, fixture.away_goals);
  const notContested = Boolean(fixture.not_contested);
  const rawEvents = /** @type {unknown[]} */ (Array.isArray(fixture.events) ? fixture.events : []);

  const eventsChrono = useMemo(
    () => rawEvents.map((raw) => /** @type {Record<string, unknown>} */ (raw)),
    [rawEvents],
  );

  const { goalIndexToAssistName, consumedAssistIndices } = useMemo(
    () => pairAssistsToGoalsForReport(eventsChrono, displayNameById),
    [eventsChrono, displayNameById],
  );

  return (
    <div className="fm-closed-day-fx-card">
      <button
        type="button"
        id={headerId}
        className="fm-closed-day-fx-card__header"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fm-closed-day-fx-card__meta">
          <span className="fm-closed-day-fx-card__order">{orderLabel}</span>
          {notContested ? (
            <span className="fm-matchday-close-report__badge">{strings.matchDayCloseReportNotContested}</span>
          ) : null}
        </span>
        <span className="fm-closed-day-fx-card__row">
          <span className="fm-closed-day-fx-card__side fm-closed-day-fx-card__side--home">{homeTeamLabel}</span>
          <span className="fm-closed-day-fx-card__score" aria-live="polite">
            <span className="fm-closed-day-fx-card__score-num">{home}</span>
            <span className="fm-closed-day-fx-card__score-sep" aria-hidden="true">
              {MATCH_SCORE_SEP}
            </span>
            <span className="fm-closed-day-fx-card__score-num">{away}</span>
          </span>
          <span className="fm-closed-day-fx-card__side fm-closed-day-fx-card__side--away">{awayTeamLabel}</span>
        </span>
        <span className="fm-closed-day-fx-card__chev-row" aria-hidden="true">
          <IconChevronDown
            className={`fm-closed-day-fx-card__chev${open ? " fm-closed-day-fx-card__chev--open" : ""}`}
          />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        aria-hidden={!open}
        className={`fm-closed-day-fx-card__panel${open ? " fm-closed-day-fx-card__panel--open" : ""}`}
      >
        <div className="fm-closed-day-fx-card__panel-inner">
          {rawEvents.length === 0 ? (
            <p className="fm-muted fm-closed-day-fx-card__empty">{strings.matchDayCloseReportEventsEmpty}</p>
          ) : (
            <ol className="fm-closed-day-fx-card__events">
              {eventsChrono.map((ev, i) => {
                const type = String(ev.type ?? "");
                if (type === "assist" && consumedAssistIndices.has(i)) return null;

                const pid = ev.player_id ? String(ev.player_id) : "";
                const playerName = pid ? displayNameById[pid] || pid.slice(0, 8) : "";
                const sec = ev.elapsed_seconds;
                const minute =
                  sec == null || sec === ""
                    ? strings.matchDayCloseReportEventNoClock
                    : formatMatchEventTime(Number(sec));
                const kind = eventKindLabel(type, playerName);

                const assistName = type === "goal" ? goalIndexToAssistName.get(i) : undefined;
                const assistLine =
                  assistName != null && assistName !== ""
                    ? strings.matchLiveTimelineAssistUnderGoal.replace("{name}", assistName)
                    : null;
                const ariaCombined =
                  assistLine != null ? `${kind}. ${assistLine}` : kind;

                return (
                  <li
                    key={`${String(fixture.fixture_id ?? i)}-ev-${i}`}
                    className="fm-closed-day-fx-card__ev"
                    aria-label={ariaCombined}
                  >
                    <span className="fm-closed-day-fx-card__ev-time">{minute}</span>
                    {assistLine != null ? (
                      <span className="fm-closed-day-fx-card__ev-line">
                        <span className="fm-closed-day-fx-card__ev-msg">{kind}</span>
                        <span className="fm-closed-day-fx-card__ev-sep" aria-hidden="true">
                          {" · "}
                        </span>
                        <span className="fm-closed-day-fx-card__ev-sub">{assistLine}</span>
                      </span>
                    ) : (
                      <span className="fm-closed-day-fx-card__ev-text">{kind}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
