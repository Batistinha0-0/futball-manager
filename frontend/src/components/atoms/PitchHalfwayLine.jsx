/**
 * Linha de meio-campo (eixo maior do rectângulo 68×105).
 * @param {{ strokeWidth?: number }} props
 */
export function PitchHalfwayLine({ strokeWidth = 0.28 }) {
  return (
    <line
      x1="0"
      y1="52.5"
      x2="68"
      y2="52.5"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      vectorEffect="non-scaling-stroke"
    />
  );
}
