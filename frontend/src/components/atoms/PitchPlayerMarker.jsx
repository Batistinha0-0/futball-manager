import { strings } from "../../strings/pt-BR.js";
import { initialsFromDisplayName } from "../../utils/playerInitials.js";
import { PitchPlayerFallbackGlyph } from "./PitchPlayerFallbackGlyph.jsx";

/**
 * Marca de jogador no plano do campo: disco (raio em unidades do viewBox 68×105), iniciais ou ícone.
 * Raio generoso para, no futuro, caber foto circular (`clipPath`) sem alterar formações.
 * @param {{
 *   x: number,
 *   y: number,
 *   team: "home" | "visitor",
 *   displayName?: string | null,
 *   r?: number,
 *   selected?: boolean,
 *   onSelect?: () => void,
 * }} props
 */
export function PitchPlayerMarker({
  x,
  y,
  team,
  displayName = null,
  r = 3.95,
  selected = false,
  onSelect,
}) {
  const initials = initialsFromDisplayName(displayName ?? "");
  const showInitials = initials.length > 0;
  const rootClass = [
    "fm-pitch-player",
    team === "home" ? "fm-pitch-player--home" : "fm-pitch-player--visitor",
    selected ? "fm-pitch-player--selected" : "",
    onSelect ? "fm-pitch-player--interactive" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const actionLabel = onSelect
    ? strings.jogoRolandoPlayerSlotActions.replace(
        "{name}",
        String(displayName ?? "").trim() || strings.jogoRolandoUnknownPlayer,
      )
    : undefined;

  return (
    <g
      className={rootClass}
      transform={`translate(${x} ${y})`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={actionLabel}
      onClick={() => {
        if (!onSelect) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <circle className="fm-pitch-player__disk" r={r} cx="0" cy="0" pointerEvents="none" />
      {showInitials ? (
        <text
          className="fm-pitch-player__initials"
          x="0"
          y="0"
          dy="0.1"
          fontSize="3.05"
          textAnchor="middle"
          dominantBaseline="central"
          pointerEvents="none"
        >
          {initials}
        </text>
      ) : (
        <g pointerEvents="none">
          <PitchPlayerFallbackGlyph />
        </g>
      )}
      {onSelect ? (
        <circle className="fm-pitch-player__hit" r={r + 0.9} cx="0" cy="0" aria-hidden="true" />
      ) : null}
    </g>
  );
}
