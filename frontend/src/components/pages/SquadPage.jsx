import { strings } from "../../strings/pt-BR.js";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { SquadPlayerList } from "../organisms/SquadPlayerList.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

export function SquadPage() {
  return (
    <MainLayout
      header={
        <AppHeader
          title={strings.squadPageTitle}
          subtitle={strings.squadPageSubtitle}
        />
      }
    >
      <section className="fm-card fm-squad-page" aria-labelledby="squad-page-heading">
        <h2 id="squad-page-heading" className="fm-card__title fm-squad-page__title">
          {strings.squadPageTitle}
        </h2>
        <p className="fm-muted fm-squad-page__lede">{strings.squadPageIntro}</p>
        <SquadPlayerList />
      </section>
    </MainLayout>
  );
}
