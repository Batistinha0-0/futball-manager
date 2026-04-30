import { useEffect, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { createPlayer, updatePlayer } from "../../services/playersApi.js";
import { Button } from "../atoms/Button.jsx";
import { FormField } from "../molecules/FormField.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SelectField } from "../molecules/SelectField.jsx";

const TITLE_CREATE = "squad-modal-create-title";
const TITLE_EDIT = "squad-modal-edit-title";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved: () => void,
 *   mode: "create" | "edit",
 *   player: { id: string, display_name: string, skill_stars: number, profile: string, position: string | null, active: boolean } | null,
 * }} props
 */
export function SquadPlayerFormModal({ open, onClose, onSaved, mode, player }) {
  const [displayName, setDisplayName] = useState("");
  const [skillStars, setSkillStars] = useState("3");
  const [profile, setProfile] = useState("mixed");
  const [position, setPosition] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && player) {
      setDisplayName(player.display_name);
      setSkillStars(String(player.skill_stars));
      setProfile(player.profile);
      setPosition(player.position ?? "");
      setActive(player.active);
    } else {
      setDisplayName("");
      setSkillStars("3");
      setProfile("mixed");
      setPosition("");
      setActive(true);
    }
  }, [open, mode, player]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError(strings.squadFormErrorName);
      return;
    }
    const stars = Number.parseFloat(skillStars);
    if (Number.isNaN(stars) || stars < 0 || stars > 5) {
      setError(strings.squadFormErrorStars);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        await createPlayer({
          display_name: name,
          skill_stars: stars,
          profile,
          position: position.trim() || null,
          active,
        });
      } else if (player) {
        await updatePlayer(player.id, {
          display_name: name,
          skill_stars: stars,
          profile,
          position: position.trim() || null,
          active,
        });
      }
      onSaved();
      onClose();
    } catch {
      setError(strings.squadFormErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  const titleId = mode === "create" ? TITLE_CREATE : TITLE_EDIT;
  const title = mode === "create" ? strings.squadModalCreateTitle : strings.squadModalEditTitle;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      footer={
        <div className="fm-modal-dialog__actions">
          <Button type="button" onClick={onClose} disabled={submitting}>
            {strings.usersAdminCancel}
          </Button>
          <Button type="submit" form="squad-player-form" disabled={submitting}>
            {submitting ? strings.usersAdminSaving : strings.squadFormSave}
          </Button>
        </div>
      }
    >
      <form id="squad-player-form" className="fm-users-admin-modal-form" onSubmit={handleSubmit}>
        {error ? (
          <p className="fm-users-admin__action-error fm-users-admin__action-error--compact" role="alert">
            {error}
          </p>
        ) : null}
        <div className="fm-users-admin-modal-form__fields">
          <FormField
            id="squad-player-name"
            label={strings.squadFormName}
            value={displayName}
            onChange={(ev) => setDisplayName(ev.target.value)}
            disabled={submitting}
            autoComplete="off"
          />
          <FormField
            id="squad-player-stars"
            label={strings.squadStars}
            type="number"
            value={skillStars}
            onChange={(ev) => setSkillStars(ev.target.value)}
            disabled={submitting}
          />
          <SelectField
            id="squad-player-profile"
            label={strings.squadProfile}
            value={profile}
            onChange={(ev) => setProfile(ev.target.value)}
            disabled={submitting}
          >
            <option value="attack">{strings.squadProfileAttack}</option>
            <option value="defense">{strings.squadProfileDefense}</option>
            <option value="mixed">{strings.squadProfileMixed}</option>
          </SelectField>
          <FormField
            id="squad-player-position"
            label={strings.squadPositionOptional}
            value={position}
            onChange={(ev) => setPosition(ev.target.value)}
            disabled={submitting}
            placeholder={strings.squadPositionPlaceholder}
          />
          {mode === "edit" ? (
            <div className="fm-field fm-field--checkbox">
              <label className="fm-check-row">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(ev) => setActive(ev.target.checked)}
                  disabled={submitting}
                />
                <span>{strings.squadFormActiveLabel}</span>
              </label>
            </div>
          ) : null}
        </div>
      </form>
    </ModalDialog>
  );
}
