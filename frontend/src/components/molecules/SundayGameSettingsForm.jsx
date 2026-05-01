import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { SwitchField } from "../atoms/SwitchField.jsx";
import { SelectField } from "./SelectField.jsx";

/** @param {Record<string, unknown>} patch */
function patchSignature(patch) {
  return JSON.stringify(patch);
}

/**
 * @param {{
 *   session: Record<string, unknown> | null | undefined,
 *   canWrite: boolean,
 *   settingsSaving: boolean,
 *   players: Array<{ id: unknown, display_name?: string, position?: string | null, active?: boolean }>,
 *   onSave: (patch: Record<string, unknown>) => Promise<void>,
 * }} props
 */
export function SundayGameSettingsForm({ session, canWrite, settingsSaving, players, onSave }) {
  const [minutes, setMinutes] = useState(7);
  const [maxGoals, setMaxGoals] = useState(2);
  const [teamCount, setTeamCount] = useState(2);
  const [ppt, setPpt] = useState(5);
  const [fixedGk, setFixedGk] = useState(false);
  const [gk1, setGk1] = useState("");
  const [gk2, setGk2] = useState("");

  const lastHydratedKeyRef = useRef("__init__");
  const skipHydrateEchoRef = useRef(false);
  const lastSentSigRef = useRef("");
  const debounceTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const buildPatch = useCallback(() => {
    const sec = Math.min(3600, Math.max(60, Math.round(minutes) * 60));
    return {
      default_match_duration_seconds: sec,
      default_max_goals_per_team: Math.min(20, Math.max(0, Math.round(maxGoals))),
      team_count: Math.min(12, Math.max(2, Math.round(teamCount))),
      players_per_team: Math.min(20, Math.max(1, Math.round(ppt))),
      fixed_goalkeepers_enabled: fixedGk,
      fixed_goalkeeper_player_id_1: fixedGk && gk1 ? gk1 : null,
      fixed_goalkeeper_player_id_2: fixedGk && gk2 ? gk2 : null,
    };
  }, [minutes, maxGoals, teamCount, ppt, fixedGk, gk1, gk2]);

  useLayoutEffect(() => {
    const id = session ? String(session.id ?? "") : "";
    const key = id || "__empty__";
    if (lastHydratedKeyRef.current === key) {
      return;
    }
    lastHydratedKeyRef.current = key;
    skipHydrateEchoRef.current = true;

    if (!session) {
      setMinutes(7);
      setMaxGoals(2);
      setTeamCount(2);
      setPpt(5);
      setFixedGk(false);
      setGk1("");
      setGk2("");
      return;
    }
    setMinutes(Math.round(Number(session.default_match_duration_seconds ?? 420) / 60));
    setMaxGoals(Number(session.default_max_goals_per_team ?? 2));
    setTeamCount(Number(session.team_count ?? 2));
    setPpt(Number(session.players_per_team ?? 5));
    setFixedGk(Boolean(session.fixed_goalkeepers_enabled));
    setGk1(String(session.fixed_goalkeeper_player_id_1 ?? ""));
    setGk2(String(session.fixed_goalkeeper_player_id_2 ?? ""));
  }, [session]);

  useEffect(() => {
    if (!canWrite) return;

    if (skipHydrateEchoRef.current) {
      skipHydrateEchoRef.current = false;
      lastSentSigRef.current = patchSignature(buildPatch());
      return;
    }

    const patch = buildPatch();
    const sig = patchSignature(patch);
    if (sig === lastSentSigRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void (async () => {
        try {
          await onSave(patch);
          lastSentSigRef.current = sig;
        } catch {
          /* actionError no hook */
        }
      })();
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [canWrite, buildPatch, onSave, minutes, maxGoals, teamCount, ppt, fixedGk, gk1, gk2]);

  const gkOptions = [
    { value: "", label: strings.sundayGameGkUnset },
    ...players
      .filter((p) => p.active !== false && String(p.position ?? "").trim().toUpperCase() === "GL")
      .map((p) => ({
        value: String(p.id),
        label: String(p.display_name ?? p.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt")),
  ];

  if (!canWrite) {
    return (
      <div className="fm-sunday-settings fm-muted">
        <p>{strings.sundayGameSettingsReadOnly}</p>
      </div>
    );
  }

  const showGkPanel = fixedGk;
  const fieldDisabled = settingsSaving;

  return (
    <div className="fm-sunday-settings">
      <h3 className="fm-sunday-settings__topic">{strings.sundayGameSettingsTopic}</h3>
      {settingsSaving ? (
        <p className="fm-muted fm-sunday-settings__saving" role="status">
          {strings.sundayGameSettingsSaving}
        </p>
      ) : null}
      <div className="fm-sunday-settings__form">
        <div className="fm-sunday-settings__grid">
          <label className="fm-sunday-settings__field">
            <span className="fm-sunday-settings__label">{strings.sundayGameDurationMin}</span>
            <input
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(ev) => setMinutes(Number(ev.target.value))}
              disabled={fieldDisabled}
            />
          </label>
          <label className="fm-sunday-settings__field">
            <span className="fm-sunday-settings__label">{strings.sundayGameMaxGoals}</span>
            <input
              type="number"
              min={0}
              max={20}
              value={maxGoals}
              onChange={(ev) => setMaxGoals(Number(ev.target.value))}
              disabled={fieldDisabled}
            />
          </label>
          <label className="fm-sunday-settings__field">
            <span className="fm-sunday-settings__label">{strings.sundayGameTeamCount}</span>
            <input
              type="number"
              min={2}
              max={12}
              value={teamCount}
              onChange={(ev) => setTeamCount(Number(ev.target.value))}
              disabled={fieldDisabled}
            />
          </label>
          <label className="fm-sunday-settings__field">
            <span className="fm-sunday-settings__label">{strings.sundayGamePlayersPerTeam}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={ppt}
              onChange={(ev) => setPpt(Number(ev.target.value))}
              disabled={fieldDisabled}
            />
          </label>
        </div>

        <div className="fm-sunday-settings__row fm-sunday-settings__row--switch">
          <SwitchField
            id="sunday-fixed-gk-switch"
            label={strings.sundayGameFixedGk}
            checked={fixedGk}
            onChange={setFixedGk}
            disabled={fieldDisabled}
          />
        </div>

        <div
          className={`fm-sunday-gk-reveal${showGkPanel ? " fm-sunday-gk-reveal--open" : ""}`}
          aria-hidden={!showGkPanel}
        >
          <div className="fm-sunday-gk-reveal__measure">
            <div className="fm-sunday-gk-reveal__content">
              <p className="fm-muted fm-sunday-settings__gk-explain">{strings.sundayGameFixedGkExplain}</p>
              <div className="fm-sunday-settings__gk-pair">
                <div className="fm-sunday-gk-slot">
                  <SelectField
                    id="sunday-gk-a"
                    label={strings.sundayGameGkRoleA}
                    value={gk1}
                    onChange={setGk1}
                    disabled={fieldDisabled || !showGkPanel}
                    options={gkOptions}
                  />
                </div>
                <div className="fm-sunday-gk-divider" aria-hidden="true" />
                <div className="fm-sunday-gk-slot">
                  <SelectField
                    id="sunday-gk-b"
                    label={strings.sundayGameGkRoleB}
                    value={gk2}
                    onChange={setGk2}
                    disabled={fieldDisabled || !showGkPanel}
                    options={gkOptions}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
