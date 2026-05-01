import { useCallback, useMemo, useState } from "react";
import { useAuthMe } from "../../hooks/useAuthMe.js";
import { useMatchDayToday } from "../../hooks/useMatchDayToday.js";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { PressHoldButton } from "../atoms/PressHoldButton.jsx";
import { SundayGameSettingsForm } from "../molecules/SundayGameSettingsForm.jsx";
import { SundayTeamsSection } from "../molecules/SundayTeamsSection.jsx";
import { LiveFixturePanel } from "./LiveFixturePanel.jsx";
import { PitchLineup } from "./PitchLineup.jsx";

/** @param {{ permissions?: string[] }} user */
function userCanWritePlayers(user) {
  return Boolean(user?.permissions?.includes("players:write"));
}

function formatGameDate(isoDate, serverNowIso) {
  const raw = isoDate || (serverNowIso ? String(serverNowIso).slice(0, 10) : null);
  if (!raw) return "";
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function SundayGameCard() {
  const md = useMatchDayToday();
  const { user } = useAuthMe();
  const canWrite = userCanWritePlayers(/** @type {{ permissions?: string[] }} */ (user ?? {}));
  const { players } = usePlayers({ activeOnly: true });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const onSettingsDirtyChange = useCallback((dirty) => {
    setSettingsDirty(Boolean(dirty));
  }, []);

  const session = /** @type {Record<string, unknown> | undefined} */ (md.today?.session);
  const fixtures = /** @type {Record<string, unknown>[] } */ (session?.fixtures ?? []);
  const teams = /** @type {Array<{ slot: number, player_ids: string[] }>} */ (
    Array.isArray(session?.teams)
      ? session.teams.map((t) => ({
          slot: Number(/** @type {{ slot: unknown }} */ (t).slot),
          player_ids: (/** @type {{ player_ids?: unknown }} */ (t).player_ids ?? []).map(String),
        }))
      : []
  );

  const hasLive = Boolean(fixtures.some((f) => f.status === "live"));
  const hasDrawn = teams.some((t) => (t.player_ids ?? []).length > 0);
  const hasSession = Boolean(session);

  const liveFx = useMemo(() => fixtures.find((f) => f.status === "live") ?? null, [fixtures]);

  const firstPending = useMemo(() => {
    const pend = fixtures.filter((f) => f.status === "pending");
    pend.sort((a, b) => Number(a.order_index) - Number(b.order_index));
    return pend[0] ?? null;
  }, [fixtures]);

  const serverSkewMs = useMemo(() => {
    if (!md.today?.server_now) return 0;
    return new Date(String(md.today.server_now)).getTime() - Date.now();
  }, [md.today?.server_now]);

  const dateLabel = formatGameDate(
    session ? String(session.session_date ?? "") : "",
    md.today?.server_now ? String(md.today.server_now) : "",
  );

  if (md.loading) {
    return (
      <section className="fm-card fm-sunday-game-card">
        <p className="fm-muted">{strings.matchDayLoading}</p>
      </section>
    );
  }
  if (md.error) {
    return (
      <section className="fm-card fm-sunday-game-card">
        <p className="fm-matchday-error">{strings.matchDayLoadError}</p>
      </section>
    );
  }

  return (
    <section className="fm-card fm-sunday-game-card">
      {Boolean(md.today?.sunday_match_layout) ? (
        <p className="fm-sunday-game-card__ribbon" role="status">
          {strings.matchDayBannerTitle}
        </p>
      ) : null}

      <Text as="h2" className="fm-card__title fm-sunday-game-card__title">
        {strings.sundayGameTitle} — {dateLabel || "—"}
      </Text>

      {md.actionError ? (
        <div className="fm-matchday-action-error" role="alert">
          <span>{strings.matchDayActionError}</span>
          <button type="button" className="fm-btn fm-btn--ghost" onClick={md.clearActionError}>
            {strings.matchDayDismiss}
          </button>
        </div>
      ) : null}

      {hasLive && liveFx ? (
        <div className="fm-sunday-game-card__live">
          <LiveFixturePanel
            fixture={liveFx}
            canWrite={canWrite}
            busy={md.busy}
            serverSkewMs={serverSkewMs}
            onStart={() => Promise.resolve()}
            onFinish={() => {
              const id = liveFx?.id;
              return id ? md.finishFixture(String(id)) : Promise.resolve();
            }}
            onGoal={(teamSlot) => {
              const id = liveFx?.id;
              return id ? md.recordEvent(String(id), { type: "goal", team_slot: teamSlot }) : Promise.resolve();
            }}
            onGkSave={(teamSlot) => {
              const id = liveFx?.id;
              return id
                ? md.recordEvent(String(id), { type: "goalkeeper_save", team_slot: teamSlot })
                : Promise.resolve();
            }}
          />
        </div>
      ) : (
        <>
          <SundayGameSettingsForm
            session={session}
            canWrite={canWrite}
            settingsSaving={md.settingsSaving}
            players={players}
            onSave={md.patchSettings}
            onDirtyChange={onSettingsDirtyChange}
          />
          <SundayTeamsSection
            canWrite={canWrite}
            busy={md.busy}
            hasSession={hasSession}
            unsavedSettings={settingsDirty}
            drawButtonLabel={hasDrawn ? strings.matchDayRedraw : strings.matchDayDraw}
            onDraw={md.draw}
          />
          {hasDrawn ? (
            <>
              <Text as="h3" className="fm-matchday-subtitle">
                {strings.matchDayPitchTitle}
              </Text>
              {session && session.lineup_official === false ? (
                <p className="fm-muted fm-sunday-game-card__lineup-hint" role="status">
                  {strings.sundayGameLineupProvisional}
                </p>
              ) : null}
              <PitchLineup teams={teams} players={players} />
              {canWrite && firstPending ? (
                <div className="fm-sunday-game-card__start-hold">
                  <p className="fm-muted fm-sunday-game-card__start-hint">{strings.sundayGameStartHoldHint}</p>
                  <PressHoldButton
                    label={strings.sundayGameStartHold}
                    onComplete={() => {
                      void md.startFixture(String(firstPending.id));
                    }}
                    disabled={md.busy}
                    variant="primary"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
