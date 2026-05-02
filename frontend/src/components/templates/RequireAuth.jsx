import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { fetchCurrentUser } from "../../services/authApi.js";
import { LoadingBlock } from "../molecules/LoadingBlock.jsx";

/**
 * Garante sessão válida (GET /auth/me; refresh automático via apiClient).
 * Sem sessão, redireciona para /login.
 */
export function RequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState(/** @type {"checking" | "ok"} */ ("checking"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchCurrentUser();
        if (!cancelled) setPhase("ok");
      } catch {
        if (!cancelled) {
          navigate("/login", { replace: true, state: { from: location.pathname } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  if (phase !== "ok") {
    return (
      <div className="fm-auth-check">
        <LoadingBlock message={strings.authChecking} spinnerSize="lg" />
      </div>
    );
  }

  return <Outlet />;
}
