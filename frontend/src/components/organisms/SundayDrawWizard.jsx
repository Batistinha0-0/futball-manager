import { strings } from "../../strings/pt-BR.js";

/**
 * @param {{
 *   canWrite: boolean,
 *   hasSession: boolean,
 *   busy: boolean,
 *   onDraw: () => Promise<void>,
 * }} props
 */
export function SundayDrawWizard({ canWrite, hasSession, busy, onDraw }) {
  if (!canWrite) {
    return <p className="fm-muted fm-matchday-draw-hint">{strings.matchDayDrawReadOnly}</p>;
  }

  return (
    <div className="fm-matchday-draw">
      <button
        type="button"
        className="fm-btn"
        disabled={busy}
        onClick={async () => {
          if (hasSession) {
            const ok = window.confirm(strings.matchDayRedrawConfirm);
            if (!ok) return;
          }
          await onDraw();
        }}
      >
        {hasSession ? strings.matchDayRedraw : strings.matchDayDraw}
      </button>
    </div>
  );
}
