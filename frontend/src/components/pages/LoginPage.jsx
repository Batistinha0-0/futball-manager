import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { fetchCurrentUser } from "../../services/authApi.js";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { LoginForm } from "../organisms/LoginForm.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

export function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchCurrentUser();
        if (!cancelled) navigate("/", { replace: true });
      } catch {
        /* stay on login */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <MainLayout
      variant="auth"
      header={
        <AppHeader title={strings.loginTitle} subtitle={strings.loginSubtitle} />
      }
    >
      <LoginForm />
    </MainLayout>
  );
}
