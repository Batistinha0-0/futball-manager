import { NavLink } from "react-router-dom";
import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { CircleSpinner } from "../atoms/CircleSpinner.jsx";

export function HomeSquadTeaser() {
  const { players, loading, error } = usePlayers({ activeOnly: true });
  const n = players.length;

  if (loading) {
    return (
      <p className="fm-muted fm-home-squad-teaser fm-home-squad-teaser--loading">
        <CircleSpinner size="sm" decorative />
        {strings.homeSquadTeaserLoading}
      </p>
    );
  }
  if (error) {
    return <p className="fm-muted fm-home-squad-teaser">{strings.homeSquadTeaserError}</p>;
  }

  return (
    <div className="fm-home-squad-teaser">
      <p className="fm-home-squad-teaser__count">
        {strings.homeSquadActiveCount.replace("{n}", String(n))}
      </p>
      <NavLink className="fm-inline-cta" to="/elenco">
        {strings.homeSquadOpenRoster}
      </NavLink>
    </div>
  );
}
