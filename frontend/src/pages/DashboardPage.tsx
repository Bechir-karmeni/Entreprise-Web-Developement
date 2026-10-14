import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { useAuth } from "../auth/useAuth";
import { useFoodLogChanged } from "../lib/foodEvents";
import { useI18n } from "../i18n/useI18n";
import { MEAL_ORDER, localDateIso } from "../lib/foodLog";
import type { DayLog, FoodLogEntry, MealType } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";

type State =
  | { status: "loading" }
  | { status: "noProfile" }
  | { status: "error"; message?: string }
  | { status: "ready"; targets: TargetsResponse; day: DayLog | null };

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });
  const [hour] = useState(() => new Date().getHours());
  const [today] = useState(() => new Date());
  const [reloadKey, setReloadKey] = useState(0);
  useFoodLogChanged(() => setReloadKey((current) => current + 1));

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([nutritionApi.getTargets(), foodApi.getDay(localDateIso(new Date()))]).then(
      ([targetsResult, dayResult]) => {
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
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const greeting = hour < 12 ? t.dashboard.greetingMorning : hour < 18 ? t.dashboard.greetingAfternoon : t.dashboard.greetingEvening;
  const name = user?.firstName ?? "";
  const consumed = state.status === "ready" ? (state.day?.totals.calories ?? 0) : 0;
  const topStat =
    state.status === "ready" ? `${consumed.toLocaleString()} / ${state.targets.calories.toLocaleString()} kcal` : undefined;

  return (
    <AppShell
      title={greeting.replace("{name}", name)}
      subtitle={
        state.status === "ready"
          ? t.dashboard.subtitle.replace("{percent}", String(Math.round((consumed / state.targets.calories) * 100)))
          : undefined
      }
      topStat={topStat}
      actions={
        <>
          <SoonButton label={t.dashboard.summary} />
          <SoonButton label={t.dashboard.generatePlan} />
          <Link to="/food-tracking" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            {t.dashboard.logFood}
          </Link>
        </>
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
          <p className="font-medium">{t.dashboard.noProfile}</p>
          <p className="mt-1 text-sm text-slate-600">{t.dashboard.profileComingSoon}</p>
        </section>
      )}

      {state.status === "ready" && (
        <ReadyView targets={state.targets} day={state.day} today={today} />
      )}

      <p className="text-xs text-slate-500">{t.common.estimateNote}</p>
    </AppShell>
  );
}

function ReadyView({ targets, day, today }: { targets: TargetsResponse; day: DayLog | null; today: Date }) {
  const { t } = useI18n();
  const totals = day?.totals ?? { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0 };
  const entries = day?.entries ?? [];
  const activeBurn = Math.max(0, targets.tdee - targets.bmr);
  const onTrack = totals.calories <= targets.calories;
  const dateText = today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold uppercase tracking-wide text-emerald-800">
          {t.dashboard.metabolicActive}
        </span>
        <span className="text-slate-500">{dateText}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.dashboard.energyBudget}</p>
              <h2 className="mt-1 font-semibold">{t.dashboard.caloricStatus}</h2>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${onTrack ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {onTrack ? t.dashboard.targetOnTrack : t.dashboard.overTarget}
            </span>
          </div>

          <div className="mt-4 flex justify-center">
            <CalorieRing consumed={totals.calories} target={targets.calories} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label={t.dashboard.remaining} value={Math.max(0, targets.calories - totals.calories)} unit="kcal" />
            <Stat label={t.dashboard.netBalance} value={totals.calories - activeBurn} unit="kcal" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-slate-500">{t.dashboard.consumed}</p>
              <p className="mt-1 font-semibold">{totals.calories.toLocaleString()} kcal</p>
            </div>
            <div title={t.dashboard.activeBurnNote}>
              <p className="text-slate-500">{t.dashboard.activeBurn}</p>
              <p className="mt-1 font-semibold text-amber-600">{activeBurn.toLocaleString()} kcal</p>
            </div>
            <div>
              <p className="text-slate-500">{t.dashboard.baseBmr}</p>
              <p className="mt-1 font-semibold">{Math.round(targets.bmr).toLocaleString()} kcal</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          <MacroCard label={t.dashboard.protein} consumed={totals.proteinGrams} target={targets.proteinGrams} color="bg-rose-500" leftText={t.dashboard.leftForGoal} reachedText={t.dashboard.goalReached} />
          <MacroCard label={t.dashboard.carbs} consumed={totals.carbsGrams} target={targets.carbsGrams} color="bg-amber-500" leftText={t.dashboard.leftForGoal} reachedText={t.dashboard.goalReached} />
          <MacroCard label={t.dashboard.fat} consumed={totals.fatGrams} target={targets.fatGrams} color="bg-emerald-600" leftText={t.dashboard.leftForGoal} reachedText={t.dashboard.goalReached} />

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{t.dashboard.fiber}</p>
                <p className="text-xs text-slate-500">{t.dashboard.fiberNote}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {totals.fiberGrams} <span className="text-sm font-medium text-slate-500">/ {targets.fiberGrams} g</span>
                </p>
                <p className="text-xs font-semibold text-emerald-700">
                  {Math.min(100, Math.round((totals.fiberGrams / targets.fiberGrams) * 100))}% {t.dashboard.achieved}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <p className="font-semibold">{t.dashboard.hydration}</p>
            <p className="mt-2 text-2xl font-bold">
              {targets.waterLiters.toFixed(1)} <span className="text-sm font-medium text-slate-500">L</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">{t.dashboard.hydrationNote}</p>
            <span className="mt-3 inline-block rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-400">
              +250 ml · {t.common.comingSoon}
            </span>
          </section>
        </div>
      </div>

      <CopilotPlaceholder />

      <MealChart entries={entries} targetCalories={targets.calories} />

      <MealsSchedule entries={entries} />
    </>
  );
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const { t } = useI18n();
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const fraction = target > 0 ? Math.min(1, consumed / target) : 0;
  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#00704a"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${fraction * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold">{consumed.toLocaleString()}</p>
        <p className="text-xs text-slate-500">/ {target.toLocaleString()} kcal</p>
        <span className="sr-only">{t.dashboard.consumed}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">
        {value.toLocaleString()} <span className="text-xs font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function MacroCard({
  label,
  consumed,
  target,
  color,
  leftText,
  reachedText,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  leftText: string;
  reachedText: string;
}) {
  const percent = target > 0 ? Math.round((consumed / target) * 100) : 0;
  const left = Math.max(0, Math.round((target - consumed) * 10) / 10);
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="text-xs font-semibold text-slate-500">{percent}%</span>
      </div>
      <p className="mt-2 text-2xl font-bold">
        {consumed} <span className="text-sm font-medium text-slate-500">/ {target} g</span>
      </p>
      <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden="true">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {left > 0 ? leftText.replace("{amount}", `${left} g`) : reachedText}
      </p>
    </section>
  );
}

