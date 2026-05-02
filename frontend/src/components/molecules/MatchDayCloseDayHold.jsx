import { PressHoldButton } from "../atoms/PressHoldButton.jsx";

/**
 * @param {{
 *   label: string,
 *   hint?: string,
 *   onComplete: () => void | Promise<void>,
 *   disabled?: boolean,
 *   holdClassName?: string,
 * }} props
 */
export function MatchDayCloseDayHold({ label, hint, onComplete, disabled = false, holdClassName = "" }) {
  return (
    <div className="fm-sunday-game-card__close-hold">
      {hint ? (
        <p className="fm-muted fm-sunday-game-card__close-hint" role="status">
          {hint}
        </p>
      ) : null}
      <PressHoldButton
        className={holdClassName.trim()}
        label={label}
        onComplete={onComplete}
        disabled={disabled}
        variant="danger"
      />
    </div>
  );
}
