import { describe, expect, it } from "vitest";
import { formatAmount, labelOf } from "./onlineRecipeLabels";

describe("online recipe labels", () => {
  it("turns service values into readable labels", () => {
    expect(labelOf("side_dish")).toBe("Side dish");
    expect(labelOf("french")).toBe("French");
  });

  it("shows whole amounts without decimals and rounds the rest to one decimal", () => {
    expect(formatAmount(1500)).toBe("1500");
    expect(formatAmount(0.5)).toBe("0.5");
    expect(formatAmount(1.25)).toBe("1.3");
  });
});
