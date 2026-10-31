import { describe, expect, it } from "vitest";
import { averageMealTimes, averageOf, dayWindow, formatClock, hydrationStats, minutesOfDay } from "./history";

/** A local time on 2026-10-26, as an ISO string. */
function at(hour: number, minute: number): string {
  return new Date(2026, 9, 26, hour, minute).toISOString();
}

describe("time helpers", () => {
  it("reads the local clock time of a logged food", () => {
    expect(minutesOfDay(at(7, 45))).toBe(465);
  });

  it("formats minutes as a clock time", () => {
    expect(formatClock(465)).toBe("07:45");
    expect(formatClock(1439)).toBe("23:59");
  });

  it("averages and rounds, and returns null for nothing", () => {
    expect(averageOf([465, 600])).toBe(533);
    expect(averageOf([])).toBeNull();
  });
});

describe("dayWindow", () => {
  it("returns the first and the last logging time of the day", () => {
    const window = dayWindow([
      { mealType: "LUNCH", loggedAt: at(13, 0) },
      { mealType: "BREAKFAST", loggedAt: at(7, 30) },
      { mealType: "DINNER", loggedAt: at(19, 15) },
    ]);
    expect(window).toEqual({ first: 450, last: 1155 });
  });

  it("is null when nothing was logged", () => {
    expect(dayWindow([])).toBeNull();
  });
});

describe("averageMealTimes", () => {
  it("averages the first log of each meal over the days it was logged", () => {
    const days = [
      [
        { mealType: "BREAKFAST" as const, loggedAt: at(7, 0) },
        { mealType: "BREAKFAST" as const, loggedAt: at(7, 30) },
      ],
      [{ mealType: "BREAKFAST" as const, loggedAt: at(8, 0) }],
    ];
    const averages = averageMealTimes(days);
    // First logs: 07:00 and 08:00, so the average is 07:30.
    expect(averages.BREAKFAST).toBe(450);
    expect(averages.LUNCH).toBeNull();
  });
});

describe("hydrationStats", () => {
  it("counts logged days, the average on them and the days that reached the goal", () => {
    expect(hydrationStats([0, 1500, 2600, 2000], 2500)).toEqual({
      loggedDays: 3,
      averageMlOnLoggedDays: 2033,
      goalDays: 1,
    });
  });

  it("does not count goal days when there is no goal", () => {
    expect(hydrationStats([3000], 0).goalDays).toBe(0);
  });
});
