import { useEffect, useState, type FormEvent } from "react";
import { weightApi } from "../api/weightApi";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n/useI18n";
import { localDateIso } from "../lib/foodLog";
import { MAX_WEIGHT_KG, MIN_WEIGHT_KG, isValidWeight, weightChange } from "../lib/weight";
import type { WeightEntry } from "../types/weight";

const PERIOD_DAYS = 90;

function periodStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - (PERIOD_DAYS - 1));
  return localDateIso(date);
}

/** Weigh-ins of the last 90 days, a chart, and a form to save today's (or an earlier day's) weight. */
export function WeightCard() {
  const { t } = useI18n();
  const today = localDateIso(new Date());
  const [entries, setEntries] = useState<WeightEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(today);
  const [kgText, setKgText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    weightApi
      .list(periodStart(), today)
      .then((loaded) => {
        if (active) setEntries(loaded);
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof ApiError ? failure.message : t.common.genericError);
      });
    return () => {
      active = false;
    };
  }, [today, reloadKey, t.common.genericError]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const kg = Number(kgText);
    if (date > today) {
      setFormError(t.weight.futureDate);
      return;
    }
    if (!isValidWeight(kg)) {
      setFormError(t.weight.invalid);
      return;
    }
    setBusy(true);
    try {
      await weightApi.save({ date, weightKg: kg });
      setKgText("");
      setReloadKey((current) => current + 1);
    } catch (failure) {
      setFormError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await weightApi.remove(id);
      setReloadKey((current) => current + 1);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  const sorted = entries ?? [];
  const change = weightChange(sorted);
  const recent = [...sorted].reverse().slice(0, 5);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t.progress.weightTitle}</h2>
          <p className="text-xs text-slate-500">{t.weight.period}</p>
        </div>
        {change !== null && (
          <p className="text-sm font-semibold">{t.weight.change.replace("{kg}", `${change > 0 ? "+" : ""}${change}`)}</p>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium text-slate-600">
          {t.weight.date}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 [color-scheme:light]"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          {t.weight.kg}
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            value={kgText}
            onChange={(event) => setKgText(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 [color-scheme:light]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {t.weight.save}
        </button>
      </form>

      {formError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {formError}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {entries === null && !error && <p className="mt-6 text-sm text-slate-600">{t.common.loading}</p>}

      {entries !== null &&
        (sorted.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">{t.weight.noEntries}</p>
        ) : (
          <>
            <WeightChart entries={sorted} />
            {sorted.length < 2 && <p className="mt-2 text-xs text-slate-500">{t.weight.needTwo}</p>}
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.weight.recent}</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {recent.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-600">{entry.date}</span>
                  <span className="font-semibold">{entry.weightKg.toFixed(1)} kg</span>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
                  >
                    {t.weight.delete}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ))}
    </section>
  );
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const { t } = useI18n();
  const width = 600;
  const height = 180;
  const pad = 16;
  const values = entries.map((entry) => entry.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index: number) =>
    entries.length === 1 ? width / 2 : pad + (index / (entries.length - 1)) * (width - 2 * pad);
  const y = (value: number) => pad + (1 - (value - min) / span) * (height - 2 * pad);
  const points = entries.map((entry, index) => `${x(index)},${y(entry.weightKg)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 h-44 w-full" role="img" aria-label={t.weight.chartLabel}>
      {entries.length > 1 && (
        <polyline points={points} fill="none" stroke="#00613f" strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {entries.map((entry, index) => (
        <circle key={entry.id} cx={x(index)} cy={y(entry.weightKg)} r={4} fill="#00613f">
          <title>{`${entry.date}: ${entry.weightKg.toFixed(1)} kg`}</title>
        </circle>
      ))}
    </svg>
  );
}
