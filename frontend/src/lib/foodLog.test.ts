import { describe, expect, it } from "vitest";
import { buildCustomFood, defaultMealFor, formatAllergen, localDateIso, parseAmount, type CustomFoodForm } from "./foodLog";

const validForm: CustomFoodForm = {
  name: "  Quinoa salad  ",
  brand: "",
  servingSize: "150",
  servingUnit: "g",
  calories: "210",
  protein: "7",
  carbs: "33",
  fat: "9",
  fiber: "4",
  allergens: ["TREE_NUTS"],
};

describe("food log helpers", () => {
  it("suggests a meal from the hour of the day", () => {
    expect(defaultMealFor(8)).toBe("BREAKFAST");
    expect(defaultMealFor(12)).toBe("LUNCH");
    expect(defaultMealFor(16)).toBe("SNACK");
    expect(defaultMealFor(20)).toBe("DINNER");
  });

  it("formats the local date as YYYY-MM-DD", () => {
    expect(localDateIso(new Date(2026, 9, 9, 23, 30))).toBe("2026-10-09");
  });

  it("accepts comma or dot decimals and rejects invalid amounts", () => {
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount("150")).toBe(150);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("6000")).toBeNull();
  });

  it("makes allergen names readable", () => {
    expect(formatAllergen("TREE_NUTS")).toBe("tree nuts");
  });

  it("builds a custom food from a valid form", () => {
    const result = buildCustomFood(validForm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.name).toBe("Quinoa salad");
      expect(result.input.brand).toBeNull();
      expect(result.input.calories).toBe(210);
      expect(result.input.allergens).toEqual(["TREE_NUTS"]);
    }
  });

  it("rejects a custom food without a name", () => {
    expect(buildCustomFood({ ...validForm, name: "   " })).toEqual({ ok: false, error: "name" });
  });

  it("rejects missing or out-of-range numbers", () => {
    expect(buildCustomFood({ ...validForm, servingSize: "0" })).toEqual({ ok: false, error: "numbers" });
    expect(buildCustomFood({ ...validForm, protein: "" })).toEqual({ ok: false, error: "numbers" });
    expect(buildCustomFood({ ...validForm, fat: "-1" })).toEqual({ ok: false, error: "numbers" });
  });
});
