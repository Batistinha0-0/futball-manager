import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";

/**
 * @param {{
 *   canWrite: boolean,
 *   busy: boolean,
 *   hasSession: boolean,
 *   unsavedSettings?: boolean,
 *   drawButtonLabel?: string,
 *   onDraw: () => Promise<void>,
 * }} props
 */
export function SundayTeamsSection({
  canWrite,
  busy,
  hasSession,
  unsavedSettings = false,
  drawButtonLabel,
  onDraw,
}) {
  const drawBlocked = busy || !hasSession || unsavedSettings;
  return (
    <div className="fm-sunday-teams">
      <h3 className="fm-sunday-teams__topic">{strings.sundayGameTeamsTopic}</h3>
      <p className="fm-muted fm-sunday-teams__desc">{strings.sundayGameTeamsDesc}</p>
      {canWrite ? (
        <div className="fm-sunday-teams__actions">
          {!hasSession ? <p className="fm-muted fm-sunday-teams__hint">{strings.sundayGameSaveBeforeDraw}</p> : null}
          {hasSession && unsavedSettings ? (
            <p className="fm-muted fm-sunday-teams__hint">{strings.sundayGameUnsavedSettingsHint}</p>
          ) : null}
          <Button type="button" disabled={drawBlocked} loading={busy} onClick={() => void onDraw()}>
            {drawButtonLabel ?? strings.matchDayDraw}
          </Button>
        </div>
      ) : (
        <p className="fm-muted">{strings.matchDayDrawReadOnly}</p>
      )}
    </div>
  );
}
