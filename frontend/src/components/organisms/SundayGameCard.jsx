import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthMe } from "../../hooks/useAuthMe.js";
import { useMatchDayToday } from "../../hooks/useMatchDayToday.js";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { PressHoldButton } from "../atoms/PressHoldButton.jsx";
import { SundayGameSettingsForm } from "../molecules/SundayGameSettingsForm.jsx";
import { SundayTeamsSection } from "../molecules/SundayTeamsSection.jsx";
import { PitchLineup } from "./PitchLineup.jsx";
import { LoadingBlock } from "../molecules/LoadingBlock.jsx";

/** @param {{ permissions?: string[] }} user */
function userCanWritePlayers(user) {
  return Boolean(user?.permissions?.includes("players:write"));
}

export function SundayGameCard() {
  const navigate = useNavigate();
  const md = useMatchDayToday();
  const { user } = useAuthMe();
  const canWrite = userCanWritePlayers(/** @type {{ permissions?: string[] }} */ (user ?? {}));
  const { players } = usePlayers({ activeOnly: false });
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
  const hasFinishedFixture = Boolean(fixtures.some((f) => f.status === "finished"));
  const hasDrawn = teams.some((t) => (t.player_ids ?? []).length > 0);
  const hasSession = Boolean(session);
  const phase = session ? String(session.phase ?? "") : "";

  const isClosedDay = hasSession && phase === "closed";
  /** Pelo menos uma partida já foi concluída hoje (ainda pode haver jogos ou encerramento do dia). */
  const showMidDayAlreadyPlayedNotice = hasSession && !isClosedDay && hasFinishedFixture;

  const liveFx = useMemo(() => fixtures.find((f) => f.status === "live") ?? null, [fixtures]);

  const firstPending = useMemo(() => {
    const pend = fixtures.filter((f) => f.status === "pending");
    pend.sort((a, b) => Number(a.order_index) - Number(b.order_index));
    return pend[0] ?? null;
  }, [fixtures]);

  /** Só após a partida estar ao vivo: antes disso o início é só com “Segure…” na carta (não esconder o sorteio/campo). */
  const showPartidaCta = Boolean(hasLive && liveFx);

  /** Data do servidor: o sorteio está disponível em qualquer dia da semana. */
  const sorteioCardTitle = useMemo(() => {
    const raw = md.today?.server_now ? String(md.today.server_now) : "";
    const ref = raw ? new Date(raw) : new Date();
    const instant = !Number.isNaN(ref.getTime()) ? ref : new Date();
    const dateStr = instant.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return strings.homeSorteioCardTitleWithDate.replace("{date}", dateStr);
  }, [md.today?.server_now]);

  if (md.loading) {
    return (
      <section className="fm-card fm-sunday-game-card">
        <LoadingBlock message={strings.matchDayLoading} />
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
        {sorteioCardTitle}
      </Text>

      {showPartidaCta ? (
        <div className="fm-sunday-game-card__live">
          <p className="fm-muted fm-sunday-game-card__live-hint" role="status">
            {strings.sundayGameLiveCtaHint}
          </p>
          <Link className="fm-btn fm-btn--primary" to="/partida">
            {strings.sundayGameLiveCta}
          </Link>
        </div>
      ) : null}

      {isClosedDay ? (
        <div className="fm-sunday-game-card__closed-home" role="status">
          <p className="fm-sunday-game-card__play-over-title">{strings.homeAlreadyPlayedTodayTitle}</p>
          <p className="fm-muted fm-sunday-game-card__play-over-detail">{strings.homeAlreadyPlayedTodayClosedDetail}</p>
        </div>
      ) : (
        <div className="fm-sunday-game-card__pane fm-sunday-game-card__pane--manage fm-sunday-game-card__pane--in">
          {showMidDayAlreadyPlayedNotice ? (
            <div className="fm-sunday-game-card__play-over-banner" role="status">
              <p className="fm-sunday-game-card__play-over-title">{strings.homeAlreadyPlayedTodayTitle}</p>
              <p className="fm-muted fm-sunday-game-card__play-over-detail">{strings.homeAlreadyPlayedTodayMidDayHint}</p>
            </div>
          ) : null}
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
            onDraw={() => {
              void md.draw().catch(() => {});
            }}
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
                    onComplete={async () => {
                      try {
                        await md.startFixture(String(firstPending.id));
                        navigate("/partida");
                      } catch {
                        /* toast no hook */
                      }
                    }}
                    disabled={md.busy}
                    variant="primary"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
