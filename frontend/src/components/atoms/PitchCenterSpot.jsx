/**
 * Marca do pontapé de saída ao centro.
 * @param {{ r?: number }} props
 */
export function PitchCenterSpot({ r = 0.35 }) {
  return <circle cx="34" cy="52.5" r={r} fill="currentColor" />;
}
