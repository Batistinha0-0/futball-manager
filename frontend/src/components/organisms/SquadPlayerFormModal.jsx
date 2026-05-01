import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext.jsx";
import { strings, squadPositionSelectOptions } from "../../strings/pt-BR.js";
import { createPlayer } from "../../services/playersApi.js";
import { Button } from "../atoms/Button.jsx";
import { FormField } from "../molecules/FormField.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SelectField } from "../molecules/SelectField.jsx";
import { StarRatingField, normalizeHalfStars } from "../molecules/StarRatingField.jsx";

const TITLE_CREATE = "squad-modal-create-title";

const SQUAD_PROFILE_OPTIONS = [
  { value: "attack", label: strings.squadProfileAttack },
  { value: "defense", label: strings.squadProfileDefense },
  { value: "mixed", label: strings.squadProfileMixed },
];

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved: (record?: Record<string, unknown> | null) => void,
 * }} props
 */
export function SquadPlayerFormModal({ open, onClose, onSaved }) {
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [skillStars, setSkillStars] = useState(3);
  const [profile, setProfile] = useState("mixed");
  const [position, setPosition] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDisplayName("");
    setSkillStars(3);
    setProfile("mixed");
    setPosition("");
    setActive(true);
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    void submitCreatePlayer();
  }

  async function submitCreatePlayer() {
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError(strings.squadFormErrorName);
      return;
    }
    const stars = skillStars;
    if (!Number.isFinite(stars) || stars < 0 || stars > 5) {
      setError(strings.squadFormErrorStars);
      return;
    }

    setSubmitting(true);
    try {
      const posTrim = position.trim();
      const positionPayload = posTrim === "" ? null : posTrim.slice(0, 64);
      const saved = await createPlayer({
        display_name: name,
        skill_stars: stars,
        profile,
        position: positionPayload,
        active,
      });
      onClose();
      if (saved && typeof saved === "object" && saved.id != null) {
        onSaved(saved);
        showToast({ message: strings.toastPlayerCreated, variant: "success" });
      } else {
        onSaved(null);
      }
    } catch {
      setError(strings.squadFormErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  const positionSelectOptions = useMemo(() => squadPositionSelectOptions, []);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={TITLE_CREATE}
      title={strings.squadModalCreateTitle}
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
          <StarRatingField
            id="squad-player-stars"
            label={strings.squadStars}
            value={skillStars}
            onChange={setSkillStars}
            disabled={submitting}
            hint={strings.squadStarsHint}
          />
          <SelectField
            id="squad-player-profile"
            label={strings.squadProfile}
            value={profile}
            onChange={setProfile}
            disabled={submitting}
            options={SQUAD_PROFILE_OPTIONS}
          />
          <SelectField
            id="squad-player-position"
            label={strings.squadPositionOptional}
            value={position}
            onChange={setPosition}
            disabled={submitting}
            options={positionSelectOptions}
          />
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
        </div>
      </form>
    </ModalDialog>
  );
}
