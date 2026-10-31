import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ApiError } from "../api/http";
import { summaryApi } from "../api/summaryApi";
import { useI18n } from "../i18n/useI18n";
import type { AnalysisResult } from "../types/analysis";

export default function SummaryPage() {
  const { t, language } = useI18n();
  const s = t.summary;
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      setResult(await summaryApi.run(language));
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={s.title} subtitle={s.subtitle}>
      <div className="mb-4">
        <Link to="/dashboard" className="text-sm font-medium text-emerald-800 hover:underline">
          ← {s.back}
        </Link>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{s.intro}</p>
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? s.running : s.button}
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {result && result.loggedDays === 0 && <p className="mt-4 text-sm text-slate-600">{s.noData}</p>}

        {result && result.loggedDays > 0 && (
          <div className="mt-5 rounded-xl bg-emerald-50/60 p-5 ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">
              {s.basedOn.replace("{count}", String(result.loggedDays))} · {new Date(result.generatedAt).toLocaleString()}
            </p>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{result.text}</div>
            <p className="mt-4 text-xs text-slate-500">{s.disclaimer}</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
