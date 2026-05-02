import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import { HomePage } from "./components/pages/HomePage.jsx";
import { LoginPage } from "./components/pages/LoginPage.jsx";
import { MorePage } from "./components/pages/MorePage.jsx";
import { MatchLivePage } from "./components/pages/MatchLivePage.jsx";
import { ReportsPage } from "./components/pages/ReportsPage.jsx";
import { SquadPage } from "./components/pages/SquadPage.jsx";
import { AppShell } from "./components/templates/AppShell.jsx";
import { RequireAuth } from "./components/templates/RequireAuth.jsx";

/** Redireciona URLs antigas `/dia/:sessionDate` (home) para a área de relatórios. */
function LegacyDiaToReportsRedirect() {
  const { sessionDate } = useParams();
  const raw = String(sessionDate ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return <Navigate to={`/relatorios/dia/${raw}`} replace />;
  }
  return <Navigate to="/relatorios" replace />;
}

/** Base do React Router alinhada ao `base` do Vite (produção: `/`). */
function routerBasename() {
  const raw = (import.meta.env.BASE_URL ?? "/").trim();
  if (!raw || raw === "/") return undefined;
  const normalized = raw.endsWith("/") && raw.length > 1 ? raw.slice(0, -1) : raw;
  return normalized || undefined;
}

export default function App() {
  return (
    <BrowserRouter
      basename={routerBasename()}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/dia/:sessionDate" element={<LegacyDiaToReportsRedirect />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/relatorios/dia/:sessionDate" element={<ReportsPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/partida" element={<MatchLivePage />} />
              <Route path="/elenco" element={<SquadPage />} />
              <Route path="/mais" element={<MorePage />} />
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
