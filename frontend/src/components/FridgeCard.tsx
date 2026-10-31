import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/http";
import { fridgeApi, recommendationApi } from "../api/recommendationApi";
import { useI18n } from "../i18n/useI18n";
import type { FridgeItem, FridgeRecommendation } from "../types/recommendation";

const FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function FridgeCard() {
  const { t } = useI18n();
  const f = t.fridge;
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [result, setResult] = useState<FridgeRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    fridgeApi
      .list()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setNotice(null);
    try {
      const item = await fridgeApi.add(trimmed);
      setItems((current) =>
        current.some((existing) => existing.id === item.id)
          ? current
          : [...current, item].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setName("");
      setResult(null);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    }
  }

  async function remove(item: FridgeItem) {
    setNotice(null);
    try {
      await fridgeApi.remove(item.id);
      setItems((current) => current.filter((existing) => existing.id !== item.id));
      setResult(null);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    }
  }

  async function find() {
    setBusy(true);
    setNotice(null);
    try {
      setResult(await recommendationApi.fromFridge());
    } catch (error) {
      setResult(null);
      setNotice({ tone: "error", text: errorText(error, t.common.genericError) });
    } finally {
      setBusy(false);
    }
  }

  const none = result !== null && result.ownRecipes.length === 0 && result.onlineRecipes.length === 0;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{f.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{f.text}</p>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input type="text" value={name} maxLength={100} placeholder={f.placeholder} aria-label={f.placeholder}
          onChange={(event) => setName(event.target.value)} className={FIELD} />
        <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          {f.add}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{f.empty}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1 text-sm text-emerald-900">
              {item.name}
              <button type="button" aria-label={`${f.remove}: ${item.name}`} onClick={() => remove(item)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-100">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={find} disabled={busy || items.length === 0}
        className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
        {f.find}
      </button>

      {notice && (
        <p role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-3 rounded-lg p-3 text-sm ${notice.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {notice.text}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          {none && <p className="text-sm text-slate-500">{f.none}</p>}
          {result.ownRecipes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{f.ownTitle}</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {result.ownRecipes.map((match) => (
                  <li key={match.recipe.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/recipes/${match.recipe.id}`} className="font-medium text-emerald-800 hover:underline">{match.recipe.name}</Link>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {f.matchedOwn.replace("{matched}", String(match.matchedIngredients)).replace("{total}", String(match.totalIngredients))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.onlineRecipes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{f.onlineTitle}</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {result.onlineRecipes.map((match) => (
                  <li key={match.recipe.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/recipes/online/${match.recipe.id}`} className="font-medium text-emerald-800 hover:underline">{match.recipe.name}</Link>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {f.matchedOnline.replace("{matched}", String(match.matchedItems))}
                    </span>
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
