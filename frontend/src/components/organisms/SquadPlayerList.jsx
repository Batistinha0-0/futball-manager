import { useEffect, useRef, useState } from "react";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { deletePlayer } from "../../services/playersApi.js";
import { Button } from "../atoms/Button.jsx";
import { SquadPlayerFormModal } from "./SquadPlayerFormModal.jsx";
import { SquadPlayerRow } from "../molecules/SquadPlayerRow.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";

const DELETE_TITLE_ID = "squad-delete-player-title";

function playersSignature(players) {
  return players
    .map((p) => /** @type {{ id: string }} */ (p).id)
    .sort()
    .join("\u0000");
}

export function SquadPlayerList() {
  const [showInactive, setShowInactive] = useState(false);
  const { players, loading, error, refetch } = usePlayers({ activeOnly: !showInactive });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState(/** @type {"create" | "edit"} */ ("create"));
  const [editPlayer, setEditPlayer] = useState(/** @type {null | Record<string, unknown>} */ (null));

  const [deleteTarget, setDeleteTarget] = useState(/** @type {null | { id: string, display_name: string }} */ (null));
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(/** @type {string | null} */ (null));

  const listStageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const prevSigRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (loading) return;
    const sig = playersSignature(players);
    const el = listStageRef.current;
    if (!el) {
      prevSigRef.current = sig;
      return;
    }
    if (prevSigRef.current !== null && prevSigRef.current !== sig) {
      el.classList.remove("fm-squad-list-stage--pulse");
      void el.offsetWidth;
      el.classList.add("fm-squad-list-stage--pulse");
    }
    prevSigRef.current = sig;
  }, [players, loading]);

  function openCreate() {
    setFormMode("create");
    setEditPlayer(null);
    setFormOpen(true);
  }

  /** @param {Record<string, unknown>} p */
  function openEdit(p) {
    setFormMode("edit");
    setEditPlayer(p);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await deletePlayer(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch {
      setDeleteError(strings.squadFormErrorGeneric);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const bootstrapping = loading;

  return (
    <>
      <div className="fm-squad-toolbar" aria-label={strings.squadToolbarLabel}>
        <label className="fm-squad-inactive-toggle">
          <input
            type="checkbox"
            className="fm-squad-inactive-toggle__input"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            disabled={bootstrapping}
          />
          <span className="fm-squad-inactive-toggle__track" aria-hidden="true">
            <span className="fm-squad-inactive-toggle__thumb" />
          </span>
          <span className="fm-squad-inactive-toggle__label">{strings.squadShowInactive}</span>
        </label>
        <Button type="button" onClick={openCreate} disabled={bootstrapping}>
          {strings.squadAddPlayer}
        </Button>
      </div>

      {bootstrapping ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.apiStatusChecking}</p>
      ) : error ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.squadListError}</p>
      ) : (
        <div className="fm-squad-list-stage" ref={listStageRef}>
          {players.length === 0 ? (
            <p className="fm-muted fm-squad-list-placeholder fm-squad-list-placeholder--empty">
              {strings.playersEmpty}
            </p>
          ) : (
            <ul className="fm-squad-list">
              {players.map((p) => {
                const row = /** @type {{ id: string, display_name: string }} */ (p);
                return (
                  <SquadPlayerRow
                    key={row.id}
                    player={p}
                    onEdit={() => openEdit(/** @type {Record<string, unknown>} */ (p))}
                    onDelete={() =>
                      setDeleteTarget({
                        id: row.id,
                        display_name: row.display_name,
                      })
                    }
                  />
                );
              })}
            </ul>
          )}
        </div>
      )}

      <SquadPlayerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
        mode={formMode}
        player={editPlayer}
      />

      <ModalDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteSubmitting) setDeleteTarget(null);
        }}
        titleId={DELETE_TITLE_ID}
        title={strings.squadDeleteTitle}
        footer={
          <div className="fm-modal-dialog__actions">
            <Button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>
              {strings.usersAdminCancel}
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? strings.usersAdminSaving : strings.squadDeleteConfirm}
            </Button>
          </div>
        }
      >
        {deleteError ? (
          <p className="fm-users-admin__action-error fm-users-admin__action-error--compact" role="alert">
            {deleteError}
          </p>
        ) : null}
        <p className="fm-muted">
          {deleteTarget
            ? strings.squadDeleteMessage.replace("{name}", deleteTarget.display_name)
            : ""}
        </p>
      </ModalDialog>
    </>
  );
}
