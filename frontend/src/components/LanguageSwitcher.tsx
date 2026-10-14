import { useI18n } from "../i18n/useI18n";
import type { Language } from "../i18n/I18nContext";

const OPTIONS: Language[] = ["en", "de"];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div role="group" aria-label={t.common.language} className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
          className={`rounded-md px-2.5 py-1 uppercase transition ${
            language === option ? "bg-[#00613f] text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
