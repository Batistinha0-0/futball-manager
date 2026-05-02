import { strings } from "../../strings/pt-BR.js";
import { PitchPlayerMarker } from "../atoms/PitchPlayerMarker.jsx";

/**
 * @typedef {{ team: "home" | "visitor", index: number, playerId?: string | null }} PitchPlayerSelection
 */

/**
 * Camada de jogadores sobre o gramado (dois times).
 * @param {{
 *   home: Array<{ x: number, y: number }>,
 *   visitor: Array<{ x: number, y: number }>,
 *   homeLineup?: (string | null | undefined)[],
 *   visitorLineup?: (string | null | undefined)[],
 *   homeLineupPlayerIds?: (string | null | undefined)[],
 *   visitorLineupPlayerIds?: (string | null | undefined)[],
 *   selected?: PitchPlayerSelection | null,
 *   onSelectPlayer?: (detail: { team: "home" | "visitor", index: number, displayName: string, playerId?: string | null }) => void,
 * }} props
 */
export function PitchPlayerLayer({
  home,
  visitor,
  homeLineup,
  visitorLineup,
  homeLineupPlayerIds,
  visitorLineupPlayerIds,
  selected,
  onSelectPlayer,
}) {
  return (
    <g className="fm-pitch-top__players">
      {home.map((p, i) => (
        <PitchPlayerMarker
          key={`home-${i}`}
          x={p.x}
          y={p.y}
          team="home"
          displayName={homeLineup?.[i]}
          selected={selected?.team === "home" && selected.index === i}
          onSelect={
            onSelectPlayer
              ? () =>
                  onSelectPlayer({
                    team: "home",
                    index: i,
                    displayName:
                      String(homeLineup?.[i] ?? "").trim() || strings.jogoRolandoUnknownPlayer,
                    playerId: homeLineupPlayerIds?.[i] != null && String(homeLineupPlayerIds[i]).trim()
                      ? String(homeLineupPlayerIds[i]).trim()
                      : null,
                  })
              : undefined
          }
        />
      ))}
      {visitor.map((p, i) => (
        <PitchPlayerMarker
          key={`visitor-${i}`}
          x={p.x}
          y={p.y}
          team="visitor"
          displayName={visitorLineup?.[i]}
          selected={selected?.team === "visitor" && selected.index === i}
          onSelect={
            onSelectPlayer
              ? () =>
                  onSelectPlayer({
                    team: "visitor",
                    index: i,
                    displayName:
                      String(visitorLineup?.[i] ?? "").trim() || strings.jogoRolandoUnknownPlayer,
                    playerId: visitorLineupPlayerIds?.[i] != null && String(visitorLineupPlayerIds[i]).trim()
                      ? String(visitorLineupPlayerIds[i]).trim()
                      : null,
                  })
              : undefined
          }
        />
      ))}
    </g>
  );
}