function CopilotPlaceholder() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-6 ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{t.dashboard.copilotTitle}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">
            {t.common.comingSoon}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{t.dashboard.copilotText}</p>
      </div>
      <span className="self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 sm:self-auto">
        {t.dashboard.askAi}
      </span>
    </section>
  );
}

function MealChart({ entries, targetCalories }: { entries: FoodLogEntry[]; targetCalories: number }) {
  const { t } = useI18n();
  const perMeal = MEAL_ORDER.map((mealType) => ({
    mealType,
    kcal: entries.filter((entry) => entry.mealType === mealType).reduce((sum, entry) => sum + entry.calories, 0),
  }));
  const scale = Math.max(targetCalories, ...perMeal.map((meal) => meal.kcal), 1);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t.dashboard.chartTitle}</h2>
          <p className="text-xs text-slate-500">{t.dashboard.chartSubtitle}</p>
        </div>
        <p className="text-xs text-slate-500">{t.dashboard.dailyTarget.replace("{target}", targetCalories.toLocaleString())}</p>
      </div>
      <div className="mt-6 flex h-48 items-end justify-around gap-4 border-b border-slate-200 pb-2">
        {perMeal.map((meal) => (
          <div key={meal.mealType} className="flex h-full w-full max-w-24 flex-col items-center justify-end gap-2">
            <span className="text-xs font-semibold text-slate-600">{meal.kcal > 0 ? meal.kcal.toLocaleString() : ""}</span>
            <div
              className={`w-full rounded-t-lg ${meal.kcal > 0 ? "bg-emerald-700" : "bg-slate-100"}`}
              style={{ height: `${Math.max(2, (meal.kcal / scale) * 100)}%` }}
            />
            <span className="text-xs text-slate-500">{t.food.meals[meal.mealType]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MealsSchedule({ entries }: { entries: FoodLogEntry[] }) {
  const { t } = useI18n();
  const recorded = MEAL_ORDER.filter((mealType) => entries.some((entry) => entry.mealType === mealType)).length;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t.dashboard.mealsTitle}</h2>
          <p className="text-xs text-slate-500">{t.dashboard.mealsSubtitle}</p>
        </div>
        <p className="text-xs font-semibold text-slate-600">{t.dashboard.recordedCount.replace("{done}", String(recorded))}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {MEAL_ORDER.map((mealType) => (
          <MealCard key={mealType} mealType={mealType} entries={entries.filter((entry) => entry.mealType === mealType)} />
        ))}
      </div>
    </section>
  );
}

function MealCard({ mealType, entries }: { mealType: MealType; entries: FoodLogEntry[] }) {
  const { t } = useI18n();
  const kcal = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const protein = Math.round(entries.reduce((sum, entry) => sum + entry.proteinGrams, 0) * 10) / 10;
  const carbs = Math.round(entries.reduce((sum, entry) => sum + entry.carbsGrams, 0) * 10) / 10;
  const fat = Math.round(entries.reduce((sum, entry) => sum + entry.fatGrams, 0) * 10) / 10;
  const logged = entries.length > 0;
  const shownNames = entries.slice(0, 3).map((entry) => entry.foodName);
  const extra = entries.length - shownNames.length;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.food.meals[mealType]}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            logged ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
          }`}
        >
          {logged ? t.dashboard.logged : t.dashboard.notLogged}
        </span>
      </div>

      {logged ? (
        <>
          <p className="mt-2 text-sm font-medium">{shownNames.join(", ")}</p>
          {extra > 0 && <p className="text-xs text-slate-500">{t.dashboard.moreItems.replace("{count}", String(extra))}</p>}
          <div className="mt-3 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold">
            <span>{kcal} kcal</span>
            <span className="text-rose-700">P {protein} g</span>
            <span className="text-amber-700">C {carbs} g</span>
            <span className="text-teal-700">F {fat} g</span>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{t.food.emptyMeal}</p>
          <Link to="/food-tracking" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
            {t.common.logMeal}
          </Link>
        </div>
      )}
    </article>
  );
}

function SoonButton({ label }: { label: string }): ReactNode {
  const { t } = useI18n();
  return (
    <button type="button" disabled className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </button>
  );
}
