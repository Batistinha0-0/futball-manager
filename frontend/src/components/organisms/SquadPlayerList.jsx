import { useEffect, useRef, useState } from "react";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { deletePlayer } from "../../services/playersApi.js";
import { Button } from "../atoms/Button.jsx";
import { ModalDialog } from "../molecules/ModalDialog.jsx";
import { SquadPlayersEmptyState } from "../molecules/SquadPlayersEmptyState.jsx";
import { SquadToolbar } from "../molecules/SquadToolbar.jsx";
import { SquadPlayerRow } from "../molecules/SquadPlayerRow.jsx";
import { SquadPlayerFormModal } from "./SquadPlayerFormModal.jsx";

const DELETE_TITLE_ID = "squad-delete-player-title";

function playersSignature(players) {
  return players
    .map((p) => /** @type {{ id: string }} */ (p).id)
    .sort()
    .join("\u0000");
}

export function SquadPlayerList() {
  const [showInactive, setShowInactive] = useState(false);
  const { players, loading, error, refetch, upsertPlayer } = usePlayers({ activeOnly: !showInactive });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState(/** @type {"create" | "edit"} */ ("create"));
  const [editPlayer, setEditPlayer] = useState(/** @type {null | Record<string, unknown>} */ (null));

  const [deleteTarget, setDeleteTarget] = useState(/** @type {null | { id: string, display_name: string }} */ (null));
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(/** @type {string | null} */ (null));

  const listStageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const prevSigRef = useRef(/** @type {string | null} */ (null));
  /** Evita o “flash” da lista ao só trocar o filtro de inativos (assinatura muda, mas não é edição da base). */
  const skipListPulseOnceRef = useRef(false);

  useEffect(() => {
    skipListPulseOnceRef.current = true;
  }, [showInactive]);

  useEffect(() => {
    if (loading) return;
    const sig = playersSignature(players);
    const el = listStageRef.current;
    if (!el) {
      prevSigRef.current = sig;
      return;
    }
    if (skipListPulseOnceRef.current) {
      skipListPulseOnceRef.current = false;
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
      if (editPlayer && String(/** @type {{ id: string }} */ (editPlayer).id) === deleteTarget.id) {
        setFormOpen(false);
        setEditPlayer(null);
      }
      setDeleteTarget(null);
      refetch();
    } catch {
      setDeleteError(strings.squadDeleteError);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const bootstrapping = loading;

  return (
    <>
      <SquadToolbar
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        onAddPlayer={openCreate}
        disabled={bootstrapping}
      />

      {bootstrapping ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.apiStatusChecking}</p>
      ) : error ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.squadListError}</p>
      ) : (
        <div className="fm-squad-list-stage" ref={listStageRef}>
          {players.length === 0 ? (
            <SquadPlayersEmptyState />
          ) : (
            <ul className="fm-squad-list">
              {players.map((p) => {
                const row = /** @type {{ id: string, display_name: string }} */ (p);
                return (
                  <SquadPlayerRow
                    key={row.id}
                    player={p}
                    onEdit={() => openEdit(/** @type {Record<string, unknown>} */ (p))}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeleteTarget({
                        id: row.id,
                        display_name: row.display_name,
                      });
                    }}
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
        onSaved={(record) => {
          if (record && typeof record === "object" && record.id != null) {
            upsertPlayer(record);
          } else {
            refetch();
          }
        }}
        mode={formMode}
        player={editPlayer}
      />

      <ModalDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteSubmitting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        titleId={DELETE_TITLE_ID}
        title={strings.squadDeleteTitle}
        footer={
          <div className="fm-modal-dialog__actions">
            <Button
              type="button"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={deleteSubmitting}
            >
              {strings.usersAdminCancel}
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? strings.squadDeleteSubmitting : strings.squadDeleteConfirm}
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
