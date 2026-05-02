/**
 * Marca de pênalti (11 m da linha do gol, eixo central).
 * @param {{ end: "north" | "south", r?: number }} props
 */
export function PitchPenaltyMark({ end, r = 0.32 }) {
  const cy = end === "north" ? 11 : 94;
  return <circle cx="34" cy={cy} r={r} fill="currentColor" />;
}
