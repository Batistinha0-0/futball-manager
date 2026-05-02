import { useCallback, useEffect, useId, useMemo, useState } from "react";
import goalIconPng from "../../assets/icons/goal.png";
import goalkeeperIconPng from "../../assets/icons/goalkeeper.png";
import redCardIconPng from "../../assets/icons/red-card.png";
import yellowCardIconPng from "../../assets/icons/yellow-card.png";
import { useToast } from "../../context/ToastContext.jsx";
import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SelectField } from "../molecules/SelectField.jsx";

/**
 * @param {{
 *   label: string,
 *   icon: import("react").ReactNode,
 *   value: number,
 *   onChange: (n: number) => void,
 *   iconDecorative?: boolean,
 *   min?: number,
 *   max?: number,
 * }} props
 */
function LiveStatRow({ label, icon, value, onChange, iconDecorative = true, min = 0, max = 99 }) {
  const decLabel = strings.jogoRolandoLivePlayerModalCountDown.replace("{label}", label);
  const incLabel = strings.jogoRolandoLivePlayerModalCountUp.replace("{label}", label);

  const dec = useCallback(() => {
    onChange(Math.max(min, value - 1));
  }, [min, onChange, value]);

  const inc = useCallback(() => {
    onChange(Math.min(max, value + 1));
  }, [max, onChange, value]);

  return (
    <div className="fm-live-player-modal__row">
      <span className="fm-live-player-modal__label">{label}</span>
      <div className="fm-live-player-modal__control">
        <span className="fm-live-player-modal__icon" {...(iconDecorative ? { "aria-hidden": true } : {})}>
          {icon}
        </span>
        <div className="fm-live-player-modal__stepper" role="group" aria-label={label}>
          <button
            type="button"
            className="fm-live-player-modal__step fm-btn fm-btn--ghost"
            aria-label={decLabel}
            disabled={value <= min}
            onClick={dec}
          >
            −
          </button>
          <span className="fm-live-player-modal__value" aria-live="polite">
            {value}
          </span>
          <button
            type="button"
            className="fm-live-player-modal__step fm-btn fm-btn--ghost"
            aria-label={incLabel}
            disabled={value >= max}
            onClick={inc}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de eventos do jogador no sandbox “jogo a correr” (estilo alinhado ao modal do elenco).
 * Assistências só entram pelo registro de gol (quem deu a assistência); não há stepper manual.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   displayName: string,
 *   resolvedPlayerId?: string | null,
 *   isGoalkeeper: boolean,
 *   playerKey: string,
 *   team: "home" | "visitor",
 *   teammateAssistOptions: string[],
 *   onPersistStats?: (payload: import("../../utils/sandboxMatchFromModalSave.js").SandboxModalSavePayload) => void | Promise<void>,
 * }} props
 */
