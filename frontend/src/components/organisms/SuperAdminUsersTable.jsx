import { strings } from "../../strings/pt-BR.js";
import { Button } from "../atoms/Button.jsx";
import { LoadingBlock } from "../molecules/LoadingBlock.jsx";

function roleLabel(role) {
  if (role === "super_admin") return strings.usersAdminRoleSuperAdmin;
  if (role === "admin") return strings.usersAdminRoleAdmin;
  return strings.usersAdminRoleOrganizer;
}

/**
 * Tabela compacta: nome, função, ações (mobile-first).
 * @param {{
 *   users: object[],
 *   loading: boolean,
 *   listError: boolean,
 *   onEdit: (u: object) => void,
 *   onDelete: (userId: string, role: string) => void,
 * }} props
 */
export function SuperAdminUsersTable({ users, loading, listError, onEdit, onDelete }) {
  return (
    <div className="fm-users-admin-table">
      {loading ? (
        <LoadingBlock message={strings.apiStatusChecking} centered={false} />
      ) : listError ? (
        <p className="fm-muted">{strings.usersAdminListError}</p>
      ) : users.length === 0 ? (
        <p className="fm-muted">{strings.usersAdminListEmpty}</p>
      ) : (
        <div className="fm-users-admin__table-wrap">
          <table className="fm-users-admin__table fm-users-admin__table--compact">
            <thead>
              <tr>
                <th>{strings.usersAdminColUser}</th>
                <th>{strings.usersAdminColRole}</th>
                <th>{strings.usersAdminColActions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.user_name}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td className="fm-users-admin__actions">
                    <Button type="button" onClick={() => onEdit(u)}>
                      {strings.usersAdminEdit}
                    </Button>
                    {u.role !== "super_admin" ? (
                      <Button type="button" onClick={() => onDelete(u.id, u.role)}>
                        {strings.usersAdminDelete}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
