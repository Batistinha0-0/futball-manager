import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext.jsx";
import { strings } from "../../strings/pt-BR.js";
import { updatePlayer } from "../../services/playersApi.js";
import { Button } from "../atoms/Button.jsx";
import { Input } from "../atoms/Input.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SelectField } from "../molecules/SelectField.jsx";
import { StarRatingField, normalizeHalfStars } from "../molecules/StarRatingField.jsx";

const TITLE_ID = "squad-player-sheet-title";

const SQUAD_PROFILE_OPTIONS = [
  { value: "attack", label: strings.squadProfileAttack },
  { value: "defense", label: strings.squadProfileDefense },
  { value: "mixed", label: strings.squadProfileMixed },
];

/**
 * @param {{
 *   open: boolean,
 *   player: Record<string, unknown> | null,
 *   onClose: () => void,
 *   onUpdated: (record: Record<string, unknown>) => void,
 * }} props
 */
export function SquadPlayerSheetModal({ open, player, onClose, onUpdated }) {
  const { showToast } = useToast();
  const [nameDraft, setNameDraft] = useState("");
  const [skillStars, setSkillStars] = useState(3);
  const [profile, setProfile] = useState("mixed");
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaError, setMetaError] = useState(/** @type {string | null} */ (null));

  const pid = player && typeof player.id === "string" ? player.id : "";
  const displayName = player && typeof player.display_name === "string" ? player.display_name : "";

  useEffect(() => {
    if (!open || !player) return;
    setMetaError(null);
    setNameDraft(typeof player.display_name === "string" ? player.display_name : "");
    setSkillStars(normalizeHalfStars(player.skill_stars));
    setProfile(typeof player.profile === "string" ? player.profile : "mixed");
  }, [open, player]);

  const baselineStars = useMemo(
    () => (player ? normalizeHalfStars(player.skill_stars) : 0),
    [player],
  );
  const baselineProfile = useMemo(
    () => (player && typeof player.profile === "string" ? player.profile : "mixed"),
    [player],
  );
  const baselineName = useMemo(
    () => (player && typeof player.display_name === "string" ? player.display_name.trim() : ""),
    [player],
  );

  const metaDirty =
    player != null &&
    (nameDraft.trim() !== baselineName ||
      normalizeHalfStars(skillStars) !== baselineStars ||
      profile !== baselineProfile);

  function requestSaveMeta() {
    void runSaveMeta();
  }

  async function runSaveMeta() {
    if (!pid || !metaDirty) return;
    setMetaError(null);
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setMetaError(strings.squadFormErrorName);
      return;
    }
    const stars = normalizeHalfStars(skillStars);
    if (!Number.isFinite(stars) || stars < 0 || stars > 5) {
      setMetaError(strings.squadFormErrorStars);
      return;
    }
    /** @type {Record<string, unknown>} */
    const patch = {};
    if (trimmedName !== baselineName) {
      patch.display_name = trimmedName;
    }
    if (normalizeHalfStars(skillStars) !== baselineStars) {
      patch.skill_stars = stars;
    }
    if (profile !== baselineProfile) {
      patch.profile = profile;
    }
    if (Object.keys(patch).length === 0) return;

    setMetaSubmitting(true);
    try {
      const updated = await updatePlayer(pid, patch);
      onUpdated(updated);
      showToast({ message: strings.toastPlayerMetaSaved, variant: "success" });
    } catch {
      setMetaError(strings.squadPlayerSheetMetaError);
      showToast({ message: strings.toastPlayerMetaFail, variant: "error" });
    } finally {
      setMetaSubmitting(false);
    }
  }

  return (
    <ModalDialog
      open={open && player != null}
      onClose={onClose}
      titleId={TITLE_ID}
      title={nameDraft.trim() || displayName || strings.squadPlayerSheetFallbackTitle}
      footer={
        <div className="fm-modal-dialog__actions">
          <Button type="button" onClick={onClose} disabled={metaSubmitting}>
            {strings.squadPlayerSheetClose}
          </Button>
          <Button type="button" onClick={requestSaveMeta} disabled={!metaDirty || metaSubmitting}>
            {metaSubmitting ? strings.squadPlayerSheetMetaSaving : strings.squadPlayerSheetSaveMeta}
          </Button>
        </div>
      }
    >
      <div className="fm-squad-player-sheet fm-squad-player-sheet--meta-only">
        <div className="fm-squad-player-sheet__discrete">
          <div className="fm-field">
            <label htmlFor="squad-sheet-name" className="fm-field__label">
              {strings.squadFormName}
            </label>
            <Input
              id="squad-sheet-name"
              name="display_name"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={metaSubmitting}
              autoComplete="name"
              autoCapitalize="words"
              spellCheck={true}
            />
          </div>
          <StarRatingField
            id="squad-sheet-stars"
            label={strings.squadStars}
            value={skillStars}
            onChange={setSkillStars}
            disabled={metaSubmitting}
          />
          <SelectField
            id="squad-sheet-profile"
            label={strings.squadProfile}
            value={profile}
            onChange={setProfile}
            disabled={metaSubmitting}
            options={SQUAD_PROFILE_OPTIONS}
          />
          {metaError ? (
            <p className="fm-users-admin__action-error fm-users-admin__action-error--compact" role="alert">
              {metaError}
            </p>
          ) : null}
        </div>
      </div>
    </ModalDialog>
  );
}
