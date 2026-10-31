import { describe, expect, it } from "vitest";
import { topFoods, weekdayAverages } from "./history";

describe("weekdayAverages", () => {
  it("averages only the logged days, per weekday", () => {
    // 2026-10-26 is a Monday, 2026-10-27 a Tuesday, 2026-11-02 a Monday.
    const result = weekdayAverages([
      { date: "2026-10-26", kcal: 2000 },
      { date: "2026-10-27", kcal: 0 },
      { date: "2026-11-02", kcal: 1800 },
    ]);
    expect(result[1]).toEqual({ weekday: 1, average: 1900, loggedDays: 2 });
    expect(result[2]).toEqual({ weekday: 2, average: null, loggedDays: 0 });
  });
});

describe("topFoods", () => {
  it("ranks foods by the number of different days, not by the number of entries", () => {
    const result = topFoods(
      [
        { date: "2026-10-01", name: "Oats" },
        { date: "2026-10-01", name: "Oats" },
        { date: "2026-10-02", name: "Oats" },
        { date: "2026-10-01", name: "Egg" },
        { date: "2026-10-02", name: "Egg" },
        { date: "2026-10-03", name: "Rice" },
      ],
      2,
    );
    expect(result).toEqual([
      { name: "Egg", days: 2 },
      { name: "Oats", days: 2 },
    ]);
  });
});
