/**
 * Grande área (16,5 × 40,32 m) junto a um gol.
 * @param {{ end: "north" | "south", strokeWidth?: number }} props
 */
export function PitchPenaltyArea({ end, strokeWidth = 0.28 }) {
  const w = 40.32;
  const h = 16.5;
  const x = (68 - w) / 2;
  const y = end === "north" ? 0 : 105 - h;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}
