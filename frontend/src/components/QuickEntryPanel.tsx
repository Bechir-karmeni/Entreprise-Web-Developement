import { useState } from "react";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { useI18n } from "../i18n/useI18n";
import { localDateIso } from "../lib/foodLog";
import { notifyFoodLogChanged } from "../lib/foodEvents";
import type { MealType } from "../types/food";

const MAX_KCAL = 5000;
const MAX_GRAMS = 1000;

/** Reads a number typed by the user. Empty or invalid text counts as 0. */
function toNumber(text: string): number {
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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

/** Quick entry: the user types calories and macros directly, without a food from the database. */
export function QuickEntryPanel({ meal, onClose }: { meal: MealType; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [kcalText, setKcalText] = useState("");
  const [proteinText, setProteinText] = useState("");
  const [carbsText, setCarbsText] = useState("");
  const [fatText, setFatText] = useState("");
  const [fiberText, setFiberText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kcal = toNumber(kcalText);
  const protein = toNumber(proteinText);
  const carbs = toNumber(carbsText);
  const fat = toNumber(fatText);
  const fiber = toNumber(fiberText);
  // Energy from the macros: 4 kcal per gram of protein and carbohydrate, 9 kcal per gram of fat.
  const calculated = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const difference = Math.round(kcal - calculated);
  const hasMacros = protein + carbs + fat + fiber > 0;
  const valid =
    kcal > 0 && kcal <= MAX_KCAL && [protein, carbs, fat, fiber].every((grams) => grams <= MAX_GRAMS);

  const macroFields = [
    { id: "quick-protein", label: t.today.protein, text: proteinText, setText: setProteinText, grams: protein, kcalPerGram: 4 },
    { id: "quick-carbs", label: t.today.carbs, text: carbsText, setText: setCarbsText, grams: carbs, kcalPerGram: 4 },
    { id: "quick-fat", label: t.today.fat, text: fatText, setText: setFatText, grams: fat, kcalPerGram: 9 },
    { id: "quick-fiber", label: t.today.fiber, text: fiberText, setText: setFiberText, grams: fiber, kcalPerGram: 0 },
  ];

  function addKcal(delta: number) {
    setKcalText(String(Math.max(0, Math.round(kcal + delta))));
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await foodApi.addQuickEntry({
        mealType: meal,
        date: localDateIso(new Date()),
        name: name.trim() === "" ? null : name.trim(),
        calories: Math.round(kcal),
        proteinGrams: round1(protein),
        carbsGrams: round1(carbs),
        fatGrams: round1(fat),
        fiberGrams: round1(fiber),
      });
      notifyFoodLogChanged();
      onClose();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <p className="text-sm text-slate-500">{t.quickEntry.intro}</p>

        <label htmlFor="quick-name" className="mt-4 block text-xs font-medium text-slate-600">
          {t.quickEntry.nameLabel}
        </label>
        <input
          id="quick-name"
          value={name}
          maxLength={150}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.quickEntry.namePlaceholder}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none bg-white text-slate-900 [color-scheme:light]"
        />

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.quickEntry.kcalLabel}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <input
                id="quick-kcal"
                inputMode="decimal"
                value={kcalText}
                onChange={(event) => setKcalText(event.target.value)}
                className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-3xl font-bold focus:border-emerald-600 focus:outline-none"
              />
              <span className="text-sm text-slate-500">kcal</span>
            </div>
            <div className="flex gap-1.5">
              {[-50, -10, 10, 50].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => addKcal(delta)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {macroFields.map((field) => (
            <div key={field.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={field.id} className="text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <span className="text-[11px] text-slate-500">
                  {field.kcalPerGram > 0 ? `${field.kcalPerGram} kcal/g` : t.quickEntry.optional}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id={field.id}
                  inputMode="decimal"
                  value={field.text}
                  onChange={(event) => field.setText(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-sm text-slate-500">g</span>
              </div>
              {field.kcalPerGram > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {t.quickEntry.energyShare.replace("{kcal}", String(Math.round(field.grams * field.kcalPerGram)))}
                </p>
              )}
            </div>
          ))}
        </div>

        {hasMacros && kcal > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{t.quickEntry.plausibilityTitle}</p>
            <p className="mt-1">
              {t.quickEntry.plausibilityText
                .replace("{calc}", String(calculated))
                .replace("{kcal}", String(Math.round(kcal)))
                .replace("{diff}", `${difference >= 0 ? "+" : ""}${difference}`)}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <SoonChip label={t.quickEntry.templates} />
          <SoonChip label={t.quickEntry.time} />
          <SoonChip label={t.quickEntry.autoCalc} />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
        <p className="text-sm text-slate-600">{kcal > 0 ? "" : t.quickEntry.needKcal}</p>
        <div className="flex flex-wrap items-center gap-2">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
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
            disabled={!valid || saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {t.quickEntry.saveButton.replace("{meal}", t.today.meals[meal]).replace("{kcal}", String(Math.round(kcal)))}
          </button>
        </div>
      </footer>
    </div>
  );
}
