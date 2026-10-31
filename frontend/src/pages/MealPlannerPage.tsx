import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { mealPlanApi } from "../api/mealPlanApi";
import { nutritionApi } from "../api/nutritionApi";
import { recipeApi } from "../api/recipeApi";
import { shoppingApi } from "../api/shoppingApi";
import {
  dayTotals,
  fillPlan,
  mealTargets,
  PLAN_MEALS,
  planRows,
  planToCsv,
  shoppingFromPlan,
  slotKey,
  startOfWeek,
  weekDates,
  type DailyTargets,
} from "../lib/mealPlan";
import { planToPdf } from "../lib/planPdf";
import { MEAL_SHARE } from "../lib/profile";
import { useI18n } from "../i18n/useI18n";
import type { MealPlanEntry, PlanMeal } from "../types/mealPlan";
import type { Recipe } from "../types/recipe";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function MealPlannerPage() {
  const { t, language } = useI18n();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [entries, setEntries] = useState<MealPlanEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const dailyCalories = targets?.calories ?? null;

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([recipeApi.list(), nutritionApi.getTargets()]).then(([recipeResult, targetResult]) => {
      if (cancelled) return;
      if (recipeResult.status === "fulfilled") {
        setRecipes(recipeResult.value);
      } else {
        setRecipes([]);
        setLoadError(errorText(recipeResult.reason, t.common.genericError));
      }
      if (targetResult.status === "fulfilled") {
        const { calories, proteinGrams, carbsGrams, fatGrams } = targetResult.value;
        setTargets({ calories, proteinGrams, carbsGrams, fatGrams });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [t.common.genericError]);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    mealPlanApi
      .range(days[0], days[6])
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorText(error, t.common.genericError));
      });
    return () => {
      cancelled = true;
    };
  }, [days, t.common.genericError]);

  const recipesById = useMemo(() => new Map((recipes ?? []).map((recipe) => [recipe.id, recipe])), [recipes]);
  const entryBySlot = useMemo(
    () => new Map((entries ?? []).map((entry) => [slotKey(entry.date, entry.mealType), entry])),
    [entries],
  );

  async function chooseRecipe(date: string, meal: PlanMeal, recipeId: string) {
    const key = slotKey(date, meal);
    const existing = entryBySlot.get(key);
    setSavingSlot(key);
    setNotice(null);
    try {
      if (recipeId === "") {
        if (existing) {
          await mealPlanApi.clear(existing.id);
          setEntries((current) => (current ?? []).filter((entry) => entry.id !== existing.id));
        }
      } else {
        const saved = await mealPlanApi.set({ date, mealType: meal, recipeId });
        setEntries((current) => [...(current ?? []).filter((entry) => slotKey(entry.date, entry.mealType) !== key), saved]);
      }
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setSavingSlot(null);
    }
  }

  async function fillEmptyMeals() {
    if (!recipes || recipes.length === 0 || !targets || !entries) return;
    const planned = fillPlan(days, entries, recipes, targets);
    if (planned.length === 0) {
      setNotice({ tone: "ok", text: t.mealPlanner.fillNothing });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const saved = await Promise.all(planned.map((slot) => mealPlanApi.set({ ...slot })));
      const savedKeys = new Set(saved.map((entry) => slotKey(entry.date, entry.mealType)));
      setEntries((current) => [
        ...(current ?? []).filter((entry) => !savedKeys.has(slotKey(entry.date, entry.mealType))),
        ...saved,
      ]);
      setNotice({ tone: "ok", text: t.mealPlanner.fillDone.replace("{count}", String(saved.length)) });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setBusy(false);
    }
  }

  async function addPlanToShopping() {
    const needs = shoppingFromPlan(entries ?? [], recipesById);
    if (needs.length === 0) {
      setNotice({ tone: "error", text: t.mealPlanner.shoppingNothing });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await Promise.all(
        needs.map((need) =>
          shoppingApi.add({ name: need.name.slice(0, 100), quantity: `${need.grams} g`, category: "OTHER" }),
        ),
      );
      setNotice({ tone: "ok", text: t.mealPlanner.shoppingAdded.replace("{count}", String(needs.length)) });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setBusy(false);
    }
  }

  function downloadFile(parts: BlobPart[], type: string, fileName: string) {
    const url = URL.createObjectURL(new Blob(parts, { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /** Downloads the shown week as a CSV file. The byte-order mark makes Excel read the umlauts correctly. */
  function exportCsv() {
    const csv = planToCsv(days, entries ?? [], recipesById);
    if (csv === null) {
      setNotice({ tone: "error", text: t.mealPlanner.exportNothing });
      return;
    }
    downloadFile(["﻿" + csv], "text/csv;charset=utf-8", `meal-plan-${days[0]}.csv`);
    setNotice({ tone: "ok", text: t.mealPlanner.exportDone });
  }

  /** Downloads the shown week as an A4 PDF table. */
  function exportPdf() {
    const rows = planRows(days, entries ?? [], recipesById);
    if (rows.length === 0) {
      setNotice({ tone: "error", text: t.mealPlanner.exportNothing });
      return;
    }
    const title = `${t.mealPlanner.weekTitle}: ${weekRange}`;
    downloadFile([planToPdf(title, rows)], "application/pdf", `meal-plan-${days[0]}.pdf`);
    setNotice({ tone: "ok", text: t.mealPlanner.exportDone });
  }

  function shiftWeek(weeks: number) {
    setWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + weeks * 7));
  }

  const dateLocale = language === "de" ? "de-DE" : "en-GB";
  const weekRange = `${formatDay(days[0], dateLocale)} – ${formatDay(days[6], dateLocale)}`;
  const noRecipes = recipes !== null && recipes.length === 0;
  const canFill = !busy && !noRecipes && targets !== null && entries !== null;

  return (
    <AppShell
      title={t.mealPlanner.title}
      subtitle={t.mealPlanner.subtitle}
      actions={
        <>
          <button
            type="button"
            onClick={fillEmptyMeals}
            disabled={!canFill}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {t.mealPlanner.fill}
          </button>
          <button
            type="button"
            onClick={addPlanToShopping}
            disabled={busy || entries === null}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {t.mealPlanner.addToShopping}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={busy || entries === null}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {t.mealPlanner.exportCsv}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy || entries === null}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {t.mealPlanner.exportPdf}
          </button>
        </>
      }
    >
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mb-4 rounded-lg p-3 text-sm ${
            notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loadError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {noRecipes && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <p className="text-sm text-slate-600">{t.mealPlanner.noRecipes}</p>
          <Link
            to="/recipes"
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {t.mealPlanner.openRecipes}
          </Link>
        </section>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{t.mealPlanner.weekTitle}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{weekRange}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100"
            >
              {t.mealPlanner.previousWeek}
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100"
            >
              {t.mealPlanner.thisWeek}
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100"
            >
              {t.mealPlanner.nextWeek}
            </button>
          </div>
        </div>

        {entries === null && !loadError && <p className="mt-5 text-sm text-slate-600">{t.common.loading}</p>}

        {entries !== null && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {days.map((date) => {
              const dayEntries = (entries ?? []).filter((entry) => entry.date === date);
              const totals = dayTotals(dayEntries, recipesById);
              return (
                <div key={date} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold">{formatDay(date, dateLocale)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {dailyCalories !== null && totals.planned > 0
                      ? t.mealPlanner.dayTotal
                          .replace("{kcal}", String(Math.round(totals.calories)))
                          .replace("{target}", String(dailyCalories))
                      : t.mealPlanner.slotKcal.replace("{kcal}", String(Math.round(totals.calories)))}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {PLAN_MEALS.map((meal) => {
                      const key = slotKey(date, meal);
                      const entry = entryBySlot.get(key);
                      const recipe = entry ? recipesById.get(entry.recipeId) : undefined;
                      const mealLabel = t.mealPlanner.meals[meal];
                      return (
                        <li key={meal} className="rounded-lg border border-slate-200 bg-white p-2">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] font-medium text-slate-500">{mealLabel}</p>
                            {targets !== null && (
                              <p className="text-[10px] text-slate-400">
                                {t.mealPlanner.slotTarget.replace("{kcal}", String(mealTargets(targets, meal).calories))}
                              </p>
                            )}
                          </div>
                          <select
                            aria-label={`${formatDay(date, dateLocale)} ${mealLabel}`}
                            value={entry?.recipeId ?? ""}
                            disabled={savingSlot === key || busy || noRecipes}
                            onChange={(event) => chooseRecipe(date, meal, event.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs disabled:opacity-60"
                          >
                            <option value="">{t.mealPlanner.chooseRecipe}</option>
                            {(recipes ?? []).map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                          {recipe && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              {t.mealPlanner.slotKcal.replace("{kcal}", String(recipe.perServing.calories))}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MealTargetsCard targets={targets} />
        <Link to="/generate-plan" className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 hover:ring-emerald-500">
          <h2 className="font-semibold">{t.mealPlanner.wizardTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">{t.mealPlanner.wizardText}</p>
        </Link>
      </div>
    </AppShell>
  );
}

function formatDay(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

function MealTargetsCard({ targets }: { targets: DailyTargets | null }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.mealPlanner.targetsTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.mealPlanner.targetsText}</p>
      {targets === null ? (
        <p className="mt-4 text-sm text-slate-500">{t.mealPlanner.noTargets}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {PLAN_MEALS.map((meal) => {
            const share = mealTargets(targets, meal);
            return (
              <li key={meal} className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium text-slate-700">{t.mealPlanner.meals[meal]}</span>
                <span className="text-right text-xs text-slate-500">
                  <span className="block font-semibold text-slate-700">
                    {t.mealPlanner.slotKcal.replace("{kcal}", String(share.calories))}
                  </span>
                  <span className="block">
                    {t.mealPlanner.macrosLine
                      .replace("{protein}", String(share.proteinGrams))
                      .replace("{carbs}", String(share.carbsGrams))
                      .replace("{fat}", String(share.fatGrams))}
                  </span>
                  {t.mealPlanner.shareLabel.replace("{share}", String(Math.round(MEAL_SHARE[meal] * 100)))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

