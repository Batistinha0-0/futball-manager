/**
 * @param {{ header: import("react").ReactNode, children: import("react").ReactNode }} props
 */
export function MainLayout({ header, children }) {
  return (
    <div className="fm-layout">
      {header}
      <main className="fm-layout__main">{children}</main>
    </div>
  );
}
