import { strings } from "../../strings/pt-BR.js";
import { IconNavHome } from "../atoms/IconNavHome.jsx";
import { IconNavMatchBall } from "../atoms/IconNavMatchBall.jsx";
import { IconNavMore } from "../atoms/IconNavMore.jsx";
import { IconNavReports } from "../atoms/IconNavReports.jsx";
import { IconNavSquad } from "../atoms/IconNavSquad.jsx";
import { SideNavItem } from "../molecules/SideNavItem.jsx";

/**
 * Navegação lateral (viewports ≥ 48rem). Mesmas rotas que a tab bar; oculta em mobile via CSS.
 */
export function DesktopSidebar() {
  return (
    <aside className="fm-app__sidebar">
      <nav className="fm-sidenav" aria-label={strings.sidebarNavLabel}>
        <div className="fm-sidenav__rail">
          <SideNavItem to="/relatorios" label={strings.navReports} icon={<IconNavReports />} />
          <SideNavItem
            to="/elenco"
            label={strings.navSquad}
            icon={<IconNavSquad />}
          />
          <SideNavItem
            to="/"
            end
            label={strings.navHome}
            icon={<IconNavHome />}
            prominence="home"
          />
          <SideNavItem to="/partida" label={strings.navMatchLive} icon={<IconNavMatchBall />} />
          <SideNavItem
            to="/mais"
            label={strings.navMore}
            icon={<IconNavMore />}
          />
        </div>
      </nav>
    </aside>
  );
}
