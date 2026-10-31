import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/http";
import { onlineRecipeApi, type OnlineRecipeFilterValues } from "../api/onlineRecipeApi";
import { useI18n } from "../i18n/useI18n";
import type { OnlineRecipe, OnlineRecipeOptions, OnlineRecipePage, SavedOnlineRecipe } from "../types/onlineRecipe";

const NO_FILTERS: OnlineRecipeFilterValues = { search: "", category: "", area: "" };
const CLASSES = ["ALL", "HIGH_PROTEIN", "QUICK", "VEGETARIAN", "PERSONALISED", "ALLERGEN_FREE"];
const FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]";
const BUTTON = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function isVegetarian(recipe: OnlineRecipe): boolean {
  const category = recipe.category?.toLowerCase();
  return category === "vegetarian" || category === "vegan";
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function OnlineRecipesSection() {
  const { t } = useI18n();
  const o = t.onlineRecipes;
  const [draft, setDraft] = useState<OnlineRecipeFilterValues>(NO_FILTERS);
  const [applied, setApplied] = useState<OnlineRecipeFilterValues>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<OnlineRecipePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<OnlineRecipeOptions>({ categories: [], areas: [] });
  const [saved, setSaved] = useState<SavedOnlineRecipe[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [randomPick, setRandomPick] = useState<OnlineRecipe | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [classFilter, setClassFilter] = useState("ALL");
  const [aiText, setAiText] = useState("");
  const [aiRecipes, setAiRecipes] = useState<OnlineRecipe[] | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const hasQuery = applied.search !== "" || applied.category !== "" || applied.area !== "";

  useEffect(() => {
    if (!hasQuery) {
      setResults(null);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    onlineRecipeApi
      .search(applied, page)
      .then((data) => {
        if (active) setResults(data);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorText(error, t.common.genericError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied, page, hasQuery, t.common.genericError]);

  useEffect(() => {
    onlineRecipeApi
      .options()
      .then(setOptions)
      .catch(() => setOptions({ categories: [], areas: [] }));
    onlineRecipeApi
      .saved()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setRandomPick(null);
    setNotice(null);
    setPage(1);
    const search = draft.search.trim();
    // A name search takes priority, so the category and area are cleared to keep the form honest.
    setApplied(search ? { search, category: "", area: "" } : { ...draft, search: "" });
    if (!search && !draft.category && !draft.area) {
      setNotice({ tone: "error", text: o.emptyHint });
    }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    const request = aiText.trim();
    if (!request) return;
    setAiBusy(true);
    setAiError(null);
    try {
      setAiRecipes(await onlineRecipeApi.generate(request));
    } catch (error) {
      setAiRecipes(null);
      setAiError(errorText(error, t.common.genericError));
    } finally {
      setAiBusy(false);
    }
  }

  async function surprise() {
    setNotice(null);
    try {
      setRandomPick(await onlineRecipeApi.random());
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    }
  }

  async function save(recipe: OnlineRecipe) {
    setSavingId(recipe.id);
    setNotice(null);
    try {
      const entry = await onlineRecipeApi.save(recipe.id);
      setSaved((current) =>
        [...current.filter((item) => item.recipe.id !== recipe.id), entry].sort((a, b) =>
          a.recipe.name.localeCompare(b.recipe.name),
        ),
      );
      setNotice({ tone: "ok", text: o.savedNotice.replace("{name}", recipe.name) });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setSavingId(null);
    }
  }

  async function remove(entry: SavedOnlineRecipe) {
    setNotice(null);
    try {
      await onlineRecipeApi.remove(entry.id);
      setSaved((current) => current.filter((item) => item.id !== entry.id));
      setNotice({ tone: "ok", text: o.removedNotice });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    }
  }

  const savedIds = new Set(saved.map((entry) => entry.recipe.id));
  // Only vegetarian can be checked for online recipes: TheMealDB has no nutrition, time or allergen data.
  const visibleItems = results
    ? results.items.filter((recipe) => classFilter !== "VEGETARIAN" || isVegetarian(recipe))
    : [];
  const classLabels: Record<string, string> = {
    ALL: t.recipes.filterAll,
    HIGH_PROTEIN: t.recipes.filterHighProtein,
    QUICK: t.recipes.filterQuick,
    VEGETARIAN: t.recipes.filterVegetarian,
    PERSONALISED: t.recipes.filterPersonalised,
    ALLERGEN_FREE: t.recipes.filterAllergenFree,
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{o.title}</h2>
        <p className="text-sm text-slate-500">{o.subtitle}</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:grid-cols-3">
        <input
          type="search"
          value={draft.search}
          onChange={(event) => setDraft({ ...draft, search: event.target.value })}
          placeholder={o.searchPlaceholder}
          aria-label={o.searchLabel}
          maxLength={100}
          className={`${FIELD} md:col-span-3`}
        />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">{o.category}</span>
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={FIELD}>
            <option value="">{o.any}</option>
            {options.categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">{o.area}</span>
          <select value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} className={FIELD}>
            <option value="">{o.any}</option>
            {options.areas.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <p className="self-end text-xs text-slate-500">{o.searchWins}</p>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <button type="submit" className={`${BUTTON} bg-emerald-700 text-white hover:bg-emerald-800`}>
            {o.apply}
          </button>
          <button type="button" onClick={surprise} className={`${BUTTON} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
            {o.surprise}
          </button>
        </div>
      </form>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div>
          <h3 className="font-semibold">{o.aiTitle}</h3>
          <p className="text-sm text-slate-500">{o.aiSubtitle}</p>
        </div>
        <form onSubmit={generate} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={aiText}
            onChange={(event) => setAiText(event.target.value)}
            placeholder={o.aiPlaceholder}
            aria-label={o.aiTitle}
            maxLength={300}
            className={`${FIELD} sm:flex-1`}
          />
          <button
            type="submit"
            disabled={aiBusy || aiText.trim() === ""}
            className={`${BUTTON} bg-emerald-700 text-white hover:bg-emerald-800`}
          >
            {aiBusy ? o.aiBusy : o.aiGenerate}
          </button>
        </form>
        {aiError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{aiError}</p>}
        {aiRecipes && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aiRecipes.map((recipe) => (
              <RecipeTile
                key={recipe.id}
                recipe={recipe}
                isSaved={savedIds.has(recipe.id)}
                busy={savingId === recipe.id}
                onSave={() => save(recipe)}
              />
            ))}
          </div>
        )}
      </section>

      {notice && (
        <p role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t.recipes.filterLabel}>
        {CLASSES.map((key) => {
          const supported = key === "ALL" || key === "VEGETARIAN";
          const active = classFilter === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!supported}
              aria-pressed={active}
              title={supported ? undefined : t.recommendations.classNotAvailable}
              onClick={() => setClassFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
                active ? "bg-emerald-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {classLabels[key]}
            </button>
          );
        })}
      </div>
      <p className="-mt-2 text-xs text-slate-500">{t.recommendations.classNotAvailable}</p>

      {randomPick && (
        <article className="flex flex-col gap-4 rounded-2xl bg-emerald-900 p-5 text-white shadow-sm sm:flex-row">
          {randomPick.thumbnail && (
            <img src={randomPick.thumbnail} alt="" loading="lazy" className="h-32 w-32 rounded-xl object-cover" />
          )}
          <div>
            <p className="text-xs font-medium uppercase text-emerald-200">{o.randomTitle}</p>
            <h3 className="mt-1 text-lg font-semibold">{randomPick.name}</h3>
            <p className="mt-1 text-sm text-emerald-100">{[randomPick.area, randomPick.category].filter(Boolean).join(" · ")}</p>
            <Link to={`/recipes/online/${randomPick.id}`} className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-900">
              {o.view}
            </Link>
          </div>
        </article>
      )}

      {loadError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

      {!hasQuery && <p className="text-sm text-slate-500">{o.startHint}</p>}
      {hasQuery && loading && !results && <p className="text-sm text-slate-600">{t.common.loading}</p>}

      {hasQuery && results && (
        <>
          {visibleItems.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">{o.empty}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((recipe) => (
                <RecipeTile
                  key={recipe.id}
                  recipe={recipe}
                  isSaved={savedIds.has(recipe.id)}
                  busy={savingId === recipe.id}
                  onSave={() => save(recipe)}
                />
              ))}
            </div>
          )}
          {results.lastPage > 1 && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50">
                {o.previous}
              </button>
              <span className="text-slate-500">{o.pageOf.replace("{page}", String(results.page)).replace("{last}", String(results.lastPage))}</span>
              <button type="button" disabled={page >= results.lastPage || loading} onClick={() => setPage(page + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50">
                {o.next}
              </button>
            </div>
          )}
        </>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h3 className="font-semibold">{o.savedTitle}</h3>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{o.savedEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {saved.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                <Link to={`/recipes/online/${entry.recipe.id}`} className="font-medium text-emerald-800 hover:underline">
                  {entry.recipe.name}
                </Link>
                <button type="button" onClick={() => remove(entry)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100">
                  {o.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function RecipeTile({
  recipe,
  isSaved,
  busy,
  onSave,
}: {
  recipe: OnlineRecipe;
  isSaved: boolean;
  busy: boolean;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const o = t.onlineRecipes;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {recipe.thumbnail && (
        <img src={recipe.thumbnail} alt="" loading="lazy" className="h-40 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold">{recipe.name}</h3>
        {(recipe.area || recipe.category) && (
          <p className="mt-1 text-xs text-slate-500">{[recipe.area, recipe.category].filter(Boolean).join(" · ")}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Link to={`/recipes/online/${recipe.id}`}
            className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-800">
            {o.view}
          </Link>
          <button type="button" onClick={onSave} disabled={isSaved || busy}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">
            {isSaved ? o.saved : o.save}
          </button>
        </div>
      </div>
    </article>
  );
}
