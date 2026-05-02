import { formatMatchClock, formatMatchEventTime } from "../../utils/formatMatchClock.js";
import { MATCH_SCORE_SEP } from "../../utils/formatMatchScore.js";
import { strings } from "../../strings/pt-BR.js";
import { PressHoldButton } from "../atoms/PressHoldButton.jsx";
import { IconPause } from "../atoms/IconPause.jsx";
import { IconPlay } from "../atoms/IconPlay.jsx";
import { IconMatchFinish } from "../atoms/IconMatchFinish.jsx";

/**
 * @typedef {{
 *   id: string,
 *   atSecond: number,
 *   team: "home" | "visitor",
 *   message: string,
 *   subMessage: string | null,
 * }} MatchTimelineEvent
 */

const RING_R = 48;
const RING_C = 2 * Math.PI * RING_R;

/**
 * @param {{
 *   playingSec: number,
 *   limitSec: number,
 *   isWarning: boolean,
 *   paused: boolean,
 * }} props
 */
function MatchClockRing({ playingSec, limitSec, isWarning, paused }) {
  const prog = limitSec > 0 ? Math.min(1, Math.max(0, playingSec / limitSec)) : 0;
  const offset = RING_C * (1 - prog);
  const timeLabel = formatMatchClock(playingSec);
  const aria = `${strings.jogoRolandoMatchClockLabel}: ${timeLabel}. ${Math.round(prog * 100)}% do tempo regulamentar.`;

  return (
    <svg
      className={`fm-match-panel__ring-svg${paused ? " fm-match-panel__ring-svg--paused" : ""}${isWarning ? " fm-match-panel__ring-svg--warn" : ""}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={aria}
    >
      <g transform="translate(60,60) rotate(-90)">
        <circle
          className="fm-match-panel__ring-track"
          r={RING_R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle
          className={`fm-match-panel__ring-progress${isWarning ? " fm-match-panel__ring-progress--warn" : ""}`}
          r={RING_R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
        />
      </g>
      <text className="fm-match-panel__ring-time" x="60" y="60" dominantBaseline="middle" textAnchor="middle">
        {timeLabel}
      </text>
    </svg>
  );
}

/**
 * Painel estilo acompanhamento ao vivo (placar, relógio, linha do tempo).
 * @param {{
 *   homeScore?: number,
 *   visitorScore?: number,
 *   playingElapsedSec?: number,
 *   stoppageSeconds?: number,
 *   matchDurationSeconds?: number,
 *   clockPaused?: boolean,
 *   onClockPauseToggle?: () => void,
 *   showMatchActions?: boolean,
 *   isRunning?: boolean,
 *   onToggleTimer?: () => void,
 *   events: MatchTimelineEvent[],
 *   showPlayControls?: boolean,
 *   timelineOnly?: boolean,
 *   timelineEmptyLabel?: string,
 *   kickoffDenied?: boolean,
 *   showFinishFixture?: boolean,
 *   onFinishFixture?: () => void,
 *   finishFixtureDisabled?: boolean,
 *   showStartMatch?: boolean,
 *   onStartMatch?: () => void,
 *   startMatchDisabled?: boolean,
 *   homeTeamLabel?: string,
 *   visitorTeamLabel?: string,
 * }} props
 */
export function MatchLivePanel({
  homeScore = 0,
  visitorScore = 0,
  playingElapsedSec = 0,
  stoppageSeconds = 0,
  matchDurationSeconds = 0,
  clockPaused = false,
  onClockPauseToggle = () => {},
  showMatchActions = false,
  isRunning = false,
  onToggleTimer = () => {},
  events,
  showPlayControls = true,
  timelineOnly = false,
  timelineEmptyLabel,
  kickoffDenied = false,
  showFinishFixture = false,
  onFinishFixture,
  finishFixtureDisabled = false,
  showStartMatch = false,
  onStartMatch,
  startMatchDisabled = false,
  homeTeamLabel = strings.jogoRolandoMatchHomeName,
  visitorTeamLabel = strings.jogoRolandoMatchVisitorName,
}) {
  const limitSec = Math.max(0, Math.floor(Number(matchDurationSeconds) || 0));
  const playSec = Math.max(0, Math.floor(Number(playingElapsedSec) || 0));
  const stopSec = Math.max(0, Math.floor(Number(stoppageSeconds) || 0));
  const effectiveLimitSec = limitSec + stopSec;
  const isClockWarning = limitSec > 0 && playSec >= effectiveLimitSec;
  const showRingPause = Boolean(showMatchActions && onClockPauseToggle);
  const showRingFinish = Boolean(showMatchActions && showFinishFixture && onFinishFixture);

  const timelineAria =
    events.length === 0
      ? strings.jogoRolandoMatchTimelineAriaNone
      : events.length === 1
        ? strings.jogoRolandoMatchTimelineAriaOne
        : strings.jogoRolandoMatchTimelineAriaSome.replace("{n}", String(events.length));

  if (timelineOnly) {
    return (
      <section className="fm-match-panel fm-match-panel--timeline-only" aria-label={strings.jogoRolandoMatchPanelAria}>
        <div className="fm-match-ev" role="region" aria-label={timelineAria}>
          {events.length > 0 ? <div className="fm-match-ev__spine" aria-hidden="true" /> : null}
          {events.length === 0 ? (
            <p className="fm-match-ev__empty fm-muted">
              {timelineEmptyLabel ?? strings.jogoRolandoMatchTimelineEmpty}
            </p>
          ) : (
            <ol className="fm-match-ev__list">
              {events.map((ev) => (
                <li key={ev.id} className={`fm-match-ev__row fm-match-ev__row--${ev.team}`}>
                  <div className="fm-match-ev__cell fm-match-ev__cell--home">
                    {ev.team === "home" ? (
                      <>
                        <p className="fm-match-ev__msg">{ev.message}</p>
                        {ev.subMessage ? <p className="fm-match-ev__sub">{ev.subMessage}</p> : null}
                      </>
                    ) : null}
                  </div>
                  <div className="fm-match-ev__cell fm-match-ev__cell--axis">
                    <span className="fm-match-ev__time">{formatMatchEventTime(ev.atSecond)}</span>
                    <span className="fm-match-ev__dot" aria-hidden="true" />
                  </div>
                  <div className="fm-match-ev__cell fm-match-ev__cell--visitor">
                    {ev.team === "visitor" ? (
                      <>
                        <p className="fm-match-ev__msg">{ev.message}</p>
                        {ev.subMessage ? <p className="fm-match-ev__sub">{ev.subMessage}</p> : null}
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="fm-match-panel" aria-label={strings.jogoRolandoMatchPanelAria}>
      <div className="fm-match-panel__board">
        <div className="fm-match-panel__side fm-match-panel__side--home">
          <span className="fm-match-panel__badge" aria-hidden="true" />
          <span className="fm-match-panel__team-name">{homeTeamLabel}</span>
        </div>
        <div className="fm-match-panel__score" aria-live="polite" aria-atomic="true">
          <span className="fm-match-panel__score-num">{homeScore}</span>
          <span className="fm-match-panel__score-sep" aria-hidden="true">
            {MATCH_SCORE_SEP}
          </span>
          <span className="fm-match-panel__score-num">{visitorScore}</span>
        </div>
        <div className="fm-match-panel__side fm-match-panel__side--visitor">
          <span className="fm-match-panel__badge fm-match-panel__badge--visitor" aria-hidden="true" />
          <span className="fm-match-panel__team-name">{visitorTeamLabel}</span>
        </div>
      </div>

      <div className="fm-match-panel__controls fm-match-panel__controls--ring">
        {showPlayControls ? (
          <button type="button" className="fm-match-panel__play fm-btn fm-btn--ghost" onClick={onToggleTimer}>
            {isRunning ? strings.jogoRolandoMatchPause : strings.jogoRolandoMatchPlay}
          </button>
        ) : null}
        <div className="fm-match-panel__ring-col">
          <div className="fm-match-panel__ring-holder">
            <MatchClockRing
              playingSec={playSec}
              limitSec={limitSec}
              isWarning={isClockWarning}
              paused={clockPaused}
            />
          </div>
          {kickoffDenied ? (
            <div className="fm-match-panel__kickoff">
              <p className="fm-match-panel__kickoff-hint fm-muted">{strings.matchLiveStartMatchNoPermission}</p>
            </div>
          ) : null}
          {stopSec > 0 ? (
            <p className="fm-match-panel__stoppage fm-muted" aria-live="polite">
              {strings.matchLiveClockStoppage.replace("{time}", formatMatchClock(stopSec))}
            </p>
          ) : null}
          {showStartMatch && onStartMatch ? (
            <div className="fm-match-panel__clock-cta" role="region" aria-label={strings.matchLiveStartMatchRegionAria}>
              <PressHoldButton
                label={strings.sundayGameStartHold}
                onComplete={() => {
                  onStartMatch();
                }}
                disabled={startMatchDisabled}
                variant="primary"
                className="fm-match-panel__start-match-btn"
              />
            </div>
          ) : null}
          {showRingPause || showRingFinish ? (
            <div className="fm-match-panel__match-actions" role="group" aria-label={strings.matchLiveMatchActionsGroup}>
              {showRingPause ? (
                <button
                  type="button"
                  className="fm-btn fm-match-panel__action-icon-btn"
                  onClick={onClockPauseToggle}
                  aria-pressed={clockPaused}
                  aria-label={clockPaused ? strings.matchLiveClockResumeAria : strings.matchLiveClockPauseAria}
                >
                  {clockPaused ? <IconPlay /> : <IconPause />}
                </button>
              ) : null}
              {showRingFinish ? (
                <button
                  type="button"
                  className="fm-btn fm-match-panel__action-icon-btn"
                  onClick={onFinishFixture}
                  disabled={finishFixtureDisabled}
                  aria-label={strings.matchLiveFinishMatchAria}
                  title={strings.matchLiveFinishMatch}
                >
                  <IconMatchFinish />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isClockWarning ? (
        <p className="fm-match-panel__time-warning" role="alert">
          {strings.matchLiveClockOvertimeWarning.replace("{limit}", formatMatchClock(effectiveLimitSec))}
        </p>
      ) : null}

      <div className="fm-match-ev" role="region" aria-label={timelineAria}>
        {events.length > 0 ? <div className="fm-match-ev__spine" aria-hidden="true" /> : null}
        {events.length === 0 ? (
          <p className="fm-match-ev__empty fm-muted">
            {timelineEmptyLabel ?? strings.jogoRolandoMatchTimelineEmpty}
          </p>
        ) : (
          <ol className="fm-match-ev__list">
            {events.map((ev) => (
              <li key={ev.id} className={`fm-match-ev__row fm-match-ev__row--${ev.team}`}>
                <div className="fm-match-ev__cell fm-match-ev__cell--home">
                  {ev.team === "home" ? (
                    <>
                      <p className="fm-match-ev__msg">{ev.message}</p>
                      {ev.subMessage ? <p className="fm-match-ev__sub">{ev.subMessage}</p> : null}
                    </>
                  ) : null}
                </div>
                <div className="fm-match-ev__cell fm-match-ev__cell--axis">
                  <span className="fm-match-ev__time">{formatMatchEventTime(ev.atSecond)}</span>
                  <span className="fm-match-ev__dot" aria-hidden="true" />
                </div>
                <div className="fm-match-ev__cell fm-match-ev__cell--visitor">
                  {ev.team === "visitor" ? (
                    <>
                      <p className="fm-match-ev__msg">{ev.message}</p>
                      {ev.subMessage ? <p className="fm-match-ev__sub">{ev.subMessage}</p> : null}
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
