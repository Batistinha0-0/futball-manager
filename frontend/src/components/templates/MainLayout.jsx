/**
 * @param {{
 *   header: import("react").ReactNode,
 *   children: import("react").ReactNode,
 *   variant?: "default" | "auth",
 * }} props
 */
export function MainLayout({ header, children, variant = "default" }) {
  const rootClass = [
    "fm-layout",
    variant === "auth" ? "fm-layout--auth" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {header}
      <main className="fm-layout__main">{children}</main>
    </div>
  );
}
