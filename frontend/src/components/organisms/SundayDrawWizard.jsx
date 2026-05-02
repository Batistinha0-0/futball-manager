import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";

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
      <Button
        type="button"
        disabled={busy}
        loading={busy}
        onClick={async () => {
          if (hasSession) {
            const ok = window.confirm(strings.matchDayRedrawConfirm);
            if (!ok) return;
          }
          await onDraw();
        }}
      >
        {hasSession ? strings.matchDayRedraw : strings.matchDayDraw}
      </Button>
    </div>
  );
}
