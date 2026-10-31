import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { profileApi } from "../api/profileApi";
import { recipeApi } from "../api/recipeApi";
import OnlineRecipesSection from "../components/OnlineRecipesSection";
import PromptRecommendations from "../components/PromptRecommendations";
import FridgeCard from "../components/FridgeCard";
import PantryScanner from "../components/PantryScanner";
import { fitsGoal, type Goal } from "../lib/recipeFit";
import { logRecipePortions } from "../lib/recipeTracking";
import { useI18n } from "../i18n/useI18n";
import type { Recipe } from "../types/recipe";

type Filter = "ALL" | "HIGH_PROTEIN" | "QUICK" | "VEGETARIAN" | "ALLERGEN_FREE" | "PERSONALISED";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function matchesFilter(recipe: Recipe, filter: Filter, goal: Goal | null): boolean {
  switch (filter) {
    case "HIGH_PROTEIN":
      return recipe.tags.includes("HIGH_PROTEIN");
    case "VEGETARIAN":
      return recipe.tags.includes("VEGETARIAN");
    case "QUICK":
      return recipe.prepMinutes <= 21;
    case "ALLERGEN_FREE":
      // Only a recipe whose ingredients all have allergen data, and none of them lists an allergen.
      return recipe.allergensKnown && recipe.allergens.length === 0;
    case "PERSONALISED":
      return goal !== null && fitsGoal(recipe, goal);
    default:
      return true;
  }
}

export default function RecipesPage() {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The profile goal drives the "Personalised" filter. Null when there is no profile.
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    recipeApi
      .list()
      .then(setRecipes)
      .catch((error: unknown) => setLoadError(errorText(error, t.common.genericError)));
    profileApi
      .get()
      .then((profile) => setGoal(profile.goal))
      .catch(() => setGoal(null));
  }, [t.common.genericError]);

  async function trackOnePortion(recipe: Recipe) {
    setTrackingId(recipe.id);
    setNotice(null);
    try {
      await logRecipePortions(recipe, 1);
      setNotice({ tone: "ok", text: t.recipes.trackedDone.replace("{name}", recipe.name) });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setTrackingId(null);
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "ALL", label: t.recipes.filterAll },
    { key: "HIGH_PROTEIN", label: t.recipes.filterHighProtein },
    { key: "QUICK", label: t.recipes.filterQuick },
    { key: "VEGETARIAN", label: t.recipes.filterVegetarian },
    { key: "PERSONALISED", label: t.recipes.filterPersonalised },
    { key: "ALLERGEN_FREE", label: t.recipes.filterAllergenFree },
  ];

  const list = recipes ?? [];
  const visible = list.filter((recipe) => matchesFilter(recipe, filter, goal));

  return (
    <AppShell title={t.recipes.title} subtitle={t.recipes.subtitle}>
      <PantryScanner />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t.recipes.filterLabel}>
        {filters.map((option) => {
          const active = filter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? "bg-emerald-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

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
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {recipes === null && !loadError && <p className="text-sm text-slate-600">{t.common.loading}</p>}

      {recipes !== null && (
        <>
          {visible.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              {filter === "PERSONALISED" && goal === null ? t.recipes.personalisedNoProfile : t.recipes.empty}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  busy={trackingId === recipe.id}
                  onTrack={() => trackOnePortion(recipe)}
                />
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CollectionsCard recipes={list} goal={goal} onSelect={setFilter} />
            <PromptRecommendations />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FridgeCard />
          </div>
        </>
      )}
      <div className="mt-8">
        <OnlineRecipesSection />
      </div>
    </AppShell>
  );
}

function RecipeCard({ recipe, busy, onTrack }: { recipe: Recipe; busy: boolean; onTrack: () => void }) {
  const { t } = useI18n();
  const tagLabels = t.recipes.tags as Record<string, string>;
  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex flex-wrap gap-1.5">
        {recipe.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            {tagLabels[tag] ?? tag}
          </span>
        ))}
      </div>
      <h3 className="mt-3 font-semibold">{recipe.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{recipe.description}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-sm">
        <div>
          <dt className="text-xs text-slate-500">{t.recipes.timeLabel}</dt>
          <dd className="font-semibold">{t.recipes.prepMinutes.replace("{minutes}", String(recipe.prepMinutes))}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t.recipes.kcalLabel}</dt>
          <dd className="font-semibold">{recipe.perServing.calories}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t.recipes.macrosLabel}</dt>
          <dd className="font-semibold">
            {`${recipe.perServing.proteinGrams} / ${recipe.perServing.carbsGrams} / ${recipe.perServing.fatGrams}`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/recipes/${recipe.id}`}
          className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-800"
        >
          {t.recipes.viewRecipe}
        </Link>
        <button
          type="button"
          onClick={onTrack}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {t.recipes.track}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <SoonChip label={t.recipes.plan} />
        <SoonChip label={t.recipes.favorite} />
      </div>
    </article>
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

/** Recipes grouped by time and tags. Showing a collection applies the same filter as the buttons above. */
function CollectionsCard({
  recipes,
  goal,
  onSelect,
}: {
  recipes: Recipe[];
  goal: Goal | null;
  onSelect: (filter: Filter) => void;
}) {
  const { t } = useI18n();
  const collections: { key: Filter; label: string }[] = [
    { key: "QUICK", label: t.recipes.filterQuick },
    { key: "HIGH_PROTEIN", label: t.recipes.filterHighProtein },
    { key: "VEGETARIAN", label: t.recipes.filterVegetarian },
  ];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{t.recipes.collectionsTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{t.recipes.collectionsText}</p>
      <ul className="mt-4 divide-y divide-slate-100">
        {collections.map((collection) => {
          const count = recipes.filter((recipe) => matchesFilter(recipe, collection.key, goal)).length;
          return (
            <li key={collection.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{collection.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{t.recipes.collectionCount.replace("{count}", String(count))}</span>
                <button
                  type="button"
                  onClick={() => onSelect(collection.key)}
                  disabled={count === 0}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  {t.recipes.collectionShow}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
