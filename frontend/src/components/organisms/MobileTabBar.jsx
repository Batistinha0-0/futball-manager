import { strings } from "../../strings/pt-BR.js";
import { IconNavHome } from "../atoms/IconNavHome.jsx";
import { IconNavMore } from "../atoms/IconNavMore.jsx";
import { IconNavSquad } from "../atoms/IconNavSquad.jsx";
import { BottomTabItem } from "../molecules/BottomTabItem.jsx";

/**
 * Barra de navegação inferior (mobile). Em viewports largas fica oculta via CSS.
 */
export function MobileTabBar() {
  return (
    <nav className="fm-tabbar" aria-label={strings.tabbarNavLabel}>
      <div className="fm-tabbar__dock">
        <div className="fm-tabbar__cluster fm-tabbar__cluster--start">
          <BottomTabItem
            to="/elenco"
            label={strings.navSquad}
            icon={<IconNavSquad />}
          />
        </div>
        <div className="fm-tabbar__cluster fm-tabbar__cluster--center">
          <BottomTabItem
            to="/"
            end
            label={strings.navHome}
            icon={<IconNavHome />}
            prominence="home"
          />
        </div>
        <div className="fm-tabbar__cluster fm-tabbar__cluster--end">
          <BottomTabItem
            to="/mais"
            label={strings.navMore}
            icon={<IconNavMore />}
          />
        </div>
      </div>
    </nav>
  );
}
