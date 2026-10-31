import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { todayApi } from "../api/todayApi";
import { notifyFoodLogChanged, useFoodLogChanged } from "../lib/foodEvents";
import { useI18n } from "../i18n/useI18n";
import { WaterCard } from "../components/WaterCard";
import { MEAL_ORDER, localDateIso } from "../lib/foodLog";
import type { FoodLogEntry, MealType } from "../types/food";
import type { EatingWindow, MicronutrientDay, TodayData, TodayMeal } from "../types/today";
import { MEAL_SHARE } from "../lib/profile";

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
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("chronological");
  useFoodLogChanged(() => setReloadKey((current) => current + 1));

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    todayApi
      .get(date)
      .then((loaded) => {
        if (active) setData(loaded);
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
      notifyFoodLogChanged();
    } catch (failure) {
      setError(errorText(failure, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  async function changeAmount(id: string, amount: number): Promise<boolean> {
    setBusyId(id);
    setError(null);
    try {
      await foodApi.updateEntryAmount(id, amount);
      notifyFoodLogChanged();
      return true;
    } catch (failure) {
      setError(errorText(failure, t.common.genericError));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  /** Adds the same food again to the same meal and day. Quick entries are copied with their values. */
  async function duplicate(entry: FoodLogEntry) {
    setBusyId(entry.id);
    setError(null);
    try {
      if (entry.foodId) {
        await foodApi.addEntry({ foodId: entry.foodId, mealType: entry.mealType, date: entry.date, amount: entry.amount });
      } else {
        await foodApi.addQuickEntry({
          mealType: entry.mealType,
          date: entry.date,
          name: entry.foodName,
          calories: entry.calories,
          proteinGrams: entry.proteinGrams,
          carbsGrams: entry.carbsGrams,
          fatGrams: entry.fatGrams,
          fiberGrams: entry.fiberGrams,
        });
      }
      notifyFoodLogChanged();
    } catch (failure) {
      setError(errorText(failure, t.common.genericError));
    } finally {
      setBusyId(null);
    }
  }

  const targets = data?.targets;
  const totals = data?.totals;
  const consumed = totals?.calories ?? 0;
  const target = targets?.calories ?? 0;
  const remaining = data?.remainingKcal ?? 0;
  const percent = data?.percentOfTarget ?? 0;
  const protein = totals?.proteinGrams ?? 0;
  const carbs = totals?.carbsGrams ?? 0;
  const fat = totals?.fatGrams ?? 0;
  const fiber = totals?.fiberGrams ?? 0;

  const entriesFor = (meal: MealType): FoodLogEntry[] => data?.meals.find((item) => item.meal === meal)?.entries ?? [];

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
      actions={
        <>
          <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-slate-200/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t.today.budgetLabel}</p>
            <p className="text-sm font-semibold">
              {consumed} / {target} kcal
            </p>
          </div>
          <Link to="/food-tracking" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            {t.today.quickLog}
          </Link>
        </>
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
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
            {t.today.dayStatus}
          </span>{" "}
          <span className="font-semibold">{statusText}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {!data && !error && <p className="mt-4 text-sm text-slate-600">{t.common.loading}</p>}

      {data && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.today.energyLabel}</p>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{t.today.energyTitle}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    remaining >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {remaining >= 0 ? t.today.onTrack : t.today.overTarget}
                </span>
              </div>
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

            <>
              <div className="grid grid-cols-2 gap-3">
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

              <WaterCard date={date} goalLiters={targets?.waterLiters ?? 0} />
            </>
          </div>

          <section className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-semibold">{t.today.mealsTitle}</h2>
                <p className="text-sm text-slate-500">{t.today.mealsSubtitle}</p>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                {t.today.sortLabel}
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="bg-transparent font-medium text-slate-800 focus:outline-none"
                >
                  <option value="chronological">{t.today.sortChronological}</option>
                  <option value="calories">{t.today.sortCalories}</option>
                  <option value="name">{t.today.sortName}</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {MEAL_ORDER.map((meal) => (
                <MealCard
                  key={meal}
                  meal={meal}
                  items={entriesFor(meal)}
                  busyId={busyId}
                  sortMode={sortMode}
                  onRemove={remove}
                  onDuplicate={duplicate}
                  onAmount={changeAmount}
                />
              ))}
            </div>

            <Link
              to="/food-tracking"
              className="block rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              + {t.today.addMore}
            </Link>
          </section>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.today.intelligenceLabel}</p>
            <h2 className="font-semibold">{t.today.coachingTitle}</h2>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CoachCard date={date} />
            <EnergySpreadCard meals={data.meals} target={target} />
            <EatingTimesCard eating={data.eatingWindow} />
            {data.micronutrients && <MicronutrientCard day={data.micronutrients} />}
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
  sortMode,
  onRemove,
  onDuplicate,
  onAmount,
}: {
  meal: MealType;
  items: FoodLogEntry[];
  busyId: string | null;
  sortMode: SortMode;
  onRemove: (id: string) => void;
  onDuplicate: (entry: FoodLogEntry) => void;
  onAmount: (id: string, amount: number) => Promise<boolean>;
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
          {sortEntries(items, sortMode).map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              busy={busyId === entry.id}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onAmount={onAmount}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{t.today.nothingLogged}</p>
      )}

    </article>
  );
}

type SortMode = "chronological" | "calories" | "name";

/** Keeps the logged order unless the user picked another sort. */
function sortEntries(items: FoodLogEntry[], mode: SortMode): FoodLogEntry[] {
  if (mode === "calories") return [...items].sort((a, b) => b.calories - a.calories);
  if (mode === "name") return [...items].sort((a, b) => a.foodName.localeCompare(b.foodName));
  return items;
}

/** One logged food in a meal: remove, duplicate, or change the amount eaten. */
function EntryRow({
  entry,
  busy,
  onRemove,
  onDuplicate,
  onAmount,
}: {
  entry: FoodLogEntry;
  busy: boolean;
  onRemove: (id: string) => void;
  onDuplicate: (entry: FoodLogEntry) => void;
  onAmount: (id: string, amount: number) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(entry.amount));
  const [error, setError] = useState<string | null>(null);
  const buttonClass =
    "rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50";

  async function save() {
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0 || value > 5000) {
      setError(t.today.amountError);
      return;
    }
    setError(null);
    if (await onAmount(entry.id, value)) {
      setEditing(false);
    }
  }

  return (
    <li className="py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.foodName}</p>
          <p className="text-xs text-slate-500">
            {entry.amount} {entry.servingUnit}
          </p>
        </div>
        <span className="whitespace-nowrap font-semibold">{entry.calories} kcal</span>
        <button
          type="button"
          onClick={() => {
            setDraft(String(entry.amount));
            setError(null);
            setEditing((open) => !open);
          }}
          disabled={busy}
          className={buttonClass}
        >
          {t.today.edit}
        </button>
        <button type="button" onClick={() => onDuplicate(entry)} disabled={busy} className={buttonClass}>
          {t.today.duplicate}
        </button>
        <button type="button" onClick={() => onRemove(entry.id)} disabled={busy} className={buttonClass}>
          {t.today.remove}
        </button>
      </div>
      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            {t.today.amountLabel}
            <input
              type="number"
              min={1}
              max={5000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <span className="text-xs text-slate-500">{entry.servingUnit}</span>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {t.today.save}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={buttonClass}>
            {t.common.cancel}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </li>
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

/**
 * Vitamins and minerals of the day against the EU reference values. Only entries with nutrient data count,
 * so the card says how many entries it is based on.
 */
function MicronutrientCard({ day }: { day: MicronutrientDay }) {
  const { t } = useI18n();
  const names = t.today.nutrientNames;
  const hasData = day.entriesWithDetails > 0;
  const counts = { done: String(day.entriesWithDetails), total: String(day.entriesTotal) };
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:col-span-2 xl:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t.today.micronutrientTitle}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {t.today.micronutrientCount.replace("{done}", counts.done).replace("{total}", counts.total)}
        </span>
      </div>
      {hasData ? (
        <>
          {day.entriesWithDetails < day.entriesTotal && (
            <p className="mt-1 text-xs text-slate-500">
              {t.today.micronutrientPartial.replace("{done}", counts.done).replace("{total}", counts.total)}
            </p>
          )}
          <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
            {day.nutrients.map((nutrient) => (
              <li key={nutrient.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-700">{names[nutrient.key as keyof typeof names] ?? nutrient.key}</span>
                  <span className="text-xs text-slate-500">
                    {nutrient.amount}
                    {nutrient.referenceAmount !== null && ` / ${nutrient.referenceAmount}`} {nutrient.unit}
                    {nutrient.percentOfReference !== null && ` · ${nutrient.percentOfReference}%`}
                  </span>
                </div>
                {nutrient.percentOfReference !== null && (
                  <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      className="h-2 rounded-full bg-emerald-600"
                      style={{ width: `${Math.min(100, nutrient.percentOfReference)}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{t.today.micronutrientNone}</p>
      )}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{t.today.micronutrientNote}</p>
    </section>
  );
}

/** Calories per meal against each meal's share of today's calorie target. Uses only data already on the page. */
function EnergySpreadCard({ meals, target }: { meals: TodayMeal[]; target: number }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.today.curveTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.today.energySpreadHint}</p>
      <ul className="mt-4 space-y-3">
        {MEAL_ORDER.map((meal) => {
          const kcal = meals.find((item) => item.meal === meal)?.calories ?? 0;
          const share = Math.round(target * MEAL_SHARE[meal]);
          const width = share > 0 ? Math.min(100, Math.round((kcal / share) * 100)) : 0;
          return (
            <li key={meal}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700">{t.today.meals[meal]}</span>
                <span className="text-slate-500">
                  {t.today.ofShare.replace("{kcal}", String(kcal)).replace("{share}", String(share))}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The times of the first and the last log of the day. Logging times only: no fasting window, no advice. */
function EatingTimesCard({ eating }: { eating: EatingWindow | null }) {
  const { t, language } = useI18n();
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(language === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.today.fastingTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.today.eatingNote}</p>
      {eating ? (
        <ul className="mt-4 space-y-1 text-sm">
          <li>{t.today.eatingFirst.replace("{time}", time(eating.firstLoggedAt))}</li>
          <li>{t.today.eatingLast.replace("{time}", time(eating.lastLoggedAt))}</li>
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">{t.today.eatingNone}</p>
      )}
    </section>
  );
}

/** A short AI note about the day. Asked for on demand; the server limits how often it can be asked. */
function CoachCard({ date }: { date: string }) {
  const { t, language } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const result = await todayApi.coach(date, language === "de" ? "de" : "en");
      setNote(result.text === "" ? t.today.coachNothing : result.text);
    } catch (failure) {
      setError(errorText(failure, t.common.genericError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.today.coachTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.today.coachIntro}</p>
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {busy ? t.today.coachBusy : t.today.coachAsk}
      </button>
      {note && <p className="mt-3 text-sm text-slate-700">{note}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
