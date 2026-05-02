/**
 * Contorno do campo (vista de cima, unidades ≈ metros; grelha 68×105).
 * @param {{ strokeWidth?: number }} props
 */
export function PitchBorderRect({ strokeWidth = 0.28 }) {
  return (
    <rect
      x="0"
      y="0"
      width="68"
      height="105"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}
