import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { SwitchField } from "../atoms/SwitchField.jsx";
import { SelectField } from "./SelectField.jsx";

/** @param {Record<string, unknown>} patch */
function patchSignature(patch) {
  return JSON.stringify(patch);
}

/**
 * Patch canónico alinhado ao servidor e a `buildPatch` após hidratação (inclui resolução de GR duplicado).
 * @param {Record<string, unknown> | null | undefined} s
 */
function stablePatchFromSession(s) {
  if (!s) {
    return {
      default_match_duration_seconds: 420,
      default_max_goals_per_team: 2,
      team_count: 2,
      players_per_team: 5,
      fixed_goalkeepers_enabled: false,
      fixed_goalkeeper_player_id_1: null,
      fixed_goalkeeper_player_id_2: null,
    };
  }
  const minutes = Math.round(Number(s.default_match_duration_seconds ?? 420) / 60);
  const sec = Math.min(3600, Math.max(60, Math.round(minutes) * 60));
  const fixedGk = Boolean(s.fixed_goalkeepers_enabled);
  let g1 = s.fixed_goalkeeper_player_id_1 != null && String(s.fixed_goalkeeper_player_id_1) ? String(s.fixed_goalkeeper_player_id_1) : null;
  let g2 = s.fixed_goalkeeper_player_id_2 != null && String(s.fixed_goalkeeper_player_id_2) ? String(s.fixed_goalkeeper_player_id_2) : null;
  if (g1 && g2 && g1 === g2) {
    g2 = null;
  }
  return {
    default_match_duration_seconds: sec,
    default_max_goals_per_team: Math.min(20, Math.max(0, Math.round(Number(s.default_max_goals_per_team ?? 2)))),
    team_count: Math.min(12, Math.max(2, Math.round(Number(s.team_count ?? 2)))),
    players_per_team: Math.min(20, Math.max(1, Math.round(Number(s.players_per_team ?? 5)))),
    fixed_goalkeepers_enabled: fixedGk,
    fixed_goalkeeper_player_id_1: fixedGk && g1 ? g1 : null,
    fixed_goalkeeper_player_id_2: fixedGk && g2 ? g2 : null,
  };
}

/**
 * @param {{
 *   session: Record<string, unknown> | null | undefined,
 *   canWrite: boolean,
 *   settingsSaving: boolean,
 *   players: Array<{ id: unknown, display_name?: string, position?: string | null, active?: boolean }>,
 *   onSave: (patch: Record<string, unknown>) => Promise<void>,
 *   onDirtyChange?: (dirty: boolean) => void,
 * }} props
 */
export function SundayGameSettingsForm({
  session,
  canWrite,
  settingsSaving,
  players,
  onSave,
  onDirtyChange,
}) {
  const [minutes, setMinutes] = useState(7);
  const [maxGoals, setMaxGoals] = useState(2);
  const [teamCount, setTeamCount] = useState(2);
  const [ppt, setPpt] = useState(5);
  const [fixedGk, setFixedGk] = useState(false);
  const [gk1, setGk1] = useState("");
  const [gk2, setGk2] = useState("");
  const [savedSignature, setSavedSignature] = useState("");

  const lastHydratedKeyRef = useRef("__init__");

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

  const currentSignature = useMemo(() => patchSignature(buildPatch()), [buildPatch]);
  const isDirty = currentSignature !== savedSignature;

  useLayoutEffect(() => {
    const id = session ? String(session.id ?? "") : "";
    const key = id || "__empty__";
    if (lastHydratedKeyRef.current === key) {
      return;
    }
    lastHydratedKeyRef.current = key;

    if (!session) {
      setMinutes(7);
      setMaxGoals(2);
      setTeamCount(2);
      setPpt(5);
      setFixedGk(false);
      setGk1("");
      setGk2("");
      const p = stablePatchFromSession(null);
      setSavedSignature(patchSignature(p));
      return;
    }

    const p = stablePatchFromSession(session);
    setMinutes(Math.round(Number(p.default_match_duration_seconds) / 60));
    setMaxGoals(Number(p.default_max_goals_per_team ?? 2));
    setTeamCount(Number(p.team_count ?? 2));
    setPpt(Number(p.players_per_team ?? 5));
    setFixedGk(Boolean(p.fixed_goalkeepers_enabled));
    setGk1(p.fixed_goalkeeper_player_id_1 ? String(p.fixed_goalkeeper_player_id_1) : "");
    setGk2(p.fixed_goalkeeper_player_id_2 ? String(p.fixed_goalkeeper_player_id_2) : "");
    setSavedSignature(patchSignature(p));
  }, [session]);

  useEffect(() => {
    onDirtyChange?.(canWrite && isDirty);
  }, [canWrite, isDirty, onDirtyChange]);

  const setGk1Safe = useCallback((v) => {
    setGk1(v);
    if (v && v === gk2) setGk2("");
  }, [gk2]);

  const setGk2Safe = useCallback((v) => {
    setGk2(v);
    if (v && v === gk1) setGk1("");
  }, [gk1]);

  const handleSave = useCallback(async () => {
    if (!isDirty || settingsSaving) return;
    const patch = buildPatch();
    try {
      await onSave(patch);
      setSavedSignature(patchSignature(patch));
    } catch {
      /* actionError no hook */
    }
  }, [buildPatch, isDirty, onSave, settingsSaving]);

  const gkPlayerOptions = useMemo(
    () =>
      players
        .filter((p) => p.active !== false && String(p.position ?? "").trim().toUpperCase() === "GL")
        .map((p) => ({
          value: String(p.id),
          label: String(p.display_name ?? p.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt")),
    [players],
  );

  const gkOptionsForGk1 = useMemo(
    () => [{ value: "", label: strings.sundayGameGkUnset }, ...gkPlayerOptions.filter((o) => o.value !== gk2)],
    [gkPlayerOptions, gk2],
  );

  const gkOptionsForGk2 = useMemo(
    () => [{ value: "", label: strings.sundayGameGkUnset }, ...gkPlayerOptions.filter((o) => o.value !== gk1)],
    [gkPlayerOptions, gk1],
  );

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
            large
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
                    onChange={setGk1Safe}
                    disabled={fieldDisabled || !showGkPanel}
                    options={gkOptionsForGk1}
                  />
                </div>
                <div className="fm-sunday-gk-divider" aria-hidden="true" />
                <div className="fm-sunday-gk-slot">
                  <SelectField
                    id="sunday-gk-b"
                    label={strings.sundayGameGkRoleB}
                    value={gk2}
                    onChange={setGk2Safe}
                    disabled={fieldDisabled || !showGkPanel}
                    options={gkOptionsForGk2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fm-sunday-settings__save-row">
          <button
            type="button"
            className="fm-btn fm-sunday-settings__save-btn"
            disabled={fieldDisabled || !isDirty}
            onClick={() => void handleSave()}
          >
            {strings.sundayGameSettingsSave}
          </button>
        </div>
      </div>
    </div>
  );
}
