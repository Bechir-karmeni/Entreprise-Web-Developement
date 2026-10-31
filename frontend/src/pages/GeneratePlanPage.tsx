import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { mealPlanApi } from "../api/mealPlanApi";
import { nutritionApi } from "../api/nutritionApi";
import { recipeApi } from "../api/recipeApi";
import { fillPlan } from "../lib/mealPlan";
import { DEFAULT_PREFERENCES, filterRecipes, mealsFor, nextDays } from "../lib/planPreferences";
import { useI18n } from "../i18n/useI18n";
import type { DairyChoice, MealPlanPreferences } from "../types/mealPlan";

const PLAN_DAYS = 7;

interface Notice {
  tone: "ok" | "error";
  text: string;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function GeneratePlanPage() {
  const { t } = useI18n();
  const g = t.generatePlan;
  const [prefs, setPrefs] = useState<MealPlanPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "generate" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [planned, setPlanned] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mealPlanApi
      .preferences()
      .then((saved) => {
        if (!cancelled) setPrefs(saved);
      })
      .catch(() => {
        // Keep the defaults when the answers cannot be loaded.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof MealPlanPreferences>(key: K, value: MealPlanPreferences[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  async function saveAnswers(): Promise<MealPlanPreferences> {
    const saved = await mealPlanApi.savePreferences(prefs);
    setPrefs(saved);
    return saved;
  }

  async function onSave() {
    setBusy("save");
    setNotice(null);
    try {
      await saveAnswers();
      setNotice({ tone: "ok", text: g.saved });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, g.saveFailed) });
    } finally {
      setBusy(null);
    }
  }

  async function onGenerate() {
    setBusy("generate");
    setNotice(null);
    setPlanned(false);
    try {
      const answers = await saveAnswers();
      const days = nextDays(new Date(), PLAN_DAYS);
      const [recipes, targets, entries] = await Promise.all([
        recipeApi.list(),
        nutritionApi.getTargets(),
        mealPlanApi.range(days[0], days[PLAN_DAYS - 1]),
      ]);
      const allowed = filterRecipes(recipes, answers);
      if (allowed.length === 0) {
        setNotice({ tone: "error", text: g.noRecipes });
        return;
      }
      const slots = fillPlan(days, entries, allowed, targets, mealsFor(answers.mealsPerDay));
      if (slots.length === 0) {
        setNotice({ tone: "ok", text: g.nothingToAdd });
        return;
      }
      await Promise.all(slots.map((slot) => mealPlanApi.set({ ...slot })));
      setNotice({ tone: "ok", text: g.done.replace("{count}", String(slots.length)) });
      setPlanned(true);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, g.generateFailed) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell title={g.title} subtitle={g.subtitle}>
      <div className="mb-4">
        <Link to="/dashboard" className="text-sm font-medium text-emerald-800 hover:underline">
          ← {g.back}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">…</p>
      ) : (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="grid gap-5 sm:grid-cols-2">
            <YesNo label={g.vegetarian} value={prefs.vegetarian} onChange={(v) => update("vegetarian", v)} yes={g.yes} no={g.no} />

            <Field label={g.dairy}>
              <select
                value={prefs.dairy}
                onChange={(event) => update("dairy", event.target.value as DairyChoice)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]"
              >
                <option value="ALL">{g.dairyAll}</option>
                <option value="LACTOSE_FREE">{g.dairyLactoseFree}</option>
                <option value="NONE">{g.dairyNone}</option>
              </select>
            </Field>

            <YesNo label={g.eggs} value={prefs.eggs} onChange={(v) => update("eggs", v)} yes={g.yes} no={g.no} />
            <YesNo label={g.nuts} value={prefs.nuts} onChange={(v) => update("nuts", v)} yes={g.yes} no={g.no} />
            <YesNo label={g.gluten} value={prefs.gluten} onChange={(v) => update("gluten", v)} yes={g.yes} no={g.no} />
            <YesNo label={g.fish} value={prefs.fish} onChange={(v) => update("fish", v)} yes={g.yes} no={g.no} />

            <Field label={g.meals}>
              <select
                value={prefs.mealsPerDay}
                onChange={(event) => update("mealsPerDay", Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]"
              >
                <option value={3}>{g.meals3}</option>
                <option value={4}>{g.meals4}</option>
              </select>
            </Field>

            <Field label={g.excluded} hint={g.excludedHint}>
              <input
                type="text"
                value={prefs.excludedFoods}
                maxLength={500}
                onChange={(event) => update("excludedFoods", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light]"
              />
            </Field>
          </div>

          {notice && (
            <p
              role="status"
              className={`mt-5 rounded-lg px-3 py-2 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
            >
              {notice.text}
              {planned && (
                <>
                  {" "}
                  <Link to="/meal-planner" className="font-semibold underline">
                    {g.openPlanner}
                  </Link>
                </>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={busy !== null}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"
            >
              {busy === "save" ? g.saving : g.save}
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={busy !== null}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "generate" ? g.generating : g.generate}
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function YesNo({
  label,
  value,
  onChange,
  yes,
  no,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex gap-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
              value === option ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            }`}
          >
            {option ? yes : no}
          </button>
        ))}
      </div>
    </div>
  );
}
