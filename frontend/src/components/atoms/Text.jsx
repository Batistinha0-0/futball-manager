/**
 * @param {{ as?: keyof JSX.IntrinsicElements, children: import("react").ReactNode, className?: string } & Record<string, unknown>} props
 */
export function Text({ as: Component = "span", children, className = "", ...rest }) {
  return (
    <Component className={className} {...rest}>
      {children}
    </Component>
  );
}
