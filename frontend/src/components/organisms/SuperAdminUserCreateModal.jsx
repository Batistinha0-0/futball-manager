import { useEffect, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { createOrganizerUser } from "../../services/usersAdminApi.js";
import { Button } from "../atoms/Button.jsx";
import { FormField } from "../molecules/FormField.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { Text } from "../atoms/Text.jsx";

const TITLE_ID = "sa-create-user-modal-title";

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onCreated: () => void,
 * }} props
 */
export function SuperAdminUserCreateModal({ open, onClose, onCreated }) {
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setUserName("");
    setPhone("");
    setPassword("");
    setError(null);
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createOrganizerUser({
        user_name: userName.trim(),
        password,
        phone: phone.trim(),
      });
      onCreated();
      onClose();
    } catch (err) {
      const status = /** @type {{ status?: number }} */ (err).status;
      if (status === 409) setError(strings.usersAdminErrorDuplicate);
      else setError(strings.usersAdminErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={strings.usersAdminModalCreateTitle}
      footer={
        <div className="fm-modal-dialog__actions">
          <Button type="button" onClick={onClose} disabled={submitting}>
            {strings.usersAdminCancel}
          </Button>
          <Button type="submit" form="sa-create-user-form" loading={submitting}>
            {submitting ? strings.usersAdminSaving : strings.usersAdminCreateSubmit}
          </Button>
        </div>
      }
    >
      <form id="sa-create-user-form" className="fm-users-admin-modal-form" onSubmit={handleSubmit}>
        {error ? (
          <p className="fm-users-admin__action-error fm-users-admin__action-error--compact" role="alert">
            {error}
          </p>
        ) : null}
        <p className="fm-muted fm-users-admin-modal-form__hint">{strings.usersAdminModalCreateHint}</p>
        <div className="fm-users-admin-modal-form__fields">
          <FormField
            id="sa-create-username"
            label={strings.loginUsernameLabel}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            autoComplete="off"
            disabled={submitting}
          />
          <FormField
            id="sa-create-phone"
            label={strings.usersAdminPhoneLabel}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            disabled={submitting}
          />
          <FormField
            id="sa-create-password"
            type="password"
            label={strings.loginPasswordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
          />
        </div>
      </form>
    </ModalDialog>
  );
}
