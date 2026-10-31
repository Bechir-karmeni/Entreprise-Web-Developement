import { localDateIso } from "./foodLog";

/** One day of the progress window. Days without entries have 0 calories. */
export interface DayPoint {
  date: string;
  calories: number;
}

/** The last `count` dates ending with today, oldest first. */
export function lastDays(todayIso: string, count: number): string[] {
  const [year, month, day] = todayIso.split("-").map(Number);
  const dates: string[] = [];
  for (let back = count - 1; back >= 0; back--) {
    dates.push(localDateIso(new Date(year, month - 1, day - back)));
  }
  return dates;
}

/** 90 to 110 % of the calorie target counts as on target, the same band the goal rows use. */
export function isOnTarget(calories: number, target: number): boolean {
  if (target <= 0 || calories <= 0) return false;
  // Rounded to one decimal so floating-point noise does not move a day across the band edge.
  const percent = Math.round((calories / target) * 1000) / 10;
  return percent >= 90 && percent <= 110;
}

/**
 * Logged days in a row, ending today. If today has nothing logged yet, the streak is counted
 * from yesterday, so it is not broken before the day is over.
 * Days are ordered oldest first, so the last item is today.
 */
export function currentStreak(days: DayPoint[]): number {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index--) {
    if (days[index].calories > 0) {
      streak++;
    } else if (index !== days.length - 1) {
      break;
    }
  }
  return streak;
}

/** The longest run of logged days inside the window. */
export function bestStreak(days: DayPoint[]): number {
  let best = 0;
  let run = 0;
  for (const day of days) {
    run = day.calories > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export interface ProgressSummary {
  streak: number;
  onTargetLastWeek: number;
  loggedToday: boolean;
}

/** The figures the dashboard card shows: the current streak, days on target in the last 7, and whether today is logged. */
export function summarizeProgress(days: DayPoint[], target: number): ProgressSummary {
  const today = days[days.length - 1];
  return {
    streak: currentStreak(days),
    onTargetLastWeek: onTargetCount(days.slice(-7), target),
    loggedToday: (today?.calories ?? 0) > 0,
  };
}

export function onTargetCount(days: DayPoint[], target: number): number {
  return days.filter((day) => isOnTarget(day.calories, target)).length;
}

export function loggedCount(days: DayPoint[]): number {
  return days.filter((day) => day.calories > 0).length;
}

/** Average calories over the logged days only. Null when nothing is logged. */
export function averageOnLoggedDays(days: DayPoint[]): number | null {
  const logged = days.filter((day) => day.calories > 0);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((sum, day) => sum + day.calories, 0) / logged.length);
}

export type AchievementKey = "firstDay" | "streak3" | "streak7" | "weekOnTarget";

export interface Achievement {
  key: AchievementKey;
  unlocked: boolean;
}

/** Badges from the window: the first logged day, streaks of 3 and 7 days, and 5 of the last 7 days on target. */
export function achievements(days: DayPoint[], target: number): Achievement[] {
  const best = bestStreak(days);
  const lastWeek = days.slice(-7);
  return [
    { key: "firstDay", unlocked: loggedCount(days) >= 1 },
    { key: "streak3", unlocked: best >= 3 },
    { key: "streak7", unlocked: best >= 7 },
    { key: "weekOnTarget", unlocked: onTargetCount(lastWeek, target) >= 5 },
  ];
}
