import { useId } from "react";
import { strings } from "../../strings/pt-BR.js";
import { MATCH_SCORE_SEP } from "../../utils/formatMatchScore.js";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { Button } from "../atoms/Button.jsx";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   scoreHome: number,
 *   scoreAway: number,
 *   goalLines: string[],
 *   rotationLine: string | null,
 * }} props
 */
export function GoalLimitCelebrationModal({ open, onClose, title, scoreHome, scoreAway, goalLines, rotationLine }) {
  const scoreAria = strings.matchLiveGoalLimitScoreAria
    .replace("{homeG}", String(scoreHome))
    .replace("{awayG}", String(scoreAway));
  const titleId = useId();

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      footer={
        <Button type="button" className="fm-btn--primary" onClick={onClose}>
          {strings.matchLiveGoalLimitOk}
        </Button>
      }
    >
      <p className="fm-match-live-goal-cap__score" aria-label={scoreAria}>
        <span className="fm-match-live-goal-cap__score-num">{scoreHome}</span>
        <span className="fm-match-live-goal-cap__score-sep" aria-hidden="true">{MATCH_SCORE_SEP}</span>
        <span className="fm-match-live-goal-cap__score-num">{scoreAway}</span>
      </p>
      {rotationLine ? <p className="fm-match-live-goal-cap__rotation">{rotationLine}</p> : null}
      <div className="fm-match-live-goal-cap__goals">
        <p className="fm-match-live-goal-cap__goals-heading">{strings.matchLiveGoalLimitGoalsHeading}</p>
        {goalLines.length === 0 ? (
          <p className="fm-muted">{strings.matchLiveGoalLimitGoalsEmpty}</p>
        ) : (
          <ul className="fm-match-live-goal-cap__goals-list">
            {goalLines.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </ModalDialog>
  );
}
