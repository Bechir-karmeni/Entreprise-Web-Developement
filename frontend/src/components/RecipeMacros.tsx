import { useEffect, useState } from "react";
import { authedRequest } from "../api/authedRequest";
import { foodApi } from "../api/foodApi";
import { ApiError } from "../api/http";
import { notifyFoodLogChanged } from "../lib/foodEvents";
import { defaultMealFor, localDateIso } from "../lib/foodLog";
import { useI18n } from "../i18n/useI18n";

interface MacrosResponse {
  matchedName: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

/** Calories and macros per serving from Recipe API, matched by exact recipe name. Shows nothing if the lookup fails. */
export default function RecipeMacros({ name }: { name: string }) {
  const { t } = useI18n();
  const m = t.recipeMacros;
  const [result, setResult] = useState<MacrosResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logNotice, setLogNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    setFailed(false);
    authedRequest<MacrosResponse>(`/nutrition/macros?name=${encodeURIComponent(name)}`)
      .then((loaded) => {
        if (active) setResult(loaded);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [name]);

  async function logServing() {
    if (!result?.matchedName) return;
    setLogging(true);
    setLogNotice(null);
    const now = new Date();
    try {
      await foodApi.addQuickEntry({
        mealType: defaultMealFor(now.getHours()),
        date: localDateIso(now),
        name: result.matchedName,
        calories: result.calories ?? 0,
        proteinGrams: result.proteinG ?? 0,
        carbsGrams: result.carbsG ?? 0,
        fatGrams: result.fatG ?? 0,
        fiberGrams: 0,
      });
      notifyFoodLogChanged();
      setLogNotice(m.logged);
    } catch (error) {
      setLogNotice(error instanceof ApiError ? error.message : t.common.genericError);
    } finally {
      setLogging(false);
    }
  }

  if (failed) return null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="font-semibold">{m.title}</h2>
      {!result && <p className="mt-2 text-sm text-slate-500">{t.common.loading}</p>}
      {result && result.matchedName === null && <p className="mt-2 text-sm text-slate-500">{m.noMatch}</p>}
      {result && result.matchedName !== null && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label={m.calories} value={result.calories} unit="kcal" />
            <Stat label={m.protein} value={result.proteinG} unit="g" />
            <Stat label={m.carbs} value={result.carbsG} unit="g" />
            <Stat label={m.fat} value={result.fatG} unit="g" />
          </dl>
          <p className="mt-3 text-xs text-slate-500">{m.note.replace("{name}", result.matchedName)}</p>
          <button
            type="button"
            onClick={logServing}
            disabled={logging || result.calories === null}
            className="mt-3 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {logging ? t.common.loading : m.logServing}
          </button>
          {logNotice && <p role="status" className="mt-2 text-xs text-slate-600">{logNotice}</p>}
        </>
      )}
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value === null ? "–" : `${Math.round(value * 10) / 10} ${unit}`}</dd>
    </div>
  );
}
