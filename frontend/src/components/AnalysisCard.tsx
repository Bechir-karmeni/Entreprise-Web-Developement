import { useState } from "react";
import { analysisApi } from "../api/analysisApi";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n/useI18n";
import type { AnalysisResult } from "../types/analysis";

/** Button that asks Claude for an analysis of the last 30 days, with a short notice about the data sent. */
export function AnalysisCard() {
  const { t, language } = useI18n();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    setBusy(true);
    setError(null);
    try {
      setResult(await analysisApi.run(language));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-6 ring-1 ring-slate-200/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{t.analysis.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.analysis.subtitle}</p>
          <p className="mt-2 text-xs text-slate-500">{t.analysis.privacyNote}</p>
        </div>
        <button
          type="button"
          onClick={analyse}
          disabled={busy}
          className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? t.analysis.running : t.analysis.button}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && result.loggedDays === 0 && <p className="mt-4 text-sm text-slate-600">{t.analysis.noData}</p>}

      {result && result.loggedDays > 0 && (
        <div className="mt-5 rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">
            {t.analysis.generated.replace("{date}", new Date(result.generatedAt).toLocaleString())} ·{" "}
            {t.analysis.basedOn.replace("{count}", String(result.loggedDays))}
          </p>
          <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{result.text}</div>
          <p className="mt-4 text-xs text-slate-500">{t.analysis.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
