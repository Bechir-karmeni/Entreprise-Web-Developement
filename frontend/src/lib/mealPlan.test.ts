import { describe, expect, it } from "vitest";
import type { MealPlanEntry } from "../types/mealPlan";
import type { Recipe } from "../types/recipe";
import { dayTotals, fillPlan, planToCsv, shoppingFromPlan, slotKey, startOfWeek, weekDates, type DailyTargets } from "./mealPlan";

function recipe(id: string, calories: number, servings = 1, ingredients: Recipe["ingredients"] = []): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    description: "",
    servings,
    prepMinutes: 10,
    tags: [],
    perServing: { calories, proteinGrams: 20, carbsGrams: 30, fatGrams: 10, fiberGrams: 5 },
    steps: [],
    ingredients,
    allergens: [],
    allergensKnown: true,
  };
}

function recipeWith(id: string, perServing: Recipe["perServing"]): Recipe {
  return { ...recipe(id, 0), perServing };
}

const WEEK = weekDates(new Date(2026, 9, 26)); // Monday 26 Oct 2026 (local)
const DAILY: DailyTargets = { calories: 2000, proteinGrams: 150, carbsGrams: 200, fatGrams: 70 };
// Dinner is 30 % of the day: 600 kcal, 45 g protein, 60 g carbs, 21 g fat.

describe("startOfWeek and weekDates", () => {
  it("starts the week on Monday", () => {
    const sunday = new Date(2026, 9, 25);
    expect(startOfWeek(sunday).getDate()).toBe(19);
    expect(startOfWeek(new Date(2026, 9, 26)).getDate()).toBe(26);
  });

  it("lists seven consecutive dates", () => {
    expect(WEEK).toHaveLength(7);
    expect(WEEK[0]).toBe("2026-10-26");
    expect(WEEK[6]).toBe("2026-11-01");
  });
});

describe("fillPlan", () => {
  it("fills every empty slot and keeps existing ones", () => {
    const existing: MealPlanEntry[] = [{ id: "e1", date: WEEK[0], mealType: "BREAKFAST", recipeId: "a" }];
    const planned = fillPlan(WEEK, existing, [recipe("a", 400), recipe("b", 600)], DAILY);
    expect(planned).toHaveLength(7 * 4 - 1);
    expect(planned.some((slot) => slotKey(slot.date, slot.mealType) === slotKey(WEEK[0], "BREAKFAST"))).toBe(false);
  });

  it("picks the recipe closest to the calorie target of the meal that is still empty", () => {
    const others: MealPlanEntry[] = ["BREAKFAST", "LUNCH", "SNACK"].map((meal, index) => ({
      id: `o${index}`,
      date: WEEK[0],
      mealType: meal as MealPlanEntry["mealType"],
      recipeId: "other",
    }));
    const planned = fillPlan([WEEK[0]], others, [recipe("small", 200), recipe("big", 700)], DAILY);
    expect(planned).toEqual([{ date: WEEK[0], mealType: "DINNER", recipeId: "big" }]);
  });

  it("uses protein as well as calories when two recipes have the same calories", () => {
    const others: MealPlanEntry[] = ["BREAKFAST", "LUNCH", "SNACK"].map((meal, index) => ({
      id: `o${index}`,
      date: WEEK[0],
      mealType: meal as MealPlanEntry["mealType"],
      recipeId: "other",
    }));
    const proteinMatch = recipeWith("protein-match", { calories: 600, proteinGrams: 45, carbsGrams: 60, fatGrams: 21, fiberGrams: 5 });
    const proteinLow = recipeWith("protein-low", { calories: 600, proteinGrams: 5, carbsGrams: 60, fatGrams: 21, fiberGrams: 5 });
    const planned = fillPlan([WEEK[0]], others, [proteinLow, proteinMatch], DAILY);
    expect(planned).toEqual([{ date: WEEK[0], mealType: "DINNER", recipeId: "protein-match" }]);
  });

  it("returns nothing when there are no recipes", () => {
    expect(fillPlan(WEEK, [], [], DAILY)).toEqual([]);
  });
});

describe("dayTotals", () => {
  it("sums the planned recipes and skips unknown ones", () => {
    const byId = new Map([["a", recipe("a", 400)], ["b", recipe("b", 250)]]);
    const entries: MealPlanEntry[] = [
      { id: "1", date: WEEK[0], mealType: "BREAKFAST", recipeId: "a" },
      { id: "2", date: WEEK[0], mealType: "SNACK", recipeId: "b" },
      { id: "3", date: WEEK[0], mealType: "LUNCH", recipeId: "missing" },
    ];
    const totals = dayTotals(entries, byId);
    expect(totals.calories).toBe(650);
    expect(totals.planned).toBe(2);
    expect(totals.proteinGrams).toBe(40);
  });
});

describe("shoppingFromPlan", () => {
  it("takes one serving's share of each ingredient and sums across meals", () => {
    const oats = { foodId: "oats", foodName: "Oats", grams: 80, barcode: null };
    const byId = new Map([["a", recipe("a", 300, 2, [oats])]]);
    const entries: MealPlanEntry[] = [
      { id: "1", date: WEEK[0], mealType: "BREAKFAST", recipeId: "a" },
      { id: "2", date: WEEK[1], mealType: "BREAKFAST", recipeId: "a" },
    ];
    expect(shoppingFromPlan(entries, byId)).toEqual([{ foodId: "oats", name: "Oats", grams: 80 }]);
  });
});

describe("planToCsv", () => {
  it("returns null when nothing is planned", () => {
    expect(planToCsv(WEEK, [], new Map())).toBeNull();
  });

  it("writes one row per planned meal and quotes names with commas", () => {
    const named = { ...recipe("a", 500), name: 'Oats, honey "classic"' };
    const byId = new Map([["a", named]]);
    const entries: MealPlanEntry[] = [{ id: "1", date: WEEK[0], mealType: "BREAKFAST", recipeId: "a" }];
    const csv = planToCsv(WEEK, entries, byId);
    expect(csv).toBe(
      'date,meal,recipe,kcal,protein_g,carbs_g,fat_g\r\n2026-10-26,BREAKFAST,"Oats, honey ""classic""",500,20,30,10',
    );
  });
});
