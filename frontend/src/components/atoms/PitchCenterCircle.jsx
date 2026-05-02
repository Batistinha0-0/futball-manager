/**
 * Círculo central (raio 9,15 m na escala do viewBox).
 * @param {{ strokeWidth?: number }} props
 */
export function PitchCenterCircle({ strokeWidth = 0.28 }) {
  return (
    <circle
      cx="34"
      cy="52.5"
      r="9.15"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}
