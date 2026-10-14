import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { useI18n } from "../i18n/useI18n";
import { MEAL_ORDER, localDateIso } from "../lib/foodLog";
import type { DayLog, FoodLogEntry } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SoonCard title={t.analytics.trendTitle} text={t.analytics.trendText} />
        <SoonCard title={t.analytics.micronutrientTitle} text={t.analytics.micronutrientText} />
        <SoonCard title={t.analytics.hydrationTitle} text={t.analytics.hydrationText} />
        <SoonCard title={t.analytics.timingTitle} text={t.analytics.timingText} />
        <SoonCard title={t.analytics.insightTitle} text={t.analytics.insightText} />
      </div>
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
