import { useCallback, useState } from "react";
import { todayApi } from "../api/todayApi";
import { useFoodLogChanged } from "../lib/foodEvents";
import { localDateIso } from "../lib/foodLog";
import { toLunchSuggestion, type LunchSuggestion } from "../lib/lunchSuggestion";
import { LunchSuggestionPopup } from "./LunchSuggestionPopup";

const DISMISSED_KEY = "nutriday.lunchTip.dismissedOn";

/** Remembers, per browser, the day on which the user closed the tip. Storage may be blocked, so every access is guarded. */
function isDismissedOn(today: string): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === today;
  } catch {
    return false;
  }
}

function rememberDismissed(today: string): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, today);
  } catch {
    // Storage is unavailable: the tip may appear again on the next change, which is acceptable.
  }
}

/**
 * Shows a lunch suggestion after breakfast is logged today and lunch is still empty.
 * The server decides whether there is a suggestion, so this component only shows what it receives.
 * It checks again after every food-log change, so it appears right after logging breakfast on any page.
 */
export function LunchSuggestionHost() {
  const [suggestion, setSuggestion] = useState<LunchSuggestion | null>(null);

  const checkDay = useCallback(async () => {
    const today = localDateIso(new Date());
    if (isDismissedOn(today)) {
      setSuggestion(null);
      return;
    }
    try {
      const data = await todayApi.get(today);
      setSuggestion(data.lunchSuggestion ? toLunchSuggestion(data.lunchSuggestion) : null);
    } catch {
      setSuggestion(null);
    }
  }, []);

  useFoodLogChanged(() => {
    void checkDay();
  });

  function dismiss() {
    rememberDismissed(localDateIso(new Date()));
    setSuggestion(null);
  }

  if (!suggestion) return null;
  return <LunchSuggestionPopup suggestion={suggestion} onDismiss={dismiss} />;
}
