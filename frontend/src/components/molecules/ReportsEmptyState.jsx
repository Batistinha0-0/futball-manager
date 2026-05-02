import { Link } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { Text } from "../atoms/Text.jsx";

/** Estado vazio quando não há nenhum dia encerrado com relatório. */
export function ReportsEmptyState() {
  return (
    <div className="fm-reports-empty" role="status">
      <div className="fm-reports-empty__box">
        <Text as="h2" className="fm-reports-empty__title">
          {strings.reportsEmptyTitle}
        </Text>
        <p className="fm-muted fm-reports-empty__body">{strings.reportsEmptyBody}</p>
        <Link className="fm-btn fm-btn--secondary fm-reports-empty__cta" to="/">
          {strings.reportsEmptyCta}
        </Link>
      </div>
    </div>
  );
}
