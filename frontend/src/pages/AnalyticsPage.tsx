import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { AnalysisCard } from "../components/AnalysisCard";
import { useI18n } from "../i18n/useI18n";
import { MEAL_ORDER, localDateIso } from "../lib/foodLog";
import type { DayLog, FoodLogEntry } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";
import type { TodayData } from "../types/today";
import { waterApi } from "../api/waterApi";
import { todayApi } from "../api/todayApi";
import {
  averageMealTimes,
  averageOf,
  dayWindow,
  formatClock,
  hydrationStats,
  topFoods,
  weekdayAverages,
} from "../lib/history";

type State =
  | { status: "loading" }
  | { status: "noProfile" }
  | { status: "error"; message?: string }
  | { status: "ready"; targets: TargetsResponse; day: DayLog | null };

const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

export default function AnalyticsPage() {
  const { t } = useI18n();
  const today = useMemo(() => localDateIso(new Date()), []);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([nutritionApi.getTargets(), foodApi.getDay(today)]).then(([targetsResult, dayResult]) => {
      if (cancelled) return;
      if (targetsResult.status === "rejected") {
        const error = targetsResult.reason;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "noProfile" });
        } else {
          setState({ status: "error", message: error instanceof ApiError ? error.message : undefined });
        }
        return;
      }
      setState({
        status: "ready",
        targets: targetsResult.value,
        day: dayResult.status === "fulfilled" ? dayResult.value : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

  const topStat =
    state.status === "ready"
      ? `${(state.day?.totals.calories ?? 0).toLocaleString()} / ${state.targets.calories.toLocaleString()} kcal`
      : undefined;

  return (
    <AppShell
      title={t.analytics.title}
      subtitle={t.analytics.subtitle}
      topStat={topStat}
      actions={
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {["Today", "7D", "30D", "3M", "1Y"].map((period) => (
            <button
              key={period}
              type="button"
              disabled
              title={t.common.comingSoon}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${period === "Today" ? "bg-emerald-700 text-white" : "text-slate-400"}`}
            >
              {period}
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
          <p className="font-medium">{t.analytics.noProfile}</p>
        </section>
      )}

      {state.status === "ready" && <ReadyView targets={state.targets} day={state.day} />}
    </AppShell>
  );
}

function ReadyView({ targets, day }: { targets: TargetsResponse; day: DayLog | null }) {
  const { t } = useI18n();
  const history = useLastDays();
  const entries = day?.entries ?? [];
  const totals = day?.totals ?? { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 };
  const caloriePercent = percentOf(totals.calories, targets.calories);
  const fiberPercent = percentOf(totals.fiberGrams, targets.fiberGrams);

  const proteinKcal = totals.proteinGrams * CALORIES_PER_GRAM.protein;
  const carbsKcal = totals.carbsGrams * CALORIES_PER_GRAM.carbs;
  const fatKcal = totals.fatGrams * CALORIES_PER_GRAM.fat;
  const macroKcal = proteinKcal + carbsKcal + fatKcal;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.analytics.calorieTarget} value={`${caloriePercent}%`} detail={`${totals.calories.toLocaleString()} / ${targets.calories.toLocaleString()} kcal`} />
        <StatCard label={t.analytics.fiberTitle} value={`${fiberPercent}%`} detail={`${totals.fiberGrams} / ${targets.fiberGrams} g`} />
        <StatCard label={t.analytics.macroKcalTitle} value={`${macroKcal.toLocaleString()} kcal`} detail={t.analytics.macroKcalNote} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{t.analytics.macroSplitTitle}</h2>
          <p className="text-xs text-slate-500">{t.analytics.macroSplitNote}</p>
          {macroKcal === 0 ? (
            <p className="mt-6 text-sm text-slate-500">{t.analytics.noEntries}</p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
              <Donut
                segments={[
                  { label: t.analytics.protein, value: proteinKcal, color: "#f43f5e" },
                  { label: t.analytics.carbs, value: carbsKcal, color: "#f59e0b" },
                  { label: t.analytics.fat, value: fatKcal, color: "#14b8a6" },
                ]}
                total={macroKcal}
              />
              <ul className="space-y-2 text-sm">
                <MacroLegend color="bg-rose-500" label={t.analytics.protein} grams={totals.proteinGrams} percent={percentOf(proteinKcal, macroKcal)} />
                <MacroLegend color="bg-amber-500" label={t.analytics.carbs} grams={totals.carbsGrams} percent={percentOf(carbsKcal, macroKcal)} />
                <MacroLegend color="bg-teal-500" label={t.analytics.fat} grams={totals.fatGrams} percent={percentOf(fatKcal, macroKcal)} />
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{t.analytics.topProteinTitle}</h2>
          <p className="text-xs text-slate-500">{t.analytics.topProteinNote}</p>
          <TopProteinList entries={entries} emptyText={t.analytics.noEntries} />
        </section>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{t.analytics.mealsTitle}</h2>
        <p className="text-xs text-slate-500">{t.analytics.mealsNote}</p>
        <MealBars entries={entries} />
      </section>

      <AnalysisCard />

      <TrendCard state={history} targetCalories={targets.calories} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MicronutrientGapsCard />
        <HistoryCards state={history} goalLiters={targets.waterLiters} />
        <PatternCards state={history} />
        <SoonCard title={t.analytics.insightTitle} text={t.analytics.insightText} />
      </div>
    </>
  );
}

const TREND_DAYS = 30;

/** ISO dates for the last `count` days, oldest first, ending today. */
function lastDayIsos(count: number): string[] {
  const dates: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    dates.push(localDateIso(date));
  }
  return dates;
}

/** One request after another for the last 30 days (parallel requests could each refresh an expired token). Shared by the cards below. */
function useLastDays(): HistoryState {
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const dates = lastDayIsos(TREND_DAYS);
      const days: HistoryDay[] = [];
      let failures = 0;
      for (const date of dates) {
        let entries: FoodLogEntry[] = [];
        let kcal = 0;
        try {
          const log = await foodApi.getDay(date);
          entries = log.entries;
          kcal = log.totals.calories;
        } catch {
          failures += 1;
        }
        let waterMl = 0;
        try {
          waterMl = (await waterApi.get(date)).totalMl;
        } catch {
          waterMl = 0;
        }
        days.push({ date, kcal, entries, waterMl });
      }
      if (cancelled) return;
      setState(failures === dates.length ? { status: "error" } : { status: "ready", days });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Calories per day for the last 30 days, from the real food log. */
function TrendCard({ state, targetCalories }: { state: HistoryState; targetCalories: number }) {
  const { t } = useI18n();

  const frame = (content: ReactNode) => (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.analytics.trendTitle}</h2>
      {content}
    </section>
  );

  if (state.status === "error") return frame(<p role="alert" className="mt-6 text-sm text-red-700">{t.common.genericError}</p>);
  if (state.status === "loading") return frame(<p className="mt-6 text-sm text-slate-600">{t.common.loading}</p>);

  const days = state.days;
  const logged = days.filter((day) => day.kcal > 0);
  if (logged.length === 0) return frame(<p className="mt-6 text-sm text-slate-500">{t.analytics.noEntries}</p>);

  const average = Math.round(logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length);
  const scale = Math.max(targetCalories, ...days.map((day) => day.kcal), 1);
  const targetLine = (targetCalories / scale) * 100;

  return frame(
    <>
      <p className="text-xs text-slate-500">
        {t.analytics.trendAverage.replace("{kcal}", average.toLocaleString())} · {t.analytics.trendLogged.replace("{count}", String(logged.length))}
      </p>
      <div className="relative mt-6 flex h-48 items-end gap-1 border-b border-slate-200">
        <div
          className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-amber-500"
          style={{ bottom: `${targetLine}%` }}
          aria-hidden="true"
        />
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.kcal} kcal`}
            className={`flex-1 rounded-t ${day.kcal === 0 ? "bg-slate-100" : day.kcal > targetCalories ? "bg-rose-500" : "bg-emerald-700"}`}
            style={{ height: `${Math.max(day.kcal === 0 ? 2 : 3, (day.kcal / scale) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{days[0].date.slice(5)}</span>
        <span>{t.analytics.trendTarget.replace("{kcal}", targetCalories.toLocaleString())}</span>
        <span>{days[days.length - 1].date.slice(5)}</span>
      </div>
    </>,
  );
}

/** Calories by weekday, and the foods logged on the most days, over the last 30 days. */
function PatternCards({ state }: { state: HistoryState }) {
  const { t, language } = useI18n();
  const p = t.analytics;

  if (state.status !== "ready") {
    const text = state.status === "loading" ? t.common.loading : t.common.genericError;
    return (
      <>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{p.weekdayTitle}</h2>
          <p className="mt-4 text-sm text-slate-600">{text}</p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{p.topFoodsTitle}</h2>
          <p className="mt-4 text-sm text-slate-600">{text}</p>
        </section>
      </>
    );
  }

  const weekdays = weekdayAverages(state.days.map((day) => ({ date: day.date, kcal: day.kcal })));
  const maxAverage = Math.max(1, ...weekdays.map((item) => item.average ?? 0));
  const foods = topFoods(
    state.days.flatMap((day) => day.entries.map((entry) => ({ date: day.date, name: entry.foodName }))),
    5,
  );
  const topDays = Math.max(1, ...foods.map((food) => food.days));
  // 7 January 2024 was a Sunday, so adding the weekday number gives a day with that weekday's name.
  const weekdayName = (weekday: number) =>
    new Date(2024, 0, 7 + weekday).toLocaleDateString(language === "de" ? "de-DE" : "en-GB", { weekday: "short" });

  return (
    <>
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{p.weekdayTitle}</h2>
        <p className="text-xs text-slate-500">{p.weekdayNote}</p>
        {weekdays.every((item) => item.average === null) ? (
          <p className="mt-4 text-sm text-slate-500">{p.patternNone}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const item = weekdays[weekday];
              return (
                <li key={weekday} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-slate-700">{weekdayName(weekday)}</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      className="h-2 rounded-full bg-emerald-700"
                      style={{ width: `${item.average === null ? 0 : Math.max(2, (item.average / maxAverage) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-slate-600">
                    {item.average === null ? "–" : `${item.average.toLocaleString()} kcal`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{p.topFoodsTitle}</h2>
        <p className="text-xs text-slate-500">{p.topFoodsNote}</p>
        {foods.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{p.patternNone}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {foods.map((food) => (
              <li key={food.name}>
                <div className="flex justify-between gap-3">
                  <span className="truncate font-medium">{food.name}</span>
                  <span className="shrink-0 text-slate-600">{p.topFoodDays.replace("{count}", String(food.days))}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.round((food.days / topDays) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function MacroLegend({ color, label, grams, percent }: { color: string; label: string; grams: number; percent: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
      <span className="w-32 text-slate-700">{label}</span>
      <span className="font-semibold">{percent}%</span>
      <span className="text-xs text-slate-500">({Math.round(grams * 10) / 10} g)</span>
    </li>
  );
}

function Donut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0 -rotate-90" role="img" aria-label="Macro split">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {segments.map((segment) => {
        const length = total > 0 ? (segment.value / total) * circumference : 0;
        const element = (
          <circle
            key={segment.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="18"
            strokeDasharray={`${length} ${circumference}`}
            strokeDashoffset={-offset}
          />
        );
        offset += length;
        return element;
      })}
    </svg>
  );
}

function TopProteinList({ entries, emptyText }: { entries: FoodLogEntry[]; emptyText: string }) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.foodName, (totals.get(entry.foodName) ?? 0) + entry.proteinGrams);
  }
  const ranked = [...totals.entries()]
    .map(([name, grams]) => ({ name, grams: Math.round(grams * 10) / 10 }))
    .filter((item) => item.grams > 0)
    .sort((a, b) => b.grams - a.grams)
    .slice(0, 5);
  const sum = ranked.reduce((acc, item) => acc + item.grams, 0);

  if (ranked.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="mt-5 space-y-4">
      {ranked.map((item) => {
        const share = percentOf(item.grams, sum);
        return (
          <li key={item.name}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-medium">{item.name}</span>
              <span className="shrink-0 text-slate-600">{item.grams} g</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-2 rounded-full bg-rose-500" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MealBars({ entries }: { entries: FoodLogEntry[] }) {
  const { t } = useI18n();
  const perMeal = MEAL_ORDER.map((mealType) => ({
    mealType,
    kcal: entries.filter((entry) => entry.mealType === mealType).reduce((sum, entry) => sum + entry.calories, 0),
  }));
  const max = Math.max(1, ...perMeal.map((meal) => meal.kcal));
  return (
    <div className="mt-6 flex h-48 items-end justify-around gap-4 border-b border-slate-200 pb-2">
      {perMeal.map((meal) => (
        <div key={meal.mealType} className="flex h-full w-full max-w-24 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold text-slate-600">{meal.kcal > 0 ? meal.kcal.toLocaleString() : ""}</span>
          <div
            className={`w-full rounded-t-lg ${meal.kcal > 0 ? "bg-emerald-700" : "bg-slate-100"}`}
            style={{ height: `${Math.max(2, (meal.kcal / max) * 100)}%` }}
          />
          <span className="text-xs text-slate-500">{t.food.meals[meal.mealType]}</span>
        </div>
      ))}
    </div>
  );
}

/** Today's vitamins and minerals with the lowest share of their reference values. Uses the Today endpoint. */
function MicronutrientGapsCard() {
  const { t } = useI18n();
  const [day, setDay] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    todayApi
      .get(localDateIso(new Date()))
      .then((loaded) => {
        if (!cancelled) setDay(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const micronutrients = day?.micronutrients;
  const gaps = (micronutrients?.nutrients ?? [])
    .filter((nutrient) => nutrient.percentOfReference !== null)
    .sort((a, b) => (a.percentOfReference ?? 0) - (b.percentOfReference ?? 0))
    .slice(0, 3);
  const names = t.today.nutrientNames;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.analytics.micronutrientTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.analytics.micronutrientGapsNote}</p>
      {failed && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {t.common.genericError}
        </p>
      )}
      {!failed && !micronutrients && <p className="mt-4 text-sm text-slate-600">{t.common.loading}</p>}
      {micronutrients && micronutrients.entriesWithDetails === 0 && (
        <p className="mt-4 text-sm text-slate-500">{t.today.micronutrientNone}</p>
      )}
      {micronutrients && micronutrients.entriesWithDetails > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {gaps.map((nutrient) => (
            <li key={nutrient.key} className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-700">{names[nutrient.key as keyof typeof names] ?? nutrient.key}</span>
              <span className="text-xs text-slate-500">{nutrient.percentOfReference}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type HistoryDay = { date: string; kcal: number; entries: FoodLogEntry[]; waterMl: number };
type HistoryState = { status: "loading" } | { status: "error" } | { status: "ready"; days: HistoryDay[] };

/** Hydration and meal timing over the last 30 days, from the shared history. */
function HistoryCards({ state, goalLiters }: { state: HistoryState; goalLiters: number }) {
  const { t } = useI18n();

  if (state.status !== "ready") {
    const text = state.status === "loading" ? t.common.loading : t.common.genericError;
    return (
      <>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{t.analytics.hydrationTitle}</h2>
          <p className="mt-4 text-sm text-slate-600">{text}</p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-semibold">{t.analytics.timingTitle}</h2>
          <p className="mt-4 text-sm text-slate-600">{text}</p>
        </section>
      </>
    );
  }

  const goalMl = Math.round(goalLiters * 1000);
  const water = hydrationStats(state.days.map((day) => day.waterMl), goalMl);
  const meals = averageMealTimes(state.days.map((day) => day.entries));
  const windows = state.days
    .map((day) => dayWindow(day.entries))
    .filter((window): window is { first: number; last: number } => window !== null);
  const firstAverage = averageOf(windows.map((window) => window.first));
  const lastAverage = averageOf(windows.map((window) => window.last));
  const dayCount = String(TREND_DAYS);

  return (
    <>
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{t.analytics.hydrationTitle}</h2>
        {water.loggedDays === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t.analytics.hydrationNone}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            <li>{t.analytics.hydrationSummary.replace("{logged}", String(water.loggedDays)).replace("{days}", dayCount)}</li>
            <li>
              {t.analytics.hydrationAverage.replace("{ml}", String(water.averageMlOnLoggedDays ?? 0))}
            </li>
            {goalMl > 0 && (
              <li>
                {t.analytics.hydrationGoal
                  .replace("{ml}", String(goalMl))
                  .replace("{count}", String(water.goalDays))
                  .replace("{days}", dayCount)}
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-semibold">{t.analytics.timingTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.analytics.timingNote}</p>
        {windows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t.analytics.timingNoData}</p>
        ) : (
          <>
            <ul className="mt-4 space-y-1.5 text-sm">
              {MEAL_ORDER.map((meal) => {
                const average = meals[meal];
                return (
                  <li key={meal} className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-700">{t.today.meals[meal]}</span>
                    <span className="text-slate-600">{average === null ? t.analytics.timingNone : formatClock(average)}</span>
                  </li>
                );
              })}
            </ul>
            {firstAverage !== null && lastAverage !== null && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {t.analytics.timingFirstLast.replace("{first}", formatClock(firstAverage)).replace("{last}", formatClock(lastAverage))}
              </p>
            )}
          </>
        )}
      </section>
    </>
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
