import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/http";
import { recommendationApi } from "../api/recommendationApi";
import { useI18n } from "../i18n/useI18n";
import type { PromptRecommendation } from "../types/recommendation";

const FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]";

export default function PromptRecommendations() {
  const { t } = useI18n();
  const r = t.recommendations;
  const [text, setText] = useState("");
  const [result, setResult] = useState<PromptRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError(r.tooShort);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await recommendationApi.fromPrompt(trimmed));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof ApiError ? caught.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  const tagLabels: Record<string, string> = {
    HIGH_PROTEIN: t.recipes.filterHighProtein,
    QUICK: t.recipes.filterQuick,
    VEGETARIAN: t.recipes.filterVegetarian,
    ALLERGEN_FREE: t.recipes.filterAllergenFree,
  };
  const none = result !== null && result.ownRecipes.length === 0 && result.onlineRecipes.length === 0;

  return (
    <section className="rounded-2xl bg-emerald-900 p-5 text-white shadow-sm">
      <h2 className="font-semibold">{r.promptTitle}</h2>
      <p className="mt-2 text-sm text-emerald-100">{r.promptText}</p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">{r.promptLabel}</span>
          <input type="text" value={text} maxLength={200} placeholder={r.promptPlaceholder}
            onChange={(event) => setText(event.target.value)} className={FIELD} />
        </label>
        <button type="submit" disabled={busy}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50">
          {r.submit}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {busy && <p className="mt-3 text-sm text-emerald-100">{t.common.loading}</p>}

      {result && !busy && (
        <div className="mt-4 space-y-4 rounded-xl bg-white p-4 text-slate-800">
          {(result.tags.length > 0 || result.keywords.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-500">{r.tagsUsed}:</span>
              {result.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                  {tagLabels[tag] ?? tag}
                </span>
              ))}
              {result.keywords.length > 0 && <span className="font-medium text-slate-500">{r.keywordsUsed}: {result.keywords.join(", ")}</span>}
            </div>
          )}

          {none && <p className="text-sm text-slate-500">{r.none}</p>}

          {result.ownRecipes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{r.ownTitle}</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {result.ownRecipes.map((recipe) => (
                  <li key={recipe.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/recipes/${recipe.id}`} className="font-medium text-emerald-800 hover:underline">{recipe.name}</Link>
                    <span className="text-xs text-slate-500">{recipe.prepMinutes} min · {recipe.perServing.calories} kcal</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.onlineRecipes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{r.onlineTitle}</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {result.onlineRecipes.map((recipe) => (
                  <li key={recipe.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/recipes/online/${recipe.id}`} className="font-medium text-emerald-800 hover:underline">{recipe.name}</Link>
                    <span className="text-xs text-slate-500">{[recipe.area, recipe.category].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
