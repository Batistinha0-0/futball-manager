import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../context/ToastContext.jsx";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { updatePlayer } from "../../services/playersApi.js";
import { Input } from "../atoms/Input.jsx";
import { SquadPlayersEmptyState } from "../molecules/SquadPlayersEmptyState.jsx";
import { SquadToolbar } from "../molecules/SquadToolbar.jsx";
import { SquadPlayerRow } from "../molecules/SquadPlayerRow.jsx";
import { SquadPlayerFormModal } from "./SquadPlayerFormModal.jsx";
import { SquadPlayerSheetModal } from "./SquadPlayerSheetModal.jsx";

function playersSignature(players) {
  return players
    .map((p) => /** @type {{ id: string }} */ (p).id)
    .sort()
    .join("\u0000");
}

/** @param {Record<string, unknown>} row */
function clonePlayerRow(row) {
  return { ...row };
}

/** @param {string} s */
function foldForSearch(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function SquadPlayerList() {
  const { showToast } = useToast();
  const { players, loading, error, refetch, upsertPlayer } = usePlayers({ activeOnly: false });

  const [formOpen, setFormOpen] = useState(false);
  const [sheetPlayer, setSheetPlayer] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const sheetPlayerRef = useRef(/** @type {Record<string, unknown> | null} */ (null));
  sheetPlayerRef.current = sheetPlayer;

  const [nameQuery, setNameQuery] = useState("");
  const [activeErrorId, setActiveErrorId] = useState(/** @type {string | null} */ (null));
  /** Por jogador: incrementa a cada toggle; respostas antigas do servidor são ignoradas. */
  const activeToggleSeqRef = useRef(/** @type {Record<string, number>} */ ({}));

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
    setFormOpen(true);
  }

  /** @param {Record<string, unknown>} record */
  function handleSheetUpdated(record) {
    if (record && typeof record === "object" && record.id != null) {
      const rid = String(record.id);
      setActiveErrorId((prev) => (prev === rid ? null : prev));
    }
    upsertPlayer(record);
    setSheetPlayer(record);
  }

  /** @param {Record<string, unknown>} p */
  function patchPlayerActive(p, nextActive) {
    const id = String(/** @type {{ id: unknown }} */ (p).id);
    const previous = clonePlayerRow(p);
    const optimistic = { ...p, active: nextActive };

    const nextSeq = (activeToggleSeqRef.current[id] ?? 0) + 1;
    activeToggleSeqRef.current[id] = nextSeq;

    setActiveErrorId((prev) => (prev === id ? null : prev));

    upsertPlayer(optimistic);
    const open = sheetPlayerRef.current;
    if (open && String(/** @type {{ id: unknown }} */ (open).id) === id) {
      setSheetPlayer(optimistic);
    }

    void (async () => {
      try {
        const updated = await updatePlayer(id, { active: nextActive });
        if (activeToggleSeqRef.current[id] !== nextSeq) {
          return;
        }
        upsertPlayer(updated);
        const sp = sheetPlayerRef.current;
        if (sp && String(/** @type {{ id: unknown }} */ (sp).id) === id) {
          setSheetPlayer(updated);
        }
        showToast({
          message: nextActive ? strings.toastPlayerActivated : strings.toastPlayerDeactivated,
          variant: "success",
        });
      } catch {
        if (activeToggleSeqRef.current[id] !== nextSeq) {
          return;
        }
        setActiveErrorId(id);
        upsertPlayer(previous);
        const sp = sheetPlayerRef.current;
        if (sp && String(/** @type {{ id: unknown }} */ (sp).id) === id) {
          setSheetPlayer(previous);
        }
        showToast({ message: strings.toastPlayerActiveFail, variant: "error" });
      }
    })();
  }

  const bootstrapping = loading;

  const queryFold = useMemo(() => foldForSearch(nameQuery.trim()), [nameQuery]);

  const filteredPlayers = useMemo(() => {
    if (!queryFold) return players;
    return players.filter((p) => {
      const name = foldForSearch(/** @type {{ display_name?: string }} */ (p).display_name ?? "");
      return name.includes(queryFold);
    });
  }, [players, queryFold]);

  return (
    <>
      <SquadToolbar onAddPlayer={openCreate} disabled={bootstrapping} />

      {bootstrapping ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.apiStatusChecking}</p>
      ) : error ? (
        <p className="fm-muted fm-squad-list-placeholder">{strings.squadListError}</p>
      ) : (
        <>
          {players.length > 0 ? (
            <div className="fm-field fm-squad-search">
              <label className="fm-field__label" htmlFor="squad-player-search">
                {strings.squadSearchLabel}
              </label>
              <Input
                id="squad-player-search"
                name="squad-player-search"
                type="search"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder={strings.squadSearchPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
                autoCapitalize="words"
                spellCheck={true}
                inputMode="search"
              />
            </div>
          ) : null}

          <div className="fm-squad-list-stage" ref={listStageRef}>
            {players.length === 0 ? (
              <SquadPlayersEmptyState />
            ) : filteredPlayers.length === 0 ? (
              <p className="fm-muted fm-squad-list-placeholder" role="status">
                {strings.squadSearchNoResults}
              </p>
            ) : (
              <ul className="fm-squad-list">
                {filteredPlayers.map((p) => {
                  const row = /** @type {{ id: string }} */ (p);
                  return (
                    <SquadPlayerRow
                      key={row.id}
                      player={p}
                      onOpen={() => setSheetPlayer(/** @type {Record<string, unknown>} */ (p))}
                      onActiveChange={(next) => patchPlayerActive(/** @type {Record<string, unknown>} */ (p), next)}
                      activeToggleError={activeErrorId === row.id}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </>
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
      />

      <SquadPlayerSheetModal
        open={sheetPlayer !== null}
        player={sheetPlayer}
        onClose={() => setSheetPlayer(null)}
        onUpdated={handleSheetUpdated}
      />
    </>
  );
}
