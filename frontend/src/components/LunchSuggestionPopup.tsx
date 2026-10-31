import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import type { LunchSuggestion } from "../lib/lunchSuggestion";

interface Props {
  suggestion: LunchSuggestion;
  onDismiss: () => void;
}

/** Non-blocking card in the corner that suggests a lunch target after breakfast is logged. */
export function LunchSuggestionPopup({ suggestion, onDismiss }: Props) {
  const { t } = useI18n();
  const focusText =
    suggestion.focus === "protein"
      ? t.today.lunchTip.focusProtein
      : suggestion.focus === "fiber"
        ? t.today.lunchTip.focusFiber
        : t.today.lunchTip.focusBalanced;

  return (
    <div
      role="dialog"
      aria-labelledby="lunch-tip-title"
      className="fixed inset-x-4 bottom-4 z-40 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:inset-x-auto sm:right-6 sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.today.lunchTip.label}</p>
          <h2 id="lunch-tip-title" className="font-semibold">
            {t.today.lunchTip.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.today.lunchTip.dismiss}
          className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      {suggestion.status === "targetReached" ? (
        <p className="mt-3 text-sm text-slate-600">{t.today.lunchTip.reached}</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">{focusText}</p>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">{t.today.lunchTip.targetLabel}</p>
            <p className="mt-1 font-semibold text-slate-900">
              {t.today.lunchTip.values
                .replace("{kcal}", String(suggestion.calories))
                .replace("{protein}", String(suggestion.proteinGrams))
                .replace("{carbs}", String(suggestion.carbsGrams))
                .replace("{fat}", String(suggestion.fatGrams))
                .replace("{fiber}", String(suggestion.fiberGrams))}
            </p>
          </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/food-tracking" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          {t.today.lunchTip.logLunch}
        </Link>
        <button type="button" onClick={onDismiss} className="text-sm font-medium text-slate-600 hover:underline">
          {t.today.lunchTip.dismiss}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{t.today.lunchTip.disclaimer}</p>
    </div>
  );
}
