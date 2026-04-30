import { NavLink } from "react-router-dom";

/**
 * Item da tab bar inferior. Estilo da aba selecionada e foco vêm de `.fm-tabbar__link` / `--active`
 * em `index.css` (novas abas ficam iguais sem código extra).
 *
 * @param {{
 *   to: string,
 *   label: string,
 *   icon: import("react").ReactNode,
 *   end?: boolean,
 *   prominence?: "default" | "home",
 * }} props
 */
export function BottomTabItem({
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
          "fm-tabbar__link",
          prominence === "home" ? "fm-tabbar__link--home" : "",
          isActive ? "fm-tabbar__link--active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span className="fm-tabbar__icon">{icon}</span>
      <span className="fm-tabbar__label">{label}</span>
    </NavLink>
  );
}
