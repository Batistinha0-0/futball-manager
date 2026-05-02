import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { setMatchDaySessionDate } from "../../stores/matchDaySessionDateStore.js";
import { AppHeader } from "../organisms/AppHeader.jsx";
import { MatchDayReportsCard } from "../organisms/MatchDayReportsCard.jsx";
import { MainLayout } from "../templates/MainLayout.jsx";

export function ReportsPage() {
  const { sessionDate: sessionDateParam } = useParams();
  const navigate = useNavigate();

  const rawParam = sessionDateParam != null ? String(sessionDateParam).trim() : "";
  const paramInvalid = rawParam !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(rawParam);
  const viewDate = useMemo(() => {
    if (paramInvalid) return null;
    return rawParam === "" ? null : rawParam;
  }, [rawParam, paramInvalid]);

  useEffect(() => {
    setMatchDaySessionDate(null);
  }, []);

  useEffect(() => {
    if (paramInvalid) navigate("/relatorios", { replace: true });
  }, [paramInvalid, navigate]);

  if (paramInvalid) {
    return (
      <MainLayout
        header={
          <AppHeader title={strings.reportsPageHeaderTitle} subtitle={strings.reportsPageHeaderSubtitle} />
        }
      >
        <div className="fm-page-grid">
          <p className="fm-muted">{strings.matchDayLoading}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      header={
        <AppHeader title={strings.reportsPageHeaderTitle} subtitle={strings.reportsPageHeaderSubtitle} />
      }
    >
      <div className="fm-page-grid">
        <MatchDayReportsCard viewDate={viewDate} />
      </div>
    </MainLayout>
  );
}
