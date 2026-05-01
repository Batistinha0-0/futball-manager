import { useEffect, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { updateUser } from "../../services/usersAdminApi.js";
import { Button } from "../atoms/Button.jsx";
import { FormField } from "../molecules/FormField.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SelectField } from "../molecules/SelectField.jsx";
import { Text } from "../atoms/Text.jsx";

const TITLE_ID = "sa-edit-user-modal-title";

const ROLE_SELECT_OPTIONS = [
  { value: "organizer", label: strings.usersAdminRoleOrganizer },
  { value: "admin", label: strings.usersAdminRoleAdmin },
];

function roleLabel(role) {
  if (role === "super_admin") return strings.usersAdminRoleSuperAdmin;
  if (role === "admin") return strings.usersAdminRoleAdmin;
  return strings.usersAdminRoleOrganizer;
}

/**
 * @param {{
 *   open: boolean,
 *   user: object | null,
 *   onClose: () => void,
 *   onSaved: () => void,
 * }} props
 */
export function SuperAdminUserEditModal({ open, user, onClose, onSaved }) {
  const [editUserName, setEditUserName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("organizer");
  const [editPassword, setEditPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open || !user) return;
    setEditUserName(user.user_name);
    setEditPhone(user.phone);
    setEditRole(user.role === "admin" ? "admin" : "organizer");
    setEditPassword("");
    setError(null);
  }, [open, user]);

  async function handleSave() {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      /** @type {Record<string, string>} */
      const patch = {};
      if (user.role === "super_admin") {
        if (editPhone.trim()) patch.phone = editPhone.trim();
        if (editPassword) patch.password = editPassword;
      } else {
        patch.user_name = editUserName.trim();
        patch.phone = editPhone.trim();
        patch.role = editRole;
        if (editPassword) patch.password = editPassword;
      }
      if (Object.keys(patch).length === 0) {
        setError(strings.usersAdminErrorNoChanges);
        setSubmitting(false);
        return;
      }
      await updateUser(user.id, patch);
      onSaved();
      onClose();
    } catch (err) {
      const status = /** @type {{ status?: number }} */ (err).status;
      if (status === 409) setError(strings.usersAdminErrorDuplicate);
      else setError(strings.usersAdminErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  const isSuper = user.role === "super_admin";

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={strings.usersAdminModalEditTitle}
      footer={
        <div className="fm-modal-dialog__actions">
          <Button type="button" onClick={onClose} disabled={submitting}>
            {strings.usersAdminCancel}
          </Button>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? strings.usersAdminSaving : strings.usersAdminSave}
          </Button>
        </div>
      }
    >
      <div className="fm-users-admin-modal-form">
        {error ? (
          <p className="fm-users-admin__action-error fm-users-admin__action-error--compact" role="alert">
            {error}
          </p>
        ) : null}

        <dl className="fm-users-admin-detail">
          <div className="fm-users-admin-detail__row">
            <dt className="fm-users-admin-detail__dt">{strings.usersAdminFieldId}</dt>
            <dd className="fm-users-admin-detail__dd fm-users-admin-detail__dd--mono">{user.id}</dd>
          </div>
          <div className="fm-users-admin-detail__row">
            <dt className="fm-users-admin-detail__dt">{strings.usersAdminColRole}</dt>
            <dd className="fm-users-admin-detail__dd">{roleLabel(user.role)}</dd>
          </div>
        </dl>

        <div className="fm-users-admin-modal-form__fields">
          {isSuper ? (
            <div className="fm-field">
              <Text as="span" className="fm-field__label">
                {strings.loginUsernameLabel}
              </Text>
              <p className="fm-users-admin-readonly">{user.user_name}</p>
            </div>
          ) : (
            <FormField
              id="sa-edit-username"
              label={strings.loginUsernameLabel}
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              disabled={submitting}
            />
          )}
          <FormField
            id="sa-edit-phone"
            label={strings.usersAdminPhoneLabel}
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            disabled={submitting}
          />
          {!isSuper ? (
            <SelectField
              id="sa-edit-role"
              label={strings.usersAdminColRole}
              value={editRole}
              onChange={setEditRole}
              disabled={submitting}
              options={ROLE_SELECT_OPTIONS}
            />
          ) : null}
          <FormField
            id="sa-edit-password"
            type="password"
            label={strings.usersAdminNewPasswordOptional}
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
          />
        </div>
      </div>
    </ModalDialog>
  );
}
