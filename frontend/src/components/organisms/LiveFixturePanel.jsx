import { IconGkSave } from "../atoms/IconGkSave.jsx";
import { IconGoal } from "../atoms/IconGoal.jsx";
import { MatchTimerDisplay } from "../atoms/MatchTimerDisplay.jsx";
import { PressHoldButton } from "../atoms/PressHoldButton.jsx";
import { strings } from "../../strings/pt-BR.js";

/**
 * @param {{
 *   fixture: Record<string, unknown> | null,
 *   canWrite: boolean,
 *   busy: boolean,
 *   serverSkewMs: number,
 *   onStart: () => Promise<void>,
 *   onFinish: () => Promise<void>,
 *   onGoal: (teamSlot: number) => Promise<void>,
 *   onGkSave: (teamSlot: number) => Promise<void>,
 * }} props
 */
export function LiveFixturePanel({
  fixture,
  canWrite,
  busy,
  serverSkewMs,
  onStart,
  onFinish,
  onGoal,
  onGkSave,
}) {
  if (!fixture) {
    return <p className="fm-muted">{strings.matchDayNoFixture}</p>;
  }

  const st = String(fixture.status ?? "");
  const isLive = st === "live";
  const isPending = st === "pending";
  const homeSlot = Number(fixture.home_team_slot ?? 1);
  const awaySlot = Number(fixture.away_team_slot ?? 2);
  const hg = Number(fixture.home_goals ?? 0);
  const ag = Number(fixture.away_goals ?? 0);
  const dur = Number(fixture.duration_seconds ?? 420);
  const startedAt = /** @type {string | null | undefined} */ (fixture.started_at);

  return (
    <div className="fm-matchday-live">
      <div className="fm-matchday-live__head">
        <p className="fm-matchday-live__label">{strings.matchDayCurrentMatch}</p>
        <div className="fm-matchday-live__timer-wrap" aria-label={strings.matchDayTimerLabel}>
          <MatchTimerDisplay
            startedAt={startedAt}
            durationSeconds={dur}
            serverSkewMs={serverSkewMs}
            active={isLive}
          />
        </div>
      </div>

      <div className="fm-matchday-live__score" aria-live="polite" aria-atomic="true">
        <span className="fm-matchday-live__score-home">{hg}</span>
        <span className="fm-matchday-live__score-sep">—</span>
        <span className="fm-matchday-live__score-away">{ag}</span>
      </div>

      {canWrite && isPending ? (
        <PressHoldButton
          label={strings.matchDayStartHold}
          onComplete={() => {
            void onStart();
          }}
          disabled={busy}
          variant="primary"
        />
      ) : null}

      {canWrite && isLive ? (
        <div className="fm-matchday-live__actions">
          <div className="fm-matchday-live__row">
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-matchday-icon-btn"
              disabled={busy}
              aria-label={strings.matchDayGoalHomeAria}
              onClick={() => onGoal(homeSlot)}
            >
              <IconGoal />
              <span>{strings.matchDayGoalHome}</span>
            </button>
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-matchday-icon-btn"
              disabled={busy}
              aria-label={strings.matchDayGoalAwayAria}
              onClick={() => onGoal(awaySlot)}
            >
              <IconGoal />
              <span>{strings.matchDayGoalAway}</span>
            </button>
          </div>
          <div className="fm-matchday-live__row">
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-matchday-icon-btn"
              disabled={busy}
              aria-label={strings.matchDayGkHomeAria}
              onClick={() => onGkSave(homeSlot)}
            >
              <IconGkSave />
              <span>{strings.matchDayGkHome}</span>
            </button>
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-matchday-icon-btn"
              disabled={busy}
              aria-label={strings.matchDayGkAwayAria}
              onClick={() => onGkSave(awaySlot)}
            >
              <IconGkSave />
              <span>{strings.matchDayGkAway}</span>
            </button>
          </div>
          <PressHoldButton
            label={strings.matchDayFinishHold}
            onComplete={() => {
              void onFinish();
            }}
            disabled={busy}
            variant="danger"
          />
        </div>
      ) : null}

      {st === "finished" ? (
        <p className="fm-muted fm-matchday-live__done">{strings.matchDayFixtureFinishedHint}</p>
      ) : null}
    </div>
  );
}
