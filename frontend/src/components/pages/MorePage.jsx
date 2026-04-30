import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { logoutRequest } from "../../services/authApi.js";
import { useAuthMe } from "../../hooks/useAuthMe.js";
import { Button } from "../atoms/Button.jsx";
import { Text } from "../atoms/Text.jsx";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { SuperAdminUsersSection } from "../organisms/SuperAdminUsersSection.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

export function MorePage() {
  const navigate = useNavigate();
  const { user, loading: meLoading } = useAuthMe();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
      /* still clear local session UX */
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <MainLayout
      header={
        <AppHeader
          title={strings.morePageTitle}
          subtitle={strings.morePageSubtitle}
        />
      }
    >
      <section className="fm-card">
        <Text as="h2" className="fm-card__title">
          {strings.morePageTitle}
        </Text>
        <p className="fm-muted">{strings.morePagePlaceholder}</p>
      </section>

      {!meLoading && user?.role === "super_admin" ? <SuperAdminUsersSection /> : null}

      <section className="fm-card">
        <Text as="h2" className="fm-card__title">
          {strings.moreSessionTitle}
        </Text>
        <p className="fm-muted">{strings.moreLogoutHint}</p>
        <div className="fm-more__logout">
          <Button type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? strings.moreLogoutWorking : strings.moreLogoutButton}
          </Button>
        </div>
      </section>
    </MainLayout>
  );
}
