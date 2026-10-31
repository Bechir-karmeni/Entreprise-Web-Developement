import { useState } from "react";
import { ApiError } from "../api/http";
import { copilotApi } from "../api/copilotApi";
import { useI18n } from "../i18n/useI18n";
import type { AnalysisResult } from "../types/analysis";

/** The Nutritional Intelligence Copilot: asks Gemini for personal macro guidance from the last 14 days. */
export function MacroCopilotCard() {
  const { t, language } = useI18n();
  const d = t.dashboard;
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      setResult(await copilotApi.macros(language));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-6 ring-1 ring-slate-200/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{d.copilotTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{d.copilotText}</p>
        </div>
        <button
          type="button"
          onClick={ask}
          disabled={busy}
          className="self-start rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:self-auto"
        >
          {busy ? d.copilotRunning : d.askAi}
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {result && result.loggedDays === 0 && <p className="mt-4 text-sm text-slate-600">{d.copilotNoData}</p>}

      {result && result.loggedDays > 0 && (
        <div className="mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">{d.copilotBasedOn.replace("{count}", String(result.loggedDays))}</p>
          <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{result.text}</div>
          <p className="mt-4 text-xs text-slate-500">{d.copilotDisclaimer}</p>
        </div>
      )}
    </section>
  );
}
