import { strings } from "../../strings/pt-BR.js";

/**
 * @param {{
 *   canWrite: boolean,
 *   busy: boolean,
 *   hasSession: boolean,
 *   onDraw: () => Promise<void>,
 * }} props
 */
export function SundayTeamsSection({ canWrite, busy, hasSession, onDraw }) {
  return (
    <div className="fm-sunday-teams">
      <h3 className="fm-sunday-teams__topic">{strings.sundayGameTeamsTopic}</h3>
      <p className="fm-muted fm-sunday-teams__desc">{strings.sundayGameTeamsDesc}</p>
      {canWrite ? (
        <div className="fm-sunday-teams__actions">
          {!hasSession ? <p className="fm-muted fm-sunday-teams__hint">{strings.sundayGameSaveBeforeDraw}</p> : null}
          <button type="button" className="fm-btn" disabled={busy || !hasSession} onClick={() => onDraw()}>
            {strings.matchDayDraw}
          </button>
        </div>
      ) : (
        <p className="fm-muted">{strings.matchDayDrawReadOnly}</p>
      )}
    </div>
  );
}
