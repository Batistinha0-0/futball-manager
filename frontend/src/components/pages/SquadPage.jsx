import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";
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
      <section className="fm-card">
        <Text as="h2" className="fm-card__title">
          {strings.squadPageTitle}
        </Text>
        <p className="fm-muted">{strings.squadPageIntro}</p>
        <SquadPlayerList />
      </section>
    </MainLayout>
  );
}
