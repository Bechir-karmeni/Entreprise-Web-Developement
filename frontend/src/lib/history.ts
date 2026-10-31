import type { MealType } from "../types/food";

/** A logged food with the time it was logged. */
export interface TimedEntry {
  mealType: MealType;
  loggedAt: string;
}

/** Minutes after midnight, in the user's local time. */
export function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

/** Rounded average of the values, or null when there are none. */
export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** 465 becomes "07:45". */
export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** The first and the last logging time of one day. Null when nothing was logged. */
export function dayWindow(entries: TimedEntry[]): { first: number; last: number } | null {
  if (entries.length === 0) return null;
  const times = entries.map((entry) => minutesOfDay(entry.loggedAt));
  return { first: Math.min(...times), last: Math.max(...times) };
}

/**
 * For each meal, the average time of its first logged food, taken over the days when that meal was logged.
 * Null for a meal that was never logged in the window.
 */
export function averageMealTimes(days: TimedEntry[][]): Record<MealType, number | null> {
  const meals: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const result = {} as Record<MealType, number | null>;
  for (const meal of meals) {
    const firsts: number[] = [];
    for (const entries of days) {
      const mealEntries = entries.filter((entry) => entry.mealType === meal);
      if (mealEntries.length > 0) {
        firsts.push(Math.min(...mealEntries.map((entry) => minutesOfDay(entry.loggedAt))));
      }
    }
    result[meal] = averageOf(firsts);
  }
  return result;
}

export interface HydrationStats {
  loggedDays: number;
  averageMlOnLoggedDays: number | null;
  goalDays: number;
}

/** Water over a window of days. A day counts as logged when any water was drunk. */
export function hydrationStats(totalsMl: number[], goalMl: number): HydrationStats {
  const logged = totalsMl.filter((ml) => ml > 0);
  return {
    loggedDays: logged.length,
    averageMlOnLoggedDays: averageOf(logged),
    goalDays: goalMl > 0 ? totalsMl.filter((ml) => ml >= goalMl).length : 0,
  };
}

/** Average calories per weekday (0 = Sunday) over the days that have food logged. Null for a weekday with no logged day. */
export function weekdayAverages(days: { date: string; kcal: number }[]): { weekday: number; average: number | null; loggedDays: number }[] {
  const sums = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  for (const day of days) {
    if (day.kcal <= 0) continue;
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    sums[weekday].sum += day.kcal;
    sums[weekday].count += 1;
  }
  return sums.map((item, weekday) => ({
    weekday,
    average: item.count === 0 ? null : Math.round(item.sum / item.count),
    loggedDays: item.count,
  }));
}

/** Foods ranked by the number of different days they were logged on. Ties are sorted by name. */
export function topFoods(entries: { date: string; name: string }[], limit: number): { name: string; days: number }[] {
  const daysByFood = new Map<string, Set<string>>();
  for (const entry of entries) {
    const dates = daysByFood.get(entry.name) ?? new Set<string>();
    dates.add(entry.date);
    daysByFood.set(entry.name, dates);
  }
  return [...daysByFood.entries()]
    .map(([name, dates]) => ({ name, days: dates.size }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, limit);
}

