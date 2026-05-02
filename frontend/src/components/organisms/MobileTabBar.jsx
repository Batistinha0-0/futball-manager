import { strings } from "../../strings/pt-BR.js";
import { IconNavHome } from "../atoms/IconNavHome.jsx";
import { IconNavMatchBall } from "../atoms/IconNavMatchBall.jsx";
import { IconNavMore } from "../atoms/IconNavMore.jsx";
import { IconNavReports } from "../atoms/IconNavReports.jsx";
import { IconNavSquad } from "../atoms/IconNavSquad.jsx";
import { BottomTabItem } from "../molecules/BottomTabItem.jsx";

/**
 * Barra de navegação inferior (mobile). Em viewports largas fica oculta via CSS.
 */
export function MobileTabBar() {
  return (
    <nav className="fm-tabbar" aria-label={strings.tabbarNavLabel}>
      <div className="fm-tabbar__dock fm-tabbar__dock--equal-tabs">
        <BottomTabItem to="/relatorios" label={strings.navReports} icon={<IconNavReports />} />
        <BottomTabItem
          to="/elenco"
          label={strings.navSquad}
          icon={<IconNavSquad />}
        />
        <BottomTabItem
          to="/"
          end
          label={strings.navHome}
          icon={<IconNavHome />}
          prominence="home"
        />
        <BottomTabItem
          to="/partida"
          end
          label={strings.navMatchLive}
          icon={<IconNavMatchBall />}
        />
        <BottomTabItem to="/mais" label={strings.navMore} icon={<IconNavMore />} />
      </div>
    </nav>
  );
}
