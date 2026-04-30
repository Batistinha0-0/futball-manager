import { usePlayers } from "../../hooks/usePlayers.js";
import { strings } from "../../strings/pt-BR.js";
import { SquadPlayerRow } from "../molecules/SquadPlayerRow.jsx";

/**
 * Lista de jogadores ativos a partir da API (credenciais + refresh via `apiClient`).
 */
export function SquadPlayerList() {
  const { players, loading, error } = usePlayers();

  if (loading) {
    return <p className="fm-muted">{strings.apiStatusChecking}</p>;
  }

  if (error) {
    return <p className="fm-muted">{strings.squadListError}</p>;
  }

  if (players.length === 0) {
    return <p className="fm-muted">{strings.playersEmpty}</p>;
  }

  return (
    <ul className="fm-squad-list">
      {players.map((p) => (
        <SquadPlayerRow key={p.id} player={p} />
      ))}
    </ul>
  );
}
