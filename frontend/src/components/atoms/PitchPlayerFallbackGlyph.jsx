/**
 * Ícone genérico de perfil sem foto (cabeça + ombros), estilo apps como Instagram/WhatsApp.
 * Grelha base 24×24; escalada para o disco do campo.
 */
export function PitchPlayerFallbackGlyph() {
  return (
    <g
      className="fm-pitch-player__silhouette"
      transform="translate(0, 0.08) scale(0.265) translate(-12, -12)"
      aria-hidden="true"
    >
      <circle className="fm-pitch-player__silhouette-fill" cx="12" cy="7.35" r="3.55" />
      <ellipse className="fm-pitch-player__silhouette-fill" cx="12" cy="16.55" rx="7.25" ry="5.85" />
    </g>
  );
}
