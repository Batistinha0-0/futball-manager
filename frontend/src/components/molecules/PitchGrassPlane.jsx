/**
 * Camada de relva (gradiente) no sistema de coordenadas do campo.
 * @param {{ gradientId: string }} props
 */
export function PitchGrassPlane({ gradientId }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e4d38" />
          <stop offset="45%" stopColor="#256b45" />
          <stop offset="100%" stopColor="#1a3d30" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="68" height="105" fill={`url(#${gradientId})`} />
    </>
  );
}
