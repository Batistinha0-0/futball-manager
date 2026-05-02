import { useEffect } from "react";
import { strings } from "../../strings/pt-BR.js";
import { setMatchDaySessionDate } from "../../stores/matchDaySessionDateStore.js";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { SundayGameCard } from "../organisms/SundayGameCard.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

export function HomePage() {
  useEffect(() => {
    setMatchDaySessionDate(null);
  }, []);

  return (
    <MainLayout
      header={
        <AppHeader title={strings.appTitle} subtitle={strings.appSubtitle} />
      }
    >
      <div className="fm-page-grid">
        <SundayGameCard />
      </div>
    </MainLayout>
  );
}
