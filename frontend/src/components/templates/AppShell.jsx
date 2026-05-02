import { Outlet } from "react-router-dom";
import { DesktopSidebar } from "../organisms/DesktopSidebar.jsx";
import { MobileTabBar } from "../organisms/MobileTabBar.jsx";

/**
 * Invólucro da app: sidebar em telas largas, tab bar no mobile; conteúdo no meio.
 */
export function AppShell() {
  return (
    <div className="fm-app">
      <DesktopSidebar />
      <div className="fm-app__main">
        <div className="fm-app__stage">
          <Outlet />
        </div>
        <MobileTabBar />
      </div>
    </div>
  );
}
