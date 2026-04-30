import { NavLink } from "react-router-dom";

/**
 * Item da sidebar (desktop). Mesma API que BottomTabItem; estilos em `.fm-sidenav__link` no `index.css`.
 *
 * @param {{
 *   to: string,
 *   label: string,
 *   icon: import("react").ReactNode,
 *   end?: boolean,
 *   prominence?: "default" | "home",
 * }} props
 */
export function SideNavItem({
  to,
  label,
  icon,
  end = false,
  prominence = "default",
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "fm-sidenav__link",
          prominence === "home" ? "fm-sidenav__link--home" : "",
          isActive ? "fm-sidenav__link--active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span className="fm-sidenav__icon">{icon}</span>
      <span className="fm-sidenav__label">{label}</span>
    </NavLink>
  );
}
