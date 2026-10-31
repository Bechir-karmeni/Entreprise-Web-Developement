import { describe, expect, it } from "vitest";
import { canAddWater, formatLiters, waterPercent } from "./water";

describe("water helpers", () => {
  it("calculates the share of the goal and caps it at 100", () => {
    expect(waterPercent(1250, 2500)).toBe(50);
    expect(waterPercent(3000, 2500)).toBe(100);
    expect(waterPercent(500, 0)).toBe(0);
  });

  it("blocks drinks that would pass the 5 litre daily limit", () => {
    expect(canAddWater(4750, 250)).toBe(true);
    expect(canAddWater(4900, 250)).toBe(false);
  });

  it("formats millilitres as litres", () => {
    expect(formatLiters(2500)).toBe("2.5");
    expect(formatLiters(0)).toBe("0.0");
  });
});
