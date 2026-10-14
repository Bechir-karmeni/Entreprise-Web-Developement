import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { useFoodLogChanged } from "../lib/foodEvents";
import { nutritionApi } from "../api/nutritionApi";
import { useI18n } from "../i18n/useI18n";
import { MEAL_ORDER, localDateIso } from "../lib/foodLog";
import type { DayLog, FoodLogEntry, MealType } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function percentOf(value: number, goal: number): number {
  return goal > 0 ? Math.round((value / goal) * 100) : 0;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** ISO week number (weeks start on Monday). */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
}

export default function TodayPage() {
  const { t } = useI18n();
  const todayIso = localDateIso(new Date());
  const [date, setDate] = useState(todayIso);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [targetsMissing, setTargetsMissing] = useState(false);
  const [day, setDay] = useState<DayLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useFoodLogChanged(() => setReloadKey((current) => current + 1));

  useEffect(() => {
    nutritionApi
      .getTargets()
      .then(setTargets)
      .catch(() => setTargetsMissing(true));
  }, []);

  useEffect(() => {
    let active = true;
    setDay(null);
    setError(null);
    foodApi
      .getDay(date)
      .then((loaded) => {
        if (active) setDay(loaded);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorText(failure, t.common.genericError));
      });
    return () => {
      active = false;
    };
  }, [date, reloadKey, t.common.genericError]);

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await foodApi.deleteEntry(id);
      setDay(await foodApi.getDay(date));
    } catch (failure) {
      setError(errorText(failure, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  const totals = day?.totals;
  const consumed = totals?.calories ?? 0;
  const target = targets?.calories ?? 0;
  const remaining = target - consumed;
  const percent = percentOf(consumed, target);
  const protein = totals?.proteinGrams ?? 0;
  const carbs = totals?.carbsGrams ?? 0;
  const fat = totals?.fatGrams ?? 0;
  const fiber = totals?.fiberGrams ?? 0;

  const dateObj = new Date(`${date}T00:00:00`);
  const longDate = dateObj.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const shortDate = dateObj.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const dayLabel = date === todayIso ? t.today.todayPrefix.replace("{date}", shortDate) : shortDate;
  const weekLine = t.today.weekLine
    .replace("{week}", String(isoWeek(dateObj)))
    .replace("{day}", String(dayOfYear(dateObj)));

  const statusText =
    remaining >= 0
      ? t.today.statusLeft
          .replace("{percent}", String(percent))
          .replace("{kcal}", String(remaining))
          .replace("{protein}", String(Math.max(0, (targets?.proteinGrams ?? 0) - protein)))
      : t.today.statusOver.replace("{percent}", String(percent)).replace("{kcal}", String(-remaining));

  const macros = [
    { key: "protein", label: t.today.protein, value: protein, goal: targets?.proteinGrams ?? 0, tone: "bg-rose-500" },
    { key: "carbs", label: t.today.carbs, value: carbs, goal: targets?.carbsGrams ?? 0, tone: "bg-amber-500" },
    { key: "fat", label: t.today.fat, value: fat, goal: targets?.fatGrams ?? 0, tone: "bg-orange-700" },
    { key: "fiber", label: t.today.fiber, value: fiber, goal: targets?.fiberGrams ?? 0, tone: "bg-emerald-600" },
  ];

  return (
    <AppShell
      title={t.today.title}
      subtitle={t.today.routineLine.replace("{date}", longDate)}
      topStat={`${consumed} / ${target} kcal`}
      actions={
        <Link to="/food-tracking" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          {t.today.quickLog}
        </Link>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">{weekLine}</span>
          <button
            type="button"
            aria-label={t.today.previousDay}
            onClick={() => setDate((current) => shiftDate(current, -1))}
            className="h-8 w-8 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
          >
            ‹
          </button>
          <p className="min-w-[8rem] text-center font-semibold">{dayLabel}</p>
          <button
            type="button"
            aria-label={t.today.nextDay}
            disabled={date >= todayIso}
            onClick={() => setDate((current) => shiftDate(current, 1))}
            className="h-8 w-8 rounded-full border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            ›
          </button>
        </div>
        <div className="rounded-xl bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-slate-200/70">
          <span className="text-xs text-slate-500">{t.today.dayStatus}</span>{" "}
          <span className="font-semibold">{statusText}</span>
        </div>
      </div>

      {targetsMissing && <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">{t.today.noProfile}</p>}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {!day && !error && <p className="mt-4 text-sm text-slate-600">{t.common.loading}</p>}

      {day && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.today.energyLabel}</p>
              <h2 className="text-lg font-semibold">{t.today.energyTitle}</h2>
              <CalorieRing percent={percent} value={consumed} caption={t.today.ofTarget.replace("{target}", String(target))} />
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                    {t.today.intake}
                  </span>
                  <span className="font-semibold">{consumed} kcal</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                    {t.today.activity}
                  </span>
                  <SoonChip />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden="true" />
                    {t.today.remaining}
                  </span>
                  <span className={`font-semibold ${remaining < 0 ? "text-red-600" : ""}`}>
                    {remaining >= 0 ? `${remaining} kcal` : t.today.overKcal.replace("{kcal}", String(-remaining))}
                  </span>
                </li>
              </ul>
              <div className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
                {targets && <p>{t.today.bmrLine.replace("{kcal}", String(targets.bmr))}</p>}
                {targets && <p>{t.today.tdeeLine.replace("{kcal}", String(targets.tdee))}</p>}
                <p>
                  {t.today.statusLabel}: {remaining >= 0 ? t.today.onTrack : t.today.overTarget}
                </p>
              </div>
            </section>

            <div className="space-y-4 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {macros.map((macro) => {
                  const left = macro.goal - macro.value;
                  return (
                    <section key={macro.key} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{macro.label}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {percentOf(macro.value, macro.goal)}%
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold">
                        {macro.value}
                        <span className="text-sm font-normal text-slate-500"> / {macro.goal} g</span>
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden="true">
                        <div
                          className={`h-2 rounded-full ${macro.tone}`}
                          style={{ width: `${Math.min(100, percentOf(macro.value, macro.goal))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {left > 0 ? t.today.leftGrams.replace("{grams}", String(left)) : t.today.goalReached}
                      </p>
                    </section>
                  );
                })}
              </div>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.today.hydrationTitle}</h3>
                    <p className="mt-1 text-2xl font-bold">
                      {targets?.waterLiters ?? 0}
                      <span className="text-sm font-normal text-slate-500"> L {t.today.dailyGoalSuffix}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["+ 250 ml", "+ 500 ml", "+ 1.000 ml"].map((label) => (
                      <button
                        key={label}
                        type="button"
                        disabled
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-400"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">{t.today.hydrationNote}</p>
              </section>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="space-y-3 lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{t.today.mealsTitle}</h2>
                  <p className="text-sm text-slate-500">{t.today.mealsSubtitle}</p>
                </div>
                <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-400">
                  {t.today.sortLabel} <span className="ml-1 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
                </span>
              </div>

              {MEAL_ORDER.map((meal) => (
                <MealCard
                  key={meal}
                  meal={meal}
                  items={day.entries.filter((entry) => entry.mealType === meal)}
                  busyId={busyId}
                  onRemove={remove}
                />
              ))}

              <Link
                to="/food-tracking"
                className="block rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                + {t.today.addMore}
              </Link>
            </section>

            <div className="space-y-4">
              <SoonCard title={t.today.coachTitle} text={t.today.coachText} />
              <SoonCard title={t.today.micronutrientTitle} text={t.today.micronutrientText} />
              <SoonCard title={t.today.curveTitle} text={t.today.curveText} />
              <SoonCard title={t.today.fastingTitle} text={t.today.fastingText} />
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function CalorieRing({ percent, value, caption }: { percent: number; value: number; caption: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, percent) / 100);
  return (
    <div className="relative mx-auto mt-4 h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#047857"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-xs text-slate-500">{caption}</span>
      </div>
    </div>
  );
}

function MealCard({
  meal,
  items,
  busyId,
  onRemove,
}: {
  meal: MealType;
  items: FoodLogEntry[];
  busyId: string | null;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const kcal = items.reduce((sum, entry) => sum + entry.calories, 0);
  const proteinSum = Math.round(items.reduce((sum, entry) => sum + entry.proteinGrams, 0) * 10) / 10;
  const carbsSum = Math.round(items.reduce((sum, entry) => sum + entry.carbsGrams, 0) * 10) / 10;
  const fatSum = Math.round(items.reduce((sum, entry) => sum + entry.fatGrams, 0) * 10) / 10;
  const logged = items.length > 0;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t.today.meals[meal]}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                logged ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
              }`}
            >
              {logged ? t.today.statusLogged : t.today.statusNotLogged}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{t.today.kcalShort.replace("{kcal}", String(kcal))}</span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">{t.today.shortProtein.replace("{g}", String(proteinSum))}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{t.today.shortCarbs.replace("{g}", String(carbsSum))}</span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-800">{t.today.shortFat.replace("{g}", String(fatSum))}</span>
          </div>
        </div>
        <Link to="/food-tracking" className="text-sm font-medium text-emerald-700 hover:underline">
          {t.today.addFood}
        </Link>
      </div>

      {logged ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{entry.foodName}</p>
                <p className="text-xs text-slate-500">
                  {entry.amount} {entry.servingUnit}
                </p>
              </div>
              <span className="whitespace-nowrap font-semibold">{entry.calories} kcal</span>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                disabled={busyId === entry.id}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                {t.today.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{t.today.nothingLogged}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <SoonChip label={t.today.edit} />
        <SoonChip label={t.today.duplicate} />
      </div>
    </article>
  );
}

function SoonChip({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
      {label ?? ""}
      <span className="text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </span>
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
