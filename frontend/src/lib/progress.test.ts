import { describe, expect, it } from "vitest";
import {
  achievements,
  averageOnLoggedDays,
  bestStreak,
  currentStreak,
  isOnTarget,
  lastDays,
  onTargetCount,
  summarizeProgress,
  type DayPoint,
} from "./progress";

/** Builds days oldest first from a list of calories. */
function days(...calories: number[]): DayPoint[] {
  return calories.map((value, index) => ({ date: `2026-10-${String(index + 1).padStart(2, "0")}`, calories: value }));
}

describe("lastDays", () => {
  it("returns the dates ending today, oldest first, across a month boundary", () => {
    expect(lastDays("2026-11-02", 3)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});

describe("isOnTarget", () => {
  it("uses the 90 to 110 percent band", () => {
    expect(isOnTarget(1800, 2000)).toBe(true);
    expect(isOnTarget(2200, 2000)).toBe(true);
    expect(isOnTarget(1700, 2000)).toBe(false);
    expect(isOnTarget(2300, 2000)).toBe(false);
  });

  it("never counts an unlogged day or a missing target", () => {
    expect(isOnTarget(0, 2000)).toBe(false);
    expect(isOnTarget(2000, 0)).toBe(false);
  });
});

describe("currentStreak", () => {
  it("counts logged days up to today", () => {
    expect(currentStreak(days(0, 0, 1800, 1900, 2000))).toBe(3);
  });

  it("does not break the streak when today is not logged yet", () => {
    expect(currentStreak(days(1800, 1900, 2000, 0))).toBe(3);
  });

  it("is zero when the last logged day is older than yesterday", () => {
    expect(currentStreak(days(1800, 0, 0))).toBe(0);
  });
});

describe("bestStreak", () => {
  it("finds the longest run inside the window", () => {
    expect(bestStreak(days(1, 1, 0, 1, 1, 1, 0))).toBe(3);
  });
});

describe("onTargetCount and averageOnLoggedDays", () => {
  it("counts on-target days and averages only logged days", () => {
    const window = days(1900, 0, 2500, 2000);
    expect(onTargetCount(window, 2000)).toBe(2);
    expect(averageOnLoggedDays(window)).toBe(2133);
  });

  it("has no average when nothing is logged", () => {
    expect(averageOnLoggedDays(days(0, 0))).toBeNull();
  });
});

describe("achievements", () => {
  it("unlocks badges from the window", () => {
    const window = days(...Array.from({ length: 30 }, (_, index) => (index < 7 ? 2000 : 0)));
    const byKey = Object.fromEntries(achievements(window, 2000).map((item) => [item.key, item.unlocked]));
    expect(byKey).toEqual({ firstDay: true, streak3: true, streak7: true, weekOnTarget: false });
  });

  it("keeps everything locked for an empty window", () => {
    expect(achievements(days(0, 0, 0), 2000).every((item) => !item.unlocked)).toBe(true);
  });
});

describe("summarizeProgress", () => {
  it("counts the streak, the days on target in the last week, and whether today is logged", () => {
    const summary = summarizeProgress(days(1800, 1900, 1700, 0, 0, 0, 2000), 2000);
    expect(summary).toEqual({ streak: 1, onTargetLastWeek: 3, loggedToday: true });
  });

  it("does not count today as broken when it is not logged yet", () => {
    const summary = summarizeProgress(days(2000, 2000, 2000, 0), 2000);
    expect(summary.streak).toBe(3);
    expect(summary.loggedToday).toBe(false);
  });
});
