import ballUrl from "../../assets/icons/ball.png";

/**
 * Bola para a aba Partida: PNG escuro vira silhueta na cor do texto (`currentColor`) via mask-image.
 */
export function IconNavMatchBall({ className = "" }) {
  return (
    <span
      className={`fm-nav-icon fm-nav-icon--mask-image ${className}`.trim()}
      style={{
        WebkitMaskImage: `url(${ballUrl})`,
        maskImage: `url(${ballUrl})`,
      }}
      aria-hidden
    />
  );
}