export function PitchPlayerLiveStatsModal({
  open,
  onClose,
  displayName,
  resolvedPlayerId = null,
  isGoalkeeper,
  playerKey,
  team,
  teammateAssistOptions,
  onPersistStats,
}) {
  const { showToast } = useToast();
  const titleId = useId().replace(/:/g, "");
  const goalAssistSelectId = useId().replace(/:/g, "");
  const [gols, setGols] = useState(0);
  const [goalAssistFromName, setGoalAssistFromName] = useState("");
  const [cartoesAmarelos, setCartoesAmarelos] = useState(0);
  const [cartoesVermelhos, setCartoesVermelhos] = useState(0);
  const [defesas, setDefesas] = useState(0);
  const [saving, setSaving] = useState(false);

  const assistSelectOptions = useMemo(
    () => [
      { value: "", label: strings.jogoRolandoLivePlayerModalGoalAssistNoneOption },
      ...teammateAssistOptions.map((n) => ({ value: n, label: n })),
    ],
    [teammateAssistOptions],
  );

  useEffect(() => {
    if (!open) return;
    setGols(0);
    setGoalAssistFromName("");
    setCartoesAmarelos(0);
    setCartoesVermelhos(0);
    setDefesas(0);
    setSaving(false);
  }, [open, playerKey]);

  useEffect(() => {
    if (gols === 0) setGoalAssistFromName("");
  }, [gols]);

  const cap = 1;

  const setGolsExclusive = useCallback((n) => {
    const v = Math.min(cap, Math.max(0, Math.round(Number(n)) || 0));
    setGols(v);
    if (v > 0) {
      setCartoesAmarelos(0);
      setCartoesVermelhos(0);
      setDefesas(0);
    }
  }, []);

  const setAmarelosExclusive = useCallback((n) => {
    const v = Math.min(cap, Math.max(0, Math.round(Number(n)) || 0));
    setCartoesAmarelos(v);
    if (v > 0) {
      setGols(0);
      setGoalAssistFromName("");
      setCartoesVermelhos(0);
      setDefesas(0);
    }
  }, []);

  const setVermelhosExclusive = useCallback((n) => {
    const v = Math.min(cap, Math.max(0, Math.round(Number(n)) || 0));
    setCartoesVermelhos(v);
    if (v > 0) {
      setGols(0);
      setGoalAssistFromName("");
      setCartoesAmarelos(0);
      setDefesas(0);
    }
  }, []);

  const setDefesasExclusive = useCallback((n) => {
    const v = Math.min(cap, Math.max(0, Math.round(Number(n)) || 0));
    setDefesas(v);
    if (v > 0) {
      setGols(0);
      setGoalAssistFromName("");
      setCartoesAmarelos(0);
      setCartoesVermelhos(0);
    }
  }, []);

  const title = strings.jogoRolandoLivePlayerModalTitle.replace("{name}", displayName);

  async function handleSave() {
    const g = gols;
    const payload = {
      team,
      displayName,
      playerId: resolvedPlayerId != null && String(resolvedPlayerId).trim() ? String(resolvedPlayerId).trim() : null,
      gols: g,
      assists: 0,
      assistsBaseline: 0,
      goalAssistFromName: g > 0 ? goalAssistFromName : "",
      cartoesAmarelos,
      cartoesVermelhos,
      defesas: isGoalkeeper ? defesas : 0,
    };
    setSaving(true);
    try {
      await Promise.resolve(onPersistStats?.(payload));
      setSaving(false);
      showToast({ message: strings.jogoRolandoLivePlayerModalSaveToast, variant: "success" });
      onClose();
    } catch {
      /* Erro: toast vermelho já emitido em useMatchDayToday.run ao falhar recordEvent. */
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      dismissOnBackdrop={false}
      dismissOnEscape={false}
      footer={
        <div className="fm-modal-dialog__actions">
          <Button type="button" className="fm-btn--primary" onClick={() => void handleSave()} loading={saving}>
            {strings.squadFormSave}
          </Button>
        </div>
      }
    >
      <div className="fm-users-admin-modal-form">
        <div className="fm-users-admin-modal-form__fields">
          <p className="fm-muted fm-live-player-modal__intro">{strings.jogoRolandoLivePlayerModalIntro}</p>
          <div className="fm-live-player-modal__rows">
            <LiveStatRow
              label={strings.jogoRolandoLivePlayerModalGols}
              icon={
                <img
                  src={goalIconPng}
                  alt={strings.jogoRolandoLivePlayerModalGoalIconAlt}
                  className="fm-live-player-modal__icon-img"
                  width={20}
                  height={20}
                  decoding="async"
                />
              }
              iconDecorative={false}
              value={gols}
              max={cap}
              onChange={setGolsExclusive}
            />
            {gols > 0 ? (
              <div className="fm-live-player-modal__goal-assist">
                <SelectField
                  id={goalAssistSelectId}
                  label={strings.jogoRolandoLivePlayerModalGoalAssistLabel}
                  value={goalAssistFromName}
                  onChange={setGoalAssistFromName}
                  options={assistSelectOptions}
                />
              </div>
            ) : null}
            <LiveStatRow
              label={strings.jogoRolandoLivePlayerModalYellowCards}
              icon={
                <img
                  src={yellowCardIconPng}
                  alt={strings.jogoRolandoLivePlayerModalYellowCardIconAlt}
                  className="fm-live-player-modal__icon-img fm-live-player-modal__icon-img--card"
                  width={20}
                  height={20}
                  decoding="async"
                />
              }
              iconDecorative={false}
              value={cartoesAmarelos}
              max={cap}
              onChange={setAmarelosExclusive}
            />
            <LiveStatRow
              label={strings.jogoRolandoLivePlayerModalRedCards}
              icon={
                <img
                  src={redCardIconPng}
                  alt={strings.jogoRolandoLivePlayerModalRedCardIconAlt}
                  className="fm-live-player-modal__icon-img fm-live-player-modal__icon-img--card"
                  width={20}
                  height={20}
                  decoding="async"
                />
              }
              iconDecorative={false}
              value={cartoesVermelhos}
              max={cap}
              onChange={setVermelhosExclusive}
            />
            {isGoalkeeper ? (
              <LiveStatRow
                label={strings.jogoRolandoLivePlayerModalDefesas}
                icon={
                  <img
                    src={goalkeeperIconPng}
                    alt={strings.jogoRolandoLivePlayerModalGoalkeeperIconAlt}
                    className="fm-live-player-modal__icon-img"
                    width={20}
                    height={20}
                    decoding="async"
                  />
                }
                iconDecorative={false}
                value={defesas}
                max={cap}
                onChange={setDefesasExclusive}
              />
            ) : null}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
