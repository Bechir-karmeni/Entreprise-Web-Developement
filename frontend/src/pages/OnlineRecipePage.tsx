import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { onlineRecipeApi } from "../api/onlineRecipeApi";
import { useI18n } from "../i18n/useI18n";
import RecipeMacros from "../components/RecipeMacros";
import type { OnlineRecipe } from "../types/onlineRecipe";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function OnlineRecipePage() {
  const { t } = useI18n();
  const o = t.onlineRecipes;
  const { id = "" } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const validId = Number.isInteger(recipeId) && recipeId > 0;
  const [recipe, setRecipe] = useState<OnlineRecipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!validId) {
      setLoadError(o.notFound);
      return;
    }
    let active = true;
    onlineRecipeApi
      .detail(recipeId)
      .then((loaded) => {
        if (active) {
          setRecipe(loaded);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorText(error, o.notFound));
      });
    return () => {
      active = false;
    };
  }, [recipeId, validId, o.notFound]);

  useEffect(() => {
    if (!validId) return;
    onlineRecipeApi
      .saved()
      .then((list) => setIsSaved(list.some((entry) => entry.recipe.id === recipeId)))
      .catch(() => setIsSaved(false));
  }, [recipeId, validId]);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      await onlineRecipeApi.save(recipeId);
      setIsSaved(true);
      setNotice({ tone: "ok", text: o.savedNotice.replace("{name}", recipe?.name ?? "") });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setSaving(false);
    }
  }

  async function addToShopping(indexes?: number[]) {
    setAdding(true);
    setNotice(null);
    try {
      const added = await onlineRecipeApi.addToShopping(recipeId, indexes);
      setNotice({ tone: "ok", text: o.addedToShopping.replace("{count}", String(added.length)) });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setAdding(false);
    }
  }

  return (
    <AppShell title={recipe?.name ?? o.title} subtitle={[recipe?.area, recipe?.category].filter(Boolean).join(" · ") || undefined}>
      <Link to="/recipes" className="text-sm font-medium text-emerald-700 hover:underline">← {o.back}</Link>

      {notice && (
        <p role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {notice.text}
        </p>
      )}
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
      {!recipe && !loadError && <p className="mt-4 text-sm text-slate-600">{t.common.loading}</p>}

      {recipe && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {recipe.thumbnail && (
              <img src={recipe.thumbnail} alt={recipe.name} className="w-full rounded-2xl object-cover shadow-sm" />
            )}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <h2 className="font-semibold">{o.instructions}</h2>
              <ol className="mt-4 space-y-4">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-sm text-slate-700">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {recipe.youtube && (
                  <a href={recipe.youtube} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline">
                    {o.watchVideo}
                  </a>
                )}
                {recipe.source && (
                  <a href={recipe.source} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline">
                    {o.originalRecipe}
                  </a>
                )}
              </div>
              <p className="mt-6 text-xs text-slate-400">{o.source}</p>
            </section>
          </div>

          <div className="space-y-4">
            <RecipeMacros name={recipe.name} />
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <h2 className="font-semibold">{o.ingredients}</h2>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {recipe.ingredients.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 py-2">
                    <span>{item.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="whitespace-nowrap text-slate-500">{item.measure}</span>
                      <button type="button" aria-label={`${o.addOne}: ${item.name}`} disabled={adding}
                        onClick={() => addToShopping([index])}
                        className="rounded-full border border-emerald-700 px-2.5 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
                        + {o.addOne}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => addToShopping()} disabled={adding || recipe.ingredients.length === 0}
                className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {o.addAll}
              </button>
            </section>

            <button type="button" onClick={save} disabled={isSaved || saving}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50">
              {isSaved ? o.saved : o.saveToMine}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
