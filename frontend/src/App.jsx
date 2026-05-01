import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import { HomePage } from "./components/pages/HomePage.jsx";
import { LoginPage } from "./components/pages/LoginPage.jsx";
import { MorePage } from "./components/pages/MorePage.jsx";
import { SquadPage } from "./components/pages/SquadPage.jsx";
import { AppShell } from "./components/templates/AppShell.jsx";
import { RequireAuth } from "./components/templates/RequireAuth.jsx";

function routerBasename() {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base === "/" || base === "./") return undefined;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/elenco" element={<SquadPage />} />
              <Route path="/mais" element={<MorePage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
