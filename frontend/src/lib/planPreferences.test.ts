import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, filterRecipes, mealsFor, nextDays, recipeAllowed } from "./planPreferences";
import type { Recipe } from "../types/recipe";
import type { MealPlanPreferences } from "../types/mealPlan";

function recipe(overrides: Partial<Recipe> & { ingredientNames?: string[] } = {}): Recipe {
  const { ingredientNames = [], ...rest } = overrides;
  return {
    id: rest.id ?? crypto.randomUUID(),
    name: rest.name ?? "Test recipe",
    description: "",
    servings: 1,
    prepMinutes: 10,
    tags: rest.tags ?? [],
    perServing: { calories: 400, proteinGrams: 30, carbsGrams: 40, fatGrams: 10, fiberGrams: 5 },
    steps: [],
    ingredients: ingredientNames.map((name, index) => ({ foodId: String(index), foodName: name, grams: 100, barcode: null })),
    allergens: rest.allergens ?? [],
    allergensKnown: rest.allergensKnown ?? true,
  };
}

const prefs = (overrides: Partial<MealPlanPreferences> = {}): MealPlanPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...overrides,
});

describe("recipeAllowed", () => {
  it("allows everything with the default answers", () => {
    expect(recipeAllowed(recipe({ allergens: ["MILK", "EGGS"] }), prefs())).toBe(true);
  });

  it("leaves out recipes with milk when the user eats no dairy", () => {
    expect(recipeAllowed(recipe({ allergens: ["MILK"] }), prefs({ dairy: "NONE" }))).toBe(false);
  });

  it("allows milk recipes only when every dairy ingredient is named lactose-free", () => {
    const lactoseFree = recipe({ allergens: ["MILK"], ingredientNames: ["Lactose-free milk", "Oats"] });
    const plainCheese = recipe({ allergens: ["MILK"], ingredientNames: ["Cheddar cheese"] });
    expect(recipeAllowed(lactoseFree, prefs({ dairy: "LACTOSE_FREE" }))).toBe(true);
    expect(recipeAllowed(plainCheese, prefs({ dairy: "LACTOSE_FREE" }))).toBe(false);
  });

  it("leaves out recipes with eggs when the user does not eat eggs", () => {
    expect(recipeAllowed(recipe({ allergens: ["EGGS"] }), prefs({ eggs: false }))).toBe(false);
  });

  it("keeps vegetarian answers strict: needs the VEGETARIAN tag and no fish", () => {
    expect(recipeAllowed(recipe({ tags: [] }), prefs({ vegetarian: true }))).toBe(false);
    expect(recipeAllowed(recipe({ tags: ["VEGETARIAN"], allergens: ["FISH"] }), prefs({ vegetarian: true }))).toBe(false);
    expect(recipeAllowed(recipe({ tags: ["VEGETARIAN"] }), prefs({ vegetarian: true }))).toBe(true);
  });

  it("matches excluded foods against the name and the ingredients, ignoring case", () => {
    const withMushrooms = recipe({ name: "Risotto", ingredientNames: ["Mushrooms, chestnut"] });
    expect(recipeAllowed(withMushrooms, prefs({ excludedFoods: "mushrooms" }))).toBe(false);
    expect(recipeAllowed(withMushrooms, prefs({ excludedFoods: " , " }))).toBe(true);
  });

  it("leaves out recipes with unknown allergens when any allergy limit applies", () => {
    const unknown = recipe({ allergensKnown: false });
    expect(recipeAllowed(unknown, prefs())).toBe(true);
    expect(recipeAllowed(unknown, prefs({ nuts: false }))).toBe(false);
  });
});

describe("filterRecipes, mealsFor and nextDays", () => {
  it("keeps only the allowed recipes", () => {
    const list = [recipe({ name: "A", allergens: ["GLUTEN"] }), recipe({ name: "B" })];
    expect(filterRecipes(list, prefs({ gluten: false })).map((item) => item.name)).toEqual(["B"]);
  });

  it("uses a snack slot only for four meals a day", () => {
    expect(mealsFor(3)).toEqual(["BREAKFAST", "LUNCH", "DINNER"]);
    expect(mealsFor(4)).toEqual(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
  });

  it("returns seven consecutive local days", () => {
    const days = nextDays(new Date(2026, 9, 30), 7);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-30");
    expect(days[6]).toBe("2026-11-05");
  });
});
