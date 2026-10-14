import { useEffect, useRef } from "react";

const FOOD_LOG_CHANGED = "food-log-changed";

/** Tells every open page that the food log changed, so it can reload its numbers. */
export function notifyFoodLogChanged(): void {
  window.dispatchEvent(new Event(FOOD_LOG_CHANGED));
}

/** Runs the callback whenever the food log changes anywhere in the app. */
export function useFoodLogChanged(onChange: () => void): void {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    const handler = () => latest.current();
    window.addEventListener(FOOD_LOG_CHANGED, handler);
    return () => window.removeEventListener(FOOD_LOG_CHANGED, handler);
  }, []);
}
