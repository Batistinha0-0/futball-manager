import { useLayoutEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayers } from "../../hooks/usePlayers.js";
import { useMatchDayReportView } from "../../hooks/useMatchDayReportView.js";
import { matchDayReportsPathForSessionDate } from "../../utils/matchDayReportsRoutes.js";
import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { SelectField } from "../molecules/SelectField.jsx";
import { ReportsEmptyState } from "../molecules/ReportsEmptyState.jsx";
import { ClosedDayFixedGoalkeepers } from "../molecules/ClosedDayFixedGoalkeepers.jsx";
import { MatchDayCloseReportSummary } from "../molecules/MatchDayCloseReportSummary.jsx";
import { PitchLineup } from "./PitchLineup.jsx";
import { LoadingBlock } from "../molecules/LoadingBlock.jsx";

/** @param {Record<string, unknown>} row */
function formatRecentSessionLabel(row) {
  const raw = String(row.session_date ?? "");
  const d = new Date(`${raw}T12:00:00`);
  const datePart = Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  return `${datePart} — ${strings.matchDaySessionPhaseClosed}`;
}

/** @param {string} ymd */
function formatYmdLabel(ymd) {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * @param {{ viewDate: string | null }} props
 * `viewDate` null = rota `/relatorios` (lista vazia ou redirecionamento para o último encerrado).
 */
export function MatchDayReportsCard({ viewDate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const md = useMatchDayReportView(viewDate);
  const { players } = usePlayers({ activeOnly: false });

  const closedSorted = useMemo(() => {
    const rows = [];
    for (const row of md.recentSessions) {
      if (String(row.phase ?? "") !== "closed") continue;
      const sid = String(/** @type {{ session_date?: unknown }} */ (row).session_date ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sid)) continue;
      rows.push(row);
    }
    rows.sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)));
    return rows;
  }, [md.recentSessions]);

  const session = /** @type {Record<string, unknown> | undefined} */ (md.today?.session);
  const teams = /** @type {Array<{ slot: number, player_ids: string[] }>} */ (
    Array.isArray(session?.teams)
      ? session.teams.map((t) => ({
          slot: Number(/** @type {{ slot: unknown }} */ (t).slot),
          player_ids: (/** @type {{ player_ids?: unknown }} */ (t).player_ids ?? []).map(String),
        }))
      : []
  );

  const phase = session ? String(session.phase ?? "") : "";
  const isClosedReport = Boolean(session) && phase === "closed";
  const hasDrawn = teams.some((t) => (t.player_ids ?? []).length > 0);

  const displayNameById = useMemo(() => {
    const map = /** @type {Record<string, string>} */ ({});
    for (const p of players) {
      const rec = /** @type {Record<string, unknown>} */ (p);
      if (rec.id == null || rec.id === "") continue;
      const id = String(rec.id);
      map[id] = String(rec.display_name ?? id);
    }
    return map;
  }, [players]);

  const daySummaryRaw = session && session.day_summary;
  const daySummary =
    daySummaryRaw && typeof daySummaryRaw === "object"
      ? /** @type {Record<string, unknown>} */ (daySummaryRaw)
      : null;

  const pickerOptions = useMemo(() => {
    const opts = closedSorted.map((row) => ({
      value: String(row.session_date).trim(),
      label: formatRecentSessionLabel(row),
    }));
    const vd = viewDate != null && String(viewDate).trim() !== "" ? String(viewDate).trim() : "";
    if (vd && isClosedReport && !opts.some((o) => o.value === vd)) {
      opts.push({
        value: vd,
        label: `${formatYmdLabel(vd)} — ${strings.matchDaySessionPhaseClosed}`,
      });
      opts.sort((a, b) => b.value.localeCompare(a.value));
    }
    return opts;
  }, [closedSorted, viewDate, session]);

  const sessionPickerValue =
    viewDate != null && String(viewDate).trim() !== "" ? String(viewDate).trim() : "";

  useLayoutEffect(() => {
    if (md.loading || md.error) return;
    if (location.pathname !== "/relatorios") return;
    if (closedSorted.length === 0) return;
    navigate(`/relatorios/dia/${String(closedSorted[0].session_date).trim()}`, { replace: true });
  }, [md.loading, md.error, location.pathname, closedSorted, navigate]);

  useLayoutEffect(() => {
    if (md.loading || md.error) return;
    if (viewDate == null) return;
    if (!session) {
      navigate("/relatorios", { replace: true });
      return;
    }
    if (String(session.phase ?? "") !== "closed") {
      navigate("/relatorios", { replace: true });
    }
  }, [viewDate, md.loading, md.error, session, navigate]);

  if (md.loading) {
    return (
      <section className="fm-card fm-matchday-reports-card">
        <LoadingBlock message={strings.matchDayLoading} />
      </section>
    );
  }
  if (md.error) {
    return (
      <section className="fm-card fm-matchday-reports-card">
        <p className="fm-matchday-error">{strings.matchDayLoadError}</p>
      </section>
    );
  }

  if (viewDate == null && closedSorted.length === 0 && location.pathname === "/relatorios") {
    return <ReportsEmptyState />;
  }

  if (viewDate == null && closedSorted.length > 0 && location.pathname === "/relatorios") {
    return null;
  }

  if (viewDate == null) {
    return <ReportsEmptyState />;
  }

  if (!isClosedReport) {
    return null;
  }

  return (
    <section className="fm-card fm-matchday-reports-card">
      <Text as="h2" className="fm-card__title fm-matchday-reports-card__title">
        {strings.reportsPageTitle}
      </Text>
      <p className="fm-muted fm-matchday-reports-card__intro">{strings.reportsPageIntro}</p>

      {pickerOptions.length > 0 ? (
        <div className="fm-sunday-game-card__session-picker">
          <div key={sessionPickerValue} className="fm-sunday-game-card__session-select">
            <SelectField
              id="fm-match-day-reports-session-select"
              label={strings.reportsClosedPickerLabel}
              value={sessionPickerValue}
              options={pickerOptions}
              disabled={md.loading}
              onChange={(v) => {
                const path = matchDayReportsPathForSessionDate(v);
                if (location.pathname !== path) {
                  navigate(path);
                } else {
                  void md.refetch();
                }
              }}
            />
          </div>
          <p className="fm-muted fm-sunday-game-card__session-picker-note">{strings.reportsSessionPickerHint}</p>
        </div>
      ) : null}

      <div className="fm-matchday-reports-card__body">
        <ClosedDayFixedGoalkeepers
          session={/** @type {Record<string, unknown>} */ (session ?? {})}
          displayNameById={displayNameById}
        />
        {hasDrawn ? (
          <>
            <Text as="h3" className="fm-matchday-subtitle">
              {strings.matchDayPitchTitle}
            </Text>
            <PitchLineup teams={teams} players={players} />
          </>
        ) : (
          <p className="fm-muted fm-sunday-game-card__archive-no-lineup">{strings.matchDayArchiveNoLineup}</p>
        )}
        {daySummary ? (
          <MatchDayCloseReportSummary daySummary={daySummary} displayNameById={displayNameById} />
        ) : null}
      </div>
    </section>
  );
}
