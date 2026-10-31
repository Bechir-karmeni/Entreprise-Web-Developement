import { useState, type FormEvent, type ReactNode } from "react";
import { profileApi } from "../api/profileApi";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n/useI18n";
import {
  EMPTY_PROFILE_FORM,
  buildProfileInput,
  validateProfileForm,
  type ProfileErrorKey,
  type ProfileFormValues,
} from "../lib/profile";
import type { ActivityLevel, NutritionGoal, ProfileResponse, Sex } from "../types/profile";

const ACTIVITY_LEVELS: ActivityLevel[] = ["SEDENTARY", "LIGHTLY_ACTIVE", "MODERATELY_ACTIVE", "VERY_ACTIVE", "EXTRA_ACTIVE"];
const GOALS: NutritionGoal[] = ["LOSE_WEIGHT", "MAINTAIN_WEIGHT", "GAIN_WEIGHT", "GAIN_MUSCLE", "GENERAL_HEALTHY_EATING"];

interface ProfileFormProps {
  /** Existing profile when the user edits their details. */
  initial?: ProfileResponse | null;
  onSaved: (profile: ProfileResponse) => void;
  onCancel?: () => void;
}

/** Collects the body data and goal that the backend needs for the daily targets and the program. */
export function ProfileForm({ initial, onSaved, onCancel }: ProfileFormProps) {
  const { t } = useI18n();
  const p = t.profileSetup;
  const [values, setValues] = useState<ProfileFormValues>(() =>
    initial
      ? {
          sex: initial.sex,
          dateOfBirth: initial.dateOfBirth,
          heightCm: String(initial.heightCm),
          weightKg: String(initial.weightKg),
          activityLevel: initial.activityLevel,
          goal: initial.goal,
          // The statement is confirmed again on every save.
          medicalConfirmed: false,
        }
      : EMPTY_PROFILE_FORM,
  );
  const [errors, setErrors] = useState<Partial<Record<ProfileErrorKey, true>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProfileForm(values, new Date());
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      onSaved(await profileApi.save(buildProfileInput(values)));
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : t.common.genericError);
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-lg font-bold">{p.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{p.subtitle}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={p.sex} error={errors.sex ? p.errors.sex : null}>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["MALE", "FEMALE"] as Sex[]).map((sex) => (
              <ChoiceButton key={sex} pressed={values.sex === sex} onClick={() => set("sex", sex)}>
                {sex === "MALE" ? p.male : p.female}
              </ChoiceButton>
            ))}
          </div>
        </Field>

        <Field label={p.birthDate} error={errors.dateOfBirth ? p.errors.dateOfBirth : errors.age ? p.errors.age : null}>
          <input
            type="date"
            max={today}
            className={inputClass}
            value={values.dateOfBirth}
            onChange={(event) => set("dateOfBirth", event.target.value)}
          />
        </Field>

        <Field label={p.height} error={errors.heightCm ? p.errors.heightCm : null}>
          <input
            inputMode="decimal"
            className={inputClass}
            value={values.heightCm}
            onChange={(event) => set("heightCm", event.target.value)}
          />
        </Field>

        <Field label={p.weight} error={errors.weightKg ? p.errors.weightKg : null}>
          <input
            inputMode="decimal"
            className={inputClass}
            value={values.weightKg}
            onChange={(event) => set("weightKg", event.target.value)}
          />
        </Field>

        <Field label={p.activity} error={errors.activityLevel ? p.errors.activityLevel : null}>
          <select
            className={inputClass}
            value={values.activityLevel}
            onChange={(event) => set("activityLevel", event.target.value as ActivityLevel | "")}
          >
            <option value="">—</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {p.activityOptions[level]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={p.goal} error={errors.goal ? p.errors.goal : null} className="sm:col-span-2">
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {GOALS.map((goal) => (
              <ChoiceButton key={goal} pressed={values.goal === goal} onClick={() => set("goal", goal)}>
                {p.goalOptions[goal]}
              </ChoiceButton>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={values.medicalConfirmed}
            onChange={(event) => set("medicalConfirmed", event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700"
          />
          <span>{p.medical}</span>
        </label>
        {errors.medical && <p className="mt-1.5 text-sm text-red-600">{p.errors.medical}</p>}
      </div>

      {formError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
            {p.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? p.saving : p.save}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, className, children }: { label: string; error: string | null; className?: string; children: ReactNode }) {
  return (
    <label className={`block text-sm font-medium ${className ?? ""}`}>
      {label}
      {children}
      {error && <span className="mt-1 block text-sm font-normal text-red-600">{error}</span>}
    </label>
  );
}

function ChoiceButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${
        pressed ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
