import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { recipeApi } from "../api/recipeApi";
import { logRecipePortions } from "../lib/recipeTracking";
import { useI18n } from "../i18n/useI18n";
import type { Recipe } from "../types/recipe";

const MAX_PORTIONS = 8;

interface Notice {
  tone: "ok" | "error";
  text: string;
}

export default function RecipeDetailPage() {
  const { t } = useI18n();
  const { id = "" } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [portions, setPortions] = useState(1);
  const [tracking, setTracking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    setRecipe(null);
    setLoadError(null);
    recipeApi
      .get(id)
      .then((loaded) => {
        if (active) setRecipe(loaded);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof ApiError ? error.message : t.recipeDetail.notFound);
      });
    return () => {
      active = false;
    };
  }, [id, t.recipeDetail.notFound]);

  async function track() {
    if (!recipe) return;
    setTracking(true);
    setNotice(null);
    try {
      await logRecipePortions(recipe, portions);
      setNotice({ tone: "ok", text: t.recipes.trackedDone.replace("{name}", recipe.name) });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : t.common.genericError });
    } finally {
      setTracking(false);
    }
  }

  const tagLabels = t.recipes.tags as Record<string, string>;
  const nutrition: [string, number][] = recipe
    ? [
        [t.recipes.nutrients.protein, recipe.perServing.proteinGrams],
        [t.recipes.nutrients.carbs, recipe.perServing.carbsGrams],
        [t.recipes.nutrients.fat, recipe.perServing.fatGrams],
        [t.recipes.nutrients.fiber, recipe.perServing.fiberGrams],
      ]
    : [];

  return (
    <AppShell
      title={recipe?.name ?? t.recipeDetail.title}
      subtitle={recipe?.description}
      actions={
        <>
          <SoonButton label={t.recipes.plan} />
          <SoonButton label={t.recipes.favorite} />
          {recipe && (
            <button
              type="button"
              onClick={track}
              disabled={tracking}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {t.recipeDetail.trackFor.replace("{count}", String(portions))}
            </button>
          )}
        </>
      }
    >
      <Link to="/recipes" className="text-sm font-medium text-emerald-700 hover:underline">
        ← {t.recipeDetail.back}
      </Link>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg p-3 text-sm ${
            notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loadError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {!recipe && !loadError && <p className="mt-4 text-sm text-slate-600">{t.common.loading}</p>}

      {recipe && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-2xl bg-emerald-900 p-6 text-white shadow-sm">
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
                    {tagLabels[tag] ?? tag}
                  </span>
                ))}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-emerald-200">{t.recipes.timeLabel}</dt>
                  <dd className="text-lg font-semibold">{t.recipes.prepMinutes.replace("{minutes}", String(recipe.prepMinutes))}</dd>
                </div>
                <div>
                  <dt className="text-emerald-200">{t.recipeDetail.servesLabel}</dt>
                  <dd className="text-lg font-semibold">{recipe.servings}</dd>
                </div>
                <div>
                  <dt className="text-emerald-200">{t.recipes.kcalLabel}</dt>
                  <dd className="text-lg font-semibold">{recipe.perServing.calories}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{t.recipes.steps}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
                  {t.recipeDetail.timersTitle}{" "}
                  <span className="text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
                </span>
              </div>
              <ol className="mt-4 space-y-4">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-sm text-slate-700">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <SoonCard title={t.recipeDetail.alternativesTitle} text={t.recipeDetail.alternativesText} />
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <h2 className="font-semibold">{t.recipes.perServing}</h2>
              <p className="mt-2 text-3xl font-bold">
                {recipe.perServing.calories}{" "}
                <span className="text-sm font-normal text-slate-500">{t.recipes.kcalLabel}</span>
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                {nutrition.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t.recipes.ingredients}</h2>
                <div className="flex items-center gap-2" role="group" aria-label={t.recipeDetail.portionsLabel}>
                  <button
                    type="button"
                    aria-label={t.recipeDetail.fewer}
                    disabled={portions <= 1}
                    onClick={() => setPortions((current) => Math.max(1, current - 1))}
                    className="h-7 w-7 rounded-full border border-slate-300 text-sm disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[5rem] text-center text-sm font-semibold">
                    {t.recipeDetail.portionsCount.replace("{count}", String(portions))}
                  </span>
                  <button
                    type="button"
                    aria-label={t.recipeDetail.more}
                    disabled={portions >= MAX_PORTIONS}
                    onClick={() => setPortions((current) => Math.min(MAX_PORTIONS, current + 1))}
                    className="h-7 w-7 rounded-full border border-slate-300 text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {recipe.ingredients.map((item, index) => (
                  <li key={`${item.foodId}-${index}`} className="flex justify-between gap-3 py-2">
                    <span>{item.foodName}</span>
                    <span className="whitespace-nowrap text-slate-500">
                      {t.recipes.grams.replace("{grams}", String(Math.round((item.grams / recipe.servings) * portions)))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                {t.recipeDetail.totalKcal.replace("{kcal}", String(recipe.perServing.calories * portions))}
              </p>
            </section>

            <SoonCard title={t.recipeDetail.micronutrientsTitle} text={t.recipeDetail.micronutrientsText} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SoonBadge() {
  const { t } = useI18n();
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t.common.comingSoon}</span>;
}

function SoonButton({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <button type="button" disabled className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </button>
  );
}

function SoonCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <SoonBadge />
      </div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </section>
  );
}
