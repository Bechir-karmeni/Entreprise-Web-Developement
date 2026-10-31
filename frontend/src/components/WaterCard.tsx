import { useEffect, useState } from "react";
import { waterApi } from "../api/waterApi";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n/useI18n";
import { MAX_DAILY_ML, WATER_PRESETS_ML, canAddWater, formatLiters, waterPercent } from "../lib/water";
import type { WaterDay } from "../types/water";

/** Logs water for one day (ISO date) and compares it with the daily goal in litres. */
export function WaterCard({ date, goalLiters }: { date: string; goalLiters: number }) {
  const { t } = useI18n();
  const [day, setDay] = useState<WaterDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const goalMl = Math.round(goalLiters * 1000);
  const total = day?.totalMl ?? 0;
  const percent = waterPercent(total, goalMl);
  const lastEntry = day?.entries[day.entries.length - 1];

  useEffect(() => {
    let active = true;
    setDay(null);
    setError(null);
    waterApi
      .get(date)
      .then((loaded) => {
        if (active) setDay(loaded);
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof ApiError ? failure.message : t.water.loadError);
      });
    return () => {
      active = false;
    };
  }, [date, t.water.loadError]);

  async function add(amountMl: number) {
    setBusy(true);
    setError(null);
    try {
      setDay(await waterApi.add({ date, amountMl }));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    if (!lastEntry) return;
    setBusy(true);
    setError(null);
    try {
      await waterApi.remove(lastEntry.id);
      setDay(await waterApi.get(date));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  const limitReached = total >= MAX_DAILY_ML;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.water.title}</h3>
          <p className="mt-1 text-2xl font-bold">
            {formatLiters(total)} <span className="text-sm font-normal text-slate-500">L / {goalLiters.toFixed(1)} L</span>
          </p>
          <p className="text-xs text-slate-500">{percent >= 100 ? t.water.goalReached : t.water.ofGoal.replace("{percent}", String(percent))}</p>
        </div>
        <button
          type="button"
          onClick={undoLast}
          disabled={!lastEntry || busy}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 disabled:opacity-40"
        >
          {t.water.undo}
        </button>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {WATER_PRESETS_ML.map((amountMl) => (
          <button
            key={amountMl}
            type="button"
            onClick={() => add(amountMl)}
            disabled={!day || busy || !canAddWater(total, amountMl)}
            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
          >
            {t.water.add.replace("{amount}", amountMl.toLocaleString())}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {!day && !error && <p className="mt-3 text-xs text-slate-500">{t.common.loading}</p>}

      {day && (
        <p className="mt-3 text-xs text-slate-500">
          {limitReached
            ? t.water.limitReached
            : day.entries.length > 0
              ? t.water.drinks.replace("{count}", String(day.entries.length))
              : t.water.nothingLogged}
        </p>
      )}
      <p className="mt-1 text-[11px] text-slate-400">{t.water.limitNote}</p>
    </section>
  );
}
