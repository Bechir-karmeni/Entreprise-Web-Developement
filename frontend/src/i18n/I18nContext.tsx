import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { de } from "./de";
import { en, type Messages } from "./en";

export type Language = "en" | "de";

const STORAGE_KEY = "dailyTracker.language";
const dictionaries: Record<Language, Messages> = { en, de };

export interface I18nValue {
  language: Language;
  t: Messages;
  setLanguage: (language: Language) => void;
}

export const I18nContext = createContext<I18nValue | undefined>(undefined);

/** Saved choice first, then the browser language (German if it starts with "de"), otherwise English. */
function initialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "de") return stored;
  } catch {
    // Storage can be blocked; fall through to the browser setting.
  }
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved, but the switch still works for this page.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({ language, t: dictionaries[language], setLanguage }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
