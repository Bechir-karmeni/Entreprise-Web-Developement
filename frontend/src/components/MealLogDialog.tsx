import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { nutritionApi } from "../api/nutritionApi";
import { useI18n } from "../i18n/useI18n";
import { MEAL_ORDER, defaultMealFor, localDateIso, parseAmount } from "../lib/foodLog";
import { notifyFoodLogChanged } from "../lib/foodEvents";
import { QuickEntryPanel } from "./QuickEntryPanel";
import type { DayLog, FoodItem, MealType } from "../types/food";
import type { TargetsResponse } from "../types/nutrition";

const QUICK_AMOUNTS = [50, 100, 150, 180, 250];
const QUICK_SEARCHES = ["Banana", "Greek yogurt", "Egg"];

interface SelectedItem {
  food: FoodItem;
  amount: number;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Foods store their values per serving size, so scale them to the chosen amount. */
function forAmount(value: number, food: FoodItem, amount: number): number {
  return (value * amount) / food.servingSize;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function MealLogDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [meal, setMeal] = useState<MealType>(() => defaultMealFor(new Date().getHours()));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [day, setDay] = useState<DayLog | null>(null);
  const [targets, setTargets] = useState<TargetsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mode, setMode] = useState<"database" | "quick">("database");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const today = localDateIso(new Date());
    Promise.allSettled([nutritionApi.getTargets(), foodApi.getDay(today)]).then(([targetsResult, dayResult]) => {
      if (targetsResult.status === "fulfilled") setTargets(targetsResult.value);
      if (dayResult.status === "fulfilled") setDay(dayResult.value);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const handle = window.setTimeout(() => {
      Promise.all([foodApi.search(query, "COMMON"), foodApi.search(query, "CUSTOM")])
        .then(([common, custom]) => {
          if (!active) return;
          setResults([...custom.content, ...common.content]);
          setSearchError(null);
        })
        .catch((failure: unknown) => {
          if (active) setSearchError(errorText(failure, t.common.genericError));
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, t.common.genericError]);

  const active = selected.find((item) => item.food.id === activeId) ?? selected[selected.length - 1] ?? null;

  useEffect(() => {
    if (active) setAmountText(String(active.amount));
    // Only the selected food matters here; the amount is set by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.food.id]);

  function toggle(food: FoodItem) {
    setSaveError(null);
    setSelected((current) =>
      current.some((item) => item.food.id === food.id)
        ? current.filter((item) => item.food.id !== food.id)
        : [...current, { food, amount: food.servingSize }],
    );
    setActiveId(food.id);
  }

  function changeAmount(value: number) {
    if (!active) return;
    setAmountText(String(value));
    setSelected((current) => current.map((item) => (item.food.id === active.food.id ? { ...item, amount: value } : item)));
  }

  function typeAmount(text: string) {
    setAmountText(text);
    const parsed = parseAmount(text);
    if (parsed === null || !active) return;
    setSelected((current) => current.map((item) => (item.food.id === active.food.id ? { ...item, amount: parsed } : item)));
  }

  async function save() {
    if (selected.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const date = localDateIso(new Date());
    try {
      for (const item of selected) {
        await foodApi.addEntry({ foodId: item.food.id, mealType: meal, date, amount: item.amount });
      }
      notifyFoodLogChanged();
      onClose();
    } catch (failure) {
      // Entries saved before the failure are kept, so the pages must still reload.
      notifyFoodLogChanged();
      setSaveError(errorText(failure, t.common.genericError));
    } finally {
      setSaving(false);
    }
  }

  const sum = selected.reduce(
    (acc, item) => ({
      kcal: acc.kcal + forAmount(item.food.calories, item.food, item.amount),
      protein: acc.protein + forAmount(item.food.proteinGrams, item.food, item.amount),
    }),
    { kcal: 0, protein: 0 },
  );

  const totals = day?.totals;
  const left = (goal: number | undefined, eaten: number | undefined): string =>
    goal !== undefined && eaten !== undefined ? String(round1(goal - eaten)) : "—";
  const remainingLine = t.mealLog.remainingLine
    .replace("{kcal}", targets && totals ? String(Math.round(targets.calories - totals.calories)) : "—")
    .replace("{protein}", left(targets?.proteinGrams, totals?.proteinGrams))
    .replace("{carbs}", left(targets?.carbsGrams, totals?.carbsGrams))
    .replace("{fat}", left(targets?.fatGrams, totals?.fatGrams));

  const list = results ?? [];
  const activeKcal = active ? forAmount(active.food.calories, active.food, active.amount) : 0;
  const dailyShare = targets && targets.calories > 0 ? Math.round((activeKcal / targets.calories) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-log-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="meal-log-title" className="text-xl font-bold">
                {t.mealLog.title}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                {t.mealLog.liveBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{t.mealLog.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.mealLog.close}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="space-y-3 px-5">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.mealLog.mealLabel}>
            {MEAL_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={meal === option}
                onClick={() => setMeal(option)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  meal === option ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.today.meals[option]}
              </button>
            ))}
          </div>

          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">{t.mealLog.remainingLabel}</span> {remainingLine}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={mode === "database"}
              onClick={() => setMode("database")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                mode === "database" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.mealLog.methodDatabase}
            </button>
            <SoonChip label={t.mealLog.methodPhoto} />
            <SoonChip label={t.mealLog.methodBarcode} />
            <button
              type="button"
              aria-pressed={mode === "quick"}
              onClick={() => setMode("quick")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                mode === "quick" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.mealLog.methodQuick}
            </button>
          </div>

          {mode === "database" && (
          <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.mealLog.searchPlaceholder}
            aria-label={t.mealLog.searchPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-700 px-2.5 py-1 font-medium text-white">
              {t.mealLog.filterAll.replace("{count}", String(list.length))}
            </span>
            <SoonChip label={t.mealLog.filterFrequent} />
            <SoonChip label={t.mealLog.filterRecipes} />
            <SoonChip label={t.mealLog.filterProtein} />
            <SoonChip label={t.mealLog.filterVerified} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">{t.mealLog.quickLabel}</span>
            {QUICK_SEARCHES.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuery(label)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-50"
              >
                + {label}
              </button>
            ))}
          </div>
          </>
          )}
        </div>

        {mode === "quick" && <QuickEntryPanel meal={meal} onClose={onClose} />}

        {mode === "database" && (
        <>
        <div className="mt-4 grid min-h-0 flex-1 gap-0 border-t border-slate-200 lg:grid-cols-[1fr_20rem]">
          <div className="min-h-0 overflow-y-auto p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.mealLog.resultsCount.replace("{count}", String(list.length))}
            </p>
            {searchError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchError}</p>}
            {results === null && !searchError && <p className="text-sm text-slate-500">{t.common.loading}</p>}
            {results !== null && list.length === 0 && <p className="text-sm text-slate-500">{t.mealLog.noResults}</p>}
            <ul className="space-y-2">
              {list.map((food) => {
                const isSelected = selected.some((item) => item.food.id === food.id);
                return (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => toggle(food)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                        isSelected ? "border-emerald-600 bg-emerald-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{food.name}</p>
                        <p className="text-xs text-slate-500">
                          {t.mealLog.standardPortion.replace("{amount}", String(food.servingSize)).replace("{unit}", food.servingUnit)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">{food.calories} kcal</span>
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">P {food.proteinGrams} g</span>
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">C {food.carbsGrams} g</span>
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-800">F {food.fatGrams} g</span>
                        </div>
                      </div>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isSelected ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-500"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? "✓" : "+"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            {active ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.mealLog.configure}</p>
                <h3 className="mt-1 font-semibold">{active.food.name}</h3>

                <label htmlFor="meal-log-amount" className="mt-4 block text-xs font-medium text-slate-600">
                  {t.mealLog.amount}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="meal-log-amount"
                    inputMode="decimal"
                    value={amountText}
                    onChange={(event) => typeAmount(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg font-semibold focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">{active.food.servingUnit}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      aria-pressed={active.amount === amount}
                      onClick={() => changeAmount(amount)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                        active.amount === amount ? "bg-emerald-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs font-medium text-slate-600">{t.mealLog.preparation}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <SoonChip label={t.mealLog.prepRaw} />
                  <SoonChip label={t.mealLog.prepGrilled} />
                  <SoonChip label={t.mealLog.prepCooked} />
                </div>

                <div className="mt-5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-3xl font-bold">
                    {Math.round(activeKcal)} <span className="text-sm font-normal text-slate-500">kcal</span>
                  </p>
                  <p className="text-xs text-slate-500">{t.mealLog.dailyShare.replace("{percent}", String(dailyShare))}</p>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <dt className="text-[11px] text-slate-500">{t.today.protein}</dt>
                      <dd className="font-semibold">{round1(forAmount(active.food.proteinGrams, active.food, active.amount))} g</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-500">{t.today.carbs}</dt>
                      <dd className="font-semibold">{round1(forAmount(active.food.carbsGrams, active.food, active.amount))} g</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-500">{t.today.fat}</dt>
                      <dd className="font-semibold">{round1(forAmount(active.food.fatGrams, active.food, active.amount))} g</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-slate-500">{t.today.fiber}</dt>
                      <dd className="font-semibold">{round1(forAmount(active.food.fiberGrams, active.food, active.amount))} g</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">{t.mealLog.pickHint}</p>
            )}
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
              {t.mealLog.selectedCount.replace("{count}", String(selected.length))}
            </span>
            <span className="text-slate-600">
              {t.mealLog.selectedTotal.replace("{kcal}", String(Math.round(sum.kcal))).replace("{protein}", String(round1(sum.protein)))}
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                  setActiveId(null);
                }}
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                {t.mealLog.clearSelection}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              {t.mealLog.cancel}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || selected.length === 0}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {t.mealLog.save}
            </button>
          </div>
        </footer>
        </>
        )}
      </div>
    </div>
  );
}

function SoonChip({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
      {label}
      <span className="text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </span>
  );
}
