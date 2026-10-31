import { describe, expect, it } from "vitest";
import { isValidWeight, weightChange } from "./weight";

describe("weight helpers", () => {
  it("accepts weights from 30 to 300 kg only", () => {
    expect(isValidWeight(29.9)).toBe(false);
    expect(isValidWeight(30)).toBe(true);
    expect(isValidWeight(300)).toBe(true);
    expect(isValidWeight(300.1)).toBe(false);
    expect(isValidWeight(Number.NaN)).toBe(false);
  });

  it("returns the change from the first to the last weigh-in", () => {
    expect(weightChange([{ weightKg: 80 }, { weightKg: 78.4 }])).toBe(-1.6);
    expect(weightChange([{ weightKg: 80 }])).toBeNull();
    expect(weightChange([])).toBeNull();
  });
});
