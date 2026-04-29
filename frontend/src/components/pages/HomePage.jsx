import { useApiHealth } from "../../hooks/useApiHealth.js";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

function healthLabel(state) {
  if (state === "loading" || state === "idle") return strings.apiStatusChecking;
  if (state === "ok") return strings.apiStatusOk;
  return strings.apiStatusError;
}

export function HomePage() {
  const health = useApiHealth();
  const { players, loading, error } = usePlayers();

  return (
    <MainLayout
      header={
        <AppHeader title={strings.appTitle} subtitle={strings.appSubtitle} />
      }
    >
      <section className="fm-card">
        <Text as="h2" className="fm-card__title">
          {strings.apiStatusLabel}
        </Text>
        <p
          className={`fm-pill fm-pill--${health === "ok" ? "ok" : health === "error" ? "err" : "pending"}`}
        >
          {healthLabel(health)}
        </p>
      </section>

      <section className="fm-card">
        <Text as="h2" className="fm-card__title">
          {strings.playersOnBase}
        </Text>
        {loading ? (
          <p className="fm-muted">{strings.apiStatusChecking}</p>
        ) : error ? (
          <p className="fm-muted">{strings.apiStatusError}</p>
        ) : players.length === 0 ? (
          <p className="fm-muted">{strings.playersEmpty}</p>
        ) : (
          <ul className="fm-list">
            {players.map((p) => (
              <li key={p.id}>
                {p.display_name} — {p.skill_stars} ★ ({p.profile})
              </li>
            ))}
          </ul>
        )}
      </section>
    </MainLayout>
  );
}
