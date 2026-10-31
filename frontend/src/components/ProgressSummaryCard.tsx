import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { useFoodLogChanged } from "../lib/foodEvents";
import { localDateIso } from "../lib/foodLog";
import { lastDays, summarizeProgress, type ProgressSummary } from "../lib/progress";
import { useI18n } from "../i18n/useI18n";

/** Dashboard summary of the Progress page: streak, days on target this week, and a link to the full page. */
export default function ProgressSummaryCard() {
  const { t } = useI18n();
  const p = t.dashboardProgress;
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useFoodLogChanged(() => setReloadKey((current) => current + 1));

  useEffect(() => {
    let active = true;
    const today = localDateIso(new Date());
    const dates = lastDays(today, 30);
    Promise.all([nutritionApi.getTargets(), foodApi.range(dates[0], today)])
      .then(([targets, range]) => {
        if (!active) return;
        const byDate = new Map(range.map((day) => [day.date, day.totals.calories]));
        const days = dates.map((date) => ({ date, calories: byDate.get(date) ?? 0 }));
        setSummary(summarizeProgress(days, targets.calories));
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (failed) return null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{p.title}</h2>
        <Link to="/progress" className="text-sm font-medium text-emerald-700 hover:underline">{p.open}</Link>
      </div>
      {!summary ? (
        <p className="mt-3 text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{p.streak}</dt>
            <dd className="text-xl font-bold">{p.streakValue.replace("{count}", String(summary.streak))}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{p.onTarget}</dt>
            <dd className="text-xl font-bold">{p.onTargetValue.replace("{count}", String(summary.onTargetLastWeek))}</dd>
          </div>
        </dl>
      )}
      {summary && !summary.loggedToday && <p className="mt-3 text-xs text-slate-500">{p.notLoggedToday}</p>}
    </section>
  );
}
