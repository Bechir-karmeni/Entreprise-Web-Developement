import { useState } from "react";
import { ApiError } from "../api/http";
import { foodApi } from "../api/foodApi";
import { useI18n } from "../i18n/useI18n";
import { ALLERGEN_OPTIONS, buildCustomFood, formatAllergen, toNumber, type CustomFoodForm } from "../lib/foodLog";
import type { FoodItem, ServingUnit } from "../types/food";

type Basis = "per100" | "perPortion";

const EMPTY_FORM: CustomFoodForm = {
  name: "",
  brand: "",
  servingSize: "100",
  servingUnit: "g",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "0",
  allergens: [],
};

interface QuickAddFoodDialogProps {
  onClose: () => void;
  /** addAnother is true for "Save & add another": the dialog stays open and is cleared. */
  onCreated: (food: FoodItem, addAnother: boolean) => void;
}

/** Plausible when the entered kcal are within 10 % (at least 10 kcal) of the kcal calculated from the macros. */
function isPlausible(entered: number, calculated: number): boolean {
  return Math.abs(entered - calculated) <= Math.max(10, entered * 0.1);
}

function SoonChip({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase">{t.common.comingSoon}</span>
    </span>
  );
}

export function QuickAddFoodDialog({ onClose, onCreated }: QuickAddFoodDialogProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<CustomFoodForm>(EMPTY_FORM);
  const [basis, setBasis] = useState<Basis>("per100");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Per 100 g/ml the reference amount is always 100; per portion it is the portion size the user typed.
  const effective: CustomFoodForm = basis === "per100" ? { ...form, servingSize: "100" } : form;
  const referenceLabel = `${effective.servingSize} ${effective.servingUnit}`;

  const kcal = toNumber(form.calories) ?? 0;
  const protein = toNumber(form.protein) ?? 0;
  const carbs = toNumber(form.carbs) ?? 0;
  const fat = toNumber(form.fat) ?? 0;
  const fiber = toNumber(form.fiber) ?? 0;
  const proteinKcal = protein * 4;
  const carbsKcal = carbs * 4;
  const fatKcal = fat * 9;
  const macroKcal = proteinKcal + carbsKcal + fatKcal;
  const share = (value: number) => (macroKcal > 0 ? Math.round((value / macroKcal) * 100) : 0);
  const calculated = Math.round(macroKcal);
  const difference = Math.round(kcal - calculated);
  const hasMacros = macroKcal > 0;
  const plausible = kcal > 0 && hasMacros ? isPlausible(kcal, calculated) : true;

  function update<K extends keyof CustomFoodForm>(key: K, value: CustomFoodForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAllergen(name: string) {
    setForm((current) => ({
      ...current,
      allergens: current.allergens.includes(name)
        ? current.allergens.filter((item) => item !== name)
        : [...current.allergens, name],
    }));
  }

  async function submit(addAnother: boolean) {
    const result = buildCustomFood(effective);
    if (!result.ok) {
      setError(result.error === "name" ? t.food.nameRequired : t.food.numbersRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const food = await foodApi.createFood(result.input);
      onCreated(food, addAnother);
      if (addAnother) {
        setForm(EMPTY_FORM);
        setBasis("per100");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.common.genericError);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";
  const cardClass = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70";
  const macroFields = [
    { id: "custom-protein", label: t.customFood.protein, value: form.protein, key: "protein" as const, tone: "text-rose-600", kcal: proteinKcal },
    { id: "custom-carbs", label: t.customFood.carbs, value: form.carbs, key: "carbs" as const, tone: "text-amber-600", kcal: carbsKcal },
    { id: "custom-fat", label: t.customFood.fat, value: form.fat, key: "fat" as const, tone: "text-emerald-700", kcal: fatKcal },
    { id: "custom-fiber", label: t.customFood.fiber, value: form.fiber, key: "fiber" as const, tone: "text-slate-600", kcal: 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f6f7fb] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="quick-add-title" className="text-lg font-bold">
                {t.customFood.title}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                {t.customFood.badge}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{t.customFood.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.mealLog.close}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[1fr_20rem]">
          <form
            id="custom-food-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(false);
            }}
          >
            <section className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.customFood.sectionBasics}</h3>
                <span className="text-[11px] text-slate-500">{t.customFood.requiredNote}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium sm:col-span-2">
                  {t.customFood.nameLabel}
                  <input className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={150} required />
                </label>
                <label className="text-sm font-medium">
                  {t.customFood.brandLabel}
                  <input className={inputClass} value={form.brand} onChange={(e) => update("brand", e.target.value)} maxLength={150} />
                </label>
                <label className="text-sm font-medium">
                  {t.customFood.categoryLabel}
                  <select className={inputClass} disabled>
                    <option>{t.customFood.categoryValue}</option>
                  </select>
                </label>
              </div>
            </section>

            <section className={cardClass}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.customFood.sectionPortion}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <fieldset>
                  <legend className="text-sm font-medium">{t.customFood.basisLabel}</legend>
                  <div className="mt-1 inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      aria-pressed={basis === "per100"}
                      onClick={() => setBasis("per100")}
                      className={`rounded-md px-3 py-1.5 ${basis === "per100" ? "bg-white shadow-sm" : "text-slate-500"}`}
                    >
                      {t.customFood.basisPer100}
                    </button>
                    <button
                      type="button"
                      aria-pressed={basis === "perPortion"}
                      onClick={() => setBasis("perPortion")}
                      className={`rounded-md px-3 py-1.5 ${basis === "perPortion" ? "bg-white shadow-sm" : "text-slate-500"}`}
                    >
                      {t.customFood.basisPerPortion}
                    </button>
                  </div>
                </fieldset>
                <label className="text-sm font-medium">
                  {t.customFood.servingLabel}
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={basis === "per100" ? "100" : form.servingSize}
                    onChange={(e) => update("servingSize", e.target.value)}
                    disabled={basis === "per100"}
                    required
                  />
                </label>
                <label className="text-sm font-medium">
                  {t.customFood.unitLabel}
                  <select className={inputClass} value={form.servingUnit} onChange={(e) => update("servingUnit", e.target.value as ServingUnit)}>
                    <option value="g">{t.customFood.unitGram}</option>
                    <option value="ml">{t.customFood.unitMl}</option>
                    <option value="piece">{t.customFood.unitPiece}</option>
                  </select>
                </label>
              </div>
            </section>

            <section className={cardClass}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.customFood.sectionMacros.replace("{basis}", referenceLabel)}
              </h3>
              <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-medium">
                <span>
                  {t.customFood.energyLabel}
                  <span className="block text-xs font-normal text-slate-500">{t.customFood.required}</span>
                </span>
                <span className="flex items-center gap-2">
                  <input
                    className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-lg font-bold focus:border-emerald-600 focus:outline-none"
                    inputMode="decimal"
                    value={form.calories}
                    onChange={(e) => update("calories", e.target.value)}
                    required
                  />
                  <span className="text-sm text-slate-500">kcal</span>
                </span>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {macroFields.map((field) => (
                  <div key={field.id} className="rounded-xl border border-slate-200 p-3">
                    <label htmlFor={field.id} className={`text-xs font-semibold ${field.tone}`}>
                      {field.label}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id={field.id}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold focus:border-emerald-600 focus:outline-none"
                        inputMode="decimal"
                        value={field.value}
                        onChange={(e) => update(field.key, e.target.value)}
                      />
                      <span className="text-xs text-slate-500">g</span>
                    </div>
                    {field.kcal > 0 && (
                      <p className="mt-2 text-[11px] text-slate-500">{t.customFood.energyShare.replace("{kcal}", String(Math.round(field.kcal)))}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClass}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.food.fieldAllergens}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((name) => (
                  <label key={name} className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs">
                    <input type="checkbox" checked={form.allergens.includes(name)} onChange={() => toggleAllergen(name)} />
                    {formatAllergen(name)}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <SoonChip label={t.customFood.sugarDetails} />
              </div>
            </section>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </form>

          <aside className="space-y-4">
            <section className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.customFood.previewTitle}</h3>
                <span className="text-[11px] text-slate-500">{t.customFood.previewNote}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-emerald-700">{form.brand.trim() || t.customFood.noBrand}</p>
              <p className="text-lg font-bold">{form.name.trim() || t.customFood.namePlaceholder}</p>
              <p className="text-xs text-slate-500">{t.customFood.portionLine.replace("{amount}", referenceLabel)}</p>

              <p className="mt-4 text-xs font-medium text-slate-600">{t.customFood.distributionTitle}</p>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div className="bg-rose-500" style={{ width: `${share(proteinKcal)}%` }} />
                <div className="bg-amber-500" style={{ width: `${share(carbsKcal)}%` }} />
                <div className="bg-emerald-600" style={{ width: `${share(fatKcal)}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-rose-50 p-2">
                  <p className="font-semibold text-rose-700">{t.customFood.protein}</p>
                  <p className="font-bold">{protein} g</p>
                  <p className="text-slate-500">{share(proteinKcal)}%</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="font-semibold text-amber-700">{t.customFood.carbs}</p>
                  <p className="font-bold">{carbs} g</p>
                  <p className="text-slate-500">{share(carbsKcal)}%</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="font-semibold text-emerald-700">{t.customFood.fat}</p>
                  <p className="font-bold">{fat} g</p>
                  <p className="text-slate-500">{share(fatKcal)}%</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border-2 border-slate-800 p-3">
                <p className="text-lg font-extrabold">{t.customFood.labelTitle}</p>
                <p className="text-[11px] text-slate-500">{t.customFood.labelReference.replace("{amount}", referenceLabel)}</p>
                <div className="mt-2 flex justify-between border-b-4 border-slate-800 pb-1 text-sm font-bold">
                  <span>{t.customFood.energyRow}</span>
                  <span>
                    {Math.round(kcal)} kcal / {Math.round(kcal * 4.184)} kJ
                  </span>
                </div>
                <dl className="divide-y divide-slate-200 text-sm">
                  <div className="flex justify-between py-1">
                    <dt>{t.customFood.fat}</dt>
                    <dd>{fat} g</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt>{t.customFood.carbs}</dt>
                    <dd>{carbs} g</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt>{t.customFood.fiber}</dt>
                    <dd>{fiber} g</dd>
                  </div>
                  <div className="flex justify-between py-1 font-semibold">
                    <dt>{t.customFood.protein}</dt>
                    <dd>{protein} g</dd>
                  </div>
                </dl>
              </div>

              {hasMacros && kcal > 0 && (
                <div className={`mt-4 rounded-xl p-3 text-xs ${plausible ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                  <p className="font-semibold">
                    {t.customFood.plausibilityTitle} · {plausible ? t.customFood.plausible : t.customFood.check}
                  </p>
                  <p className="mt-1">
                    {t.customFood.plausibilityText
                      .replace("{calc}", String(calculated))
                      .replace("{kcal}", String(Math.round(kcal)))
                      .replace("{diff}", `${difference >= 0 ? "+" : ""}${difference}`)}
                  </p>
                </div>
              )}
            </section>

            <section className={`${cardClass} space-y-3`}>
              <SoonChip label={t.customFood.favorite} />
              <SoonChip label={t.customFood.quickPick} />
            </section>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">{t.customFood.footerNote}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {t.customFood.saveAndNext}
            </button>
            <button
              type="submit"
              form="custom-food-form"
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? t.common.loading : t.customFood.save}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
