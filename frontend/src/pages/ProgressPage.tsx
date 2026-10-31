import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { profileApi } from "../api/profileApi";
import { useI18n } from "../i18n/useI18n";
import { WeightCard } from "../components/WeightCard";
import { localDateIso } from "../lib/foodLog";
import {
  achievements,
  averageOnLoggedDays,
  bestStreak,
  currentStreak,
  isOnTarget,
  lastDays,
  loggedCount,
  onTargetCount,
  type AchievementKey,
  type DayPoint,
} from "../lib/progress";
import type { NutrientTotals } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";
import type { ProfileResponse } from "../types/profile";

/** The period buttons at the top: how many past days the history cards look at. */
type Period = "7D" | "30D" | "3M" | "6M" | "1Y";
const PERIODS: Period[] = ["7D", "30D", "3M", "6M", "1Y"];
const PERIOD_DAYS: Record<Period, number> = { "7D": 7, "30D": 30, "3M": 90, "6M": 180, "1Y": 365 };

type State =
  | { status: "loading" }
  | { status: "noProfile" }
  | { status: "error"; message?: string }
  | {
      status: "ready";
      profile: ProfileResponse;
      targets: TargetsResponse;
      totals: NutrientTotals;
      history: DayPoint[];
    };

const EMPTY_TOTALS: NutrientTotals = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 };

export default function ProgressPage() {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });
  const [period, setPeriod] = useState<Period>("30D");
  const today = useMemo(() => localDateIso(new Date()), []);
  const dates = useMemo(() => lastDays(today, PERIOD_DAYS[period]), [today, period]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([profileApi.get(), nutritionApi.getTargets(), foodApi.range(dates[0], today)]).then(
      ([profileResult, targetsResult, rangeResult]) => {
        if (cancelled) return;
        const failed = profileResult.status === "rejected" ? profileResult.reason : targetsResult.status === "rejected" ? targetsResult.reason : null;
        if (failed) {
          if (failed instanceof ApiError && failed.status === 404) {
            setState({ status: "noProfile" });
          } else {
            setState({ status: "error", message: failed instanceof ApiError ? failed.message : undefined });
          }
          return;
        }
        if (profileResult.status !== "fulfilled" || targetsResult.status !== "fulfilled") return;
        // Days without food are missing from the range response and count as not logged.
        // If the range fails, the page still shows the profile and targets with no food.
        const byDate = new Map<string, NutrientTotals>();
        if (rangeResult.status === "fulfilled") {
          for (const day of rangeResult.value) byDate.set(day.date, day.totals);
        }
        const history: DayPoint[] = dates.map((date) => ({ date, calories: byDate.get(date)?.calories ?? 0 }));
        setState({
          status: "ready",
          profile: profileResult.value,
          targets: targetsResult.value,
          totals: byDate.get(today) ?? EMPTY_TOTALS,
          history,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [dates, today]);

  const topStat =
    state.status === "ready" ? `${state.totals.calories.toLocaleString()} / ${state.targets.calories.toLocaleString()} kcal` : undefined;

  return (
    <AppShell
      title={t.progress.title}
      subtitle={t.progress.subtitle}
      topStat={topStat}
      actions={
        <div role="group" aria-label={t.progress.periodLabel} className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              aria-pressed={period === item}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                period === item ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      {state.status === "loading" && <p className="text-sm text-slate-600">{t.common.loading}</p>}

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {state.message ?? t.common.genericError}
        </p>
      )}

      {state.status === "noProfile" && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <p className="font-medium">{t.progress.noProfile}</p>
        </section>
      )}

      {state.status === "ready" && (
        <ReadyView
          profile={state.profile}
          targets={state.targets}
          totals={state.totals}
          history={state.history}
          periodDays={PERIOD_DAYS[period]}
        />
      )}
    </AppShell>
  );
}

function ReadyView({
  profile,
  targets,
  totals,
  history,
  periodDays,
}: {
  profile: ProfileResponse;
  targets: TargetsResponse;
  totals: NutrientTotals;
  history: DayPoint[];
  periodDays: number;
}) {
  const { t } = useI18n();
  const caloriesPercent = percentOf(totals.calories, targets.calories);
  const proteinPercent = percentOf(totals.proteinGrams, targets.proteinGrams);

  return (
    <>
      <section className="grid gap-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 ring-1 ring-slate-200/70 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{t.progress.mainFocus}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{t.progress.goals[profile.goal]}</p>
          <p className="mt-2 text-sm text-slate-600">
            {t.progress.activity}: {t.progress.activityLevels[profile.activityLevel]}
          </p>
          <p className="mt-3 text-xs text-slate-500">{t.progress.focusNote}</p>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">{t.progress.currentWeight}</p>
          <p className="mt-1 text-3xl font-bold">
            {profile.weightKg.toFixed(1)} <span className="text-base font-medium text-slate-500">kg</span>
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.progress.currentWeight} value={`${profile.weightKg.toFixed(1)} kg`} />
        <StatCard
          label={t.progress.caloriesToday}
          value={`${caloriesPercent}%`}
          detail={t.progress.ofTarget.replace("{target}", `${targets.calories.toLocaleString()} kcal`)}
        />
        <StatCard
          label={t.progress.proteinToday}
          value={`${proteinPercent}%`}
          detail={t.progress.ofTarget.replace("{target}", `${targets.proteinGrams} g`)}
        />
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{t.progress.goalStatusTitle}</h2>
        <p className="text-xs text-slate-500">{t.progress.goalStatusSubtitle}</p>
        <div className="mt-5 space-y-5">
          <GoalRow label={t.progress.calories} consumed={totals.calories} target={targets.calories} unit="kcal" ofText={t.progress.ofTarget} statusText={statusLabel(caloriesPercent, t.progress)} />
          <GoalRow label={t.progress.protein} consumed={totals.proteinGrams} target={targets.proteinGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(proteinPercent, t.progress)} />
          <GoalRow label={t.progress.carbs} consumed={totals.carbsGrams} target={targets.carbsGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.carbsGrams, targets.carbsGrams), t.progress)} />
          <GoalRow label={t.progress.fat} consumed={totals.fatGrams} target={targets.fatGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.fatGrams, targets.fatGrams), t.progress)} />
          <GoalRow label={t.progress.fiber} consumed={totals.fiberGrams} target={targets.fiberGrams} unit="g" ofText={t.progress.ofTarget} statusText={statusLabel(percentOf(totals.fiberGrams, targets.fiberGrams), t.progress)} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <CalorieChart days={history} target={targets.calories} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <WeightCard />
        </div>
        <ConsistencyCard days={history} target={targets.calories} />
        <StreakCard days={history} />
        <AchievementsCard days={history} target={targets.calories} />
        <InsightCard days={history} periodDays={periodDays} target={targets.calories} />
        <SoonCard title={t.progress.copilotTitle} text={t.progress.copilotText} />
      </div>
    </>
  );
}

