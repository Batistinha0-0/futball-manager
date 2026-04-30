import { useCallback, useEffect, useState } from "react";
import { strings } from "../../strings/pt-BR.js";
import { deleteUser, fetchSuperAdminUsers } from "../../services/usersAdminApi.js";
import { Button } from "../atoms/Button.jsx";
import { Text } from "../atoms/Text.jsx";
import { CollapsibleSection } from "../molecules/CollapsibleSection.jsx";
import { SuperAdminUserCreateModal } from "./SuperAdminUserCreateModal.jsx";
import { SuperAdminUserEditModal } from "./SuperAdminUserEditModal.jsx";
import { SuperAdminUsersTable } from "./SuperAdminUsersTable.jsx";

export function SuperAdminUsersSection() {
  const [users, setUsers] = useState(/** @type {object[]} */ ([]));
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [sectionError, setSectionError] = useState(/** @type {string | null} */ (null));

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(/** @type {object | null} */ (null));

  const loadUsers = useCallback(() => {
    setListLoading(true);
    setListError(false);
    fetchSuperAdminUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setListError(true))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete(userId, role) {
    if (role === "super_admin") return;
    if (!window.confirm(strings.usersAdminDeleteConfirm)) return;
    setSectionError(null);
    try {
      await deleteUser(userId);
      if (editUser?.id === userId) setEditUser(null);
      loadUsers();
    } catch {
      setSectionError(strings.usersAdminErrorGeneric);
    }
  }

  return (
    <section className="fm-card fm-users-admin">
      <Text as="h2" className="fm-card__title">
        {strings.usersAdminTitle}
      </Text>
      <p className="fm-muted">{strings.usersAdminIntro}</p>

      {sectionError ? (
        <p className="fm-users-admin__action-error" role="alert">
          {sectionError}
        </p>
      ) : null}

      <div className="fm-users-admin__toolbar">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {strings.usersAdminNewAccessButton}
        </Button>
      </div>

      <CollapsibleSection title={strings.usersAdminListTitle} defaultOpen={false}>
        <SuperAdminUsersTable
          users={users}
          loading={listLoading}
          listError={listError}
          onEdit={setEditUser}
          onDelete={handleDelete}
        />
      </CollapsibleSection>

      <SuperAdminUserCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadUsers}
      />

      <SuperAdminUserEditModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={loadUsers}
      />
    </section>
  );
}