/** Daily calories over the selected period. Each logged day is a dot, the dashed line is the daily target. */
function CalorieChart({ days, target }: { days: DayPoint[]; target: number }) {
  const { t, language } = useI18n();
  const p = t.progress;
  const width = 600;
  const height = 180;
  const pad = 8;
  const maxValue = Math.max(target * 1.2, ...days.map((day) => day.calories), 1);
  const x = (index: number) => (days.length <= 1 ? width / 2 : pad + (index / (days.length - 1)) * (width - 2 * pad));
  const y = (value: number) => height - pad - (value / maxValue) * (height - 2 * pad);
  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(language === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short" });
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <>
      <h2 className="font-semibold">{p.calorieChartTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{p.calorieChartText}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 h-48 w-full" role="img" aria-label={p.calorieChartTitle}>
        {target > 0 && (
          <line x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1.5} />
        )}
        {days.map((day, index) =>
          day.calories > 0 ? (
            <circle
              key={day.date}
              cx={x(index)}
              cy={y(day.calories)}
              r={3.5}
              fill={isOnTarget(day.calories, target) ? "#00613f" : "#f59e0b"}
            >
              <title>{`${formatDate(day.date)}: ${Math.round(day.calories).toLocaleString()} kcal`}</title>
            </circle>
          ) : null,
        )}
      </svg>
      {first && last && (
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{formatDate(first.date)}</span>
          <span>{p.calorieChartTarget.replace("{target}", target.toLocaleString())}</span>
          <span>{formatDate(last.date)}</span>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">{p.calorieChartLegend}</p>
    </>
  );
}

/** The last 7 days as bars: on target, logged but off target, or not logged. */
function ConsistencyCard({ days, target }: { days: DayPoint[]; target: number }) {
  const { t, language } = useI18n();
  const lastWeek = days.slice(-7);
  const hit = onTargetCount(lastWeek, target);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.progress.consistencyTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.progress.consistencyText}</p>
      <p className="mt-4 text-2xl font-bold">
        {hit} <span className="text-sm font-normal text-slate-500">{t.progress.consistencyOf}</span>
      </p>
      <ul className="mt-4 flex justify-between gap-1" aria-label={t.progress.consistencyTitle}>
        {lastWeek.map((day) => {
          const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString(language === "de" ? "de-DE" : "en-GB", { weekday: "short" });
          const tone = isOnTarget(day.calories, target) ? "bg-emerald-600" : day.calories > 0 ? "bg-amber-400" : "bg-slate-200";
          return (
            <li key={day.date} className="flex flex-1 flex-col items-center gap-1 text-[10px] text-slate-500">
              <span className={`h-6 w-full rounded-md ${tone}`} aria-hidden="true" />
              {weekday}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StreakCard({ days }: { days: DayPoint[] }) {
  const { t } = useI18n();
  const streak = currentStreak(days);
  const best = bestStreak(days);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.progress.streakTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.progress.streakText}</p>
      <p className="mt-4 text-2xl font-bold">
        {streak} <span className="text-sm font-normal text-slate-500">{t.progress.streakDays}</span>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {streak === 0 ? t.progress.streakNone : t.progress.streakBest.replace("{count}", String(best))}
      </p>
    </section>
  );
}

function AchievementsCard({ days, target }: { days: DayPoint[]; target: number }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.progress.achievementsTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.progress.achievementsText}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {achievements(days, target).map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                item.unlocked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
              aria-hidden="true"
            >
              {item.unlocked ? "✓" : ""}
            </span>
            <span className={item.unlocked ? "font-medium text-slate-800" : "text-slate-400"}>
              {t.progress.achievementLabels[item.key as AchievementKey]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Plain figures for the selected period. No advice and no AI. */
function InsightCard({ days, periodDays, target }: { days: DayPoint[]; periodDays: number; target: number }) {
  const { t } = useI18n();
  const logged = loggedCount(days);
  const average = averageOnLoggedDays(days);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.progress.insightTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.progress.insightText}</p>
      <ul className="mt-4 space-y-1 text-sm">
        <li>{t.progress.insightLogged.replace("{count}", String(logged)).replace("{days}", String(periodDays))}</li>
        <li>
          {average === null
            ? t.progress.insightNoAverage
            : t.progress.insightAverage.replace("{kcal}", average.toLocaleString()).replace("{target}", target.toLocaleString())}
        </li>
      </ul>
    </section>
  );
}

function percentOf(consumed: number, target: number): number {
  return target > 0 ? Math.round((consumed / target) * 100) : 0;
}

function statusLabel(percent: number, labels: { statusOn: string; statusBelow: string; statusAbove: string }): string {
  if (percent < 90) return labels.statusBelow;
  if (percent > 110) return labels.statusAbove;
  return labels.statusOn;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function GoalRow({
  label,
  consumed,
  target,
  unit,
  ofText,
  statusText,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  ofText: string;
  statusText: string;
}) {
  const percent = percentOf(consumed, target);
  const onTarget = percent >= 90 && percent <= 110;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-slate-600">
          {Math.round(consumed * 10) / 10} {unit} <span className="text-slate-400">{ofText.replace("{target}", `${target} ${unit}`)}</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true">
          <div className={`h-2 rounded-full ${onTarget ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <span className={`w-28 shrink-0 text-right text-xs font-semibold ${onTarget ? "text-emerald-700" : "text-amber-700"}`}>
          {percent}% · {statusText}
        </span>
      </div>
    </div>
  );
}

function SoonCard({ title, text }: { title: string; text: string }): ReactNode {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.common.comingSoon}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </section>
  );
}
