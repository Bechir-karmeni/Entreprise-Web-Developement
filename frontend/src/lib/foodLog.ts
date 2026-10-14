import type { CustomFoodInput, MealType, ServingUnit } from "../types/food";

export const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

/** The allergens we track, in the same order as the backend enum. */
export const ALLERGEN_OPTIONS = [
  "PEANUTS",
  "TREE_NUTS",
  "MILK",
  "EGGS",
  "SOY",
  "GLUTEN",
  "WHEAT",
  "FISH",
  "SHELLFISH",
  "SESAME",
];

/** The meal most likely to be logged at this local hour. */
export function defaultMealFor(hour: number): MealType {
  if (hour < 10) return "BREAKFAST";
  if (hour < 15) return "LUNCH";
  if (hour < 18) return "SNACK";
  return "DINNER";
}

/** Local calendar date as YYYY-MM-DD, so the day matches the user's clock rather than UTC. */
export function localDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Reads a number typed by the user (a comma is accepted as decimal separator). Returns null if it is not a number. */
export function toNumber(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text.replace(",", ".").trim());
  return Number.isFinite(value) ? value : null;
}

/** Reads an amount for the food log. Returns null if it is not between 0 and 5000. */
export function parseAmount(text: string): number | null {
  const value = toNumber(text);
  if (value === null || value <= 0 || value > 5000) return null;
  return value;
}

/** Turns an allergen name such as TREE_NUTS into readable text: "tree nuts". */
export function formatAllergen(name: string): string {
  return name.toLowerCase().replace(/_/g, " ");
}

export interface CustomFoodForm {
  name: string;
  brand: string;
  servingSize: string;
  servingUnit: ServingUnit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  allergens: string[];
}

export type CustomFoodResult = { ok: true; input: CustomFoodInput } | { ok: false; error: "name" | "numbers" };

/** Checks the form for a custom food and converts it to the API format. */
export function buildCustomFood(form: CustomFoodForm): CustomFoodResult {
  const name = form.name.trim();
  if (name === "" || name.length > 150) return { ok: false, error: "name" };

  const servingSize = toNumber(form.servingSize);
  const calories = toNumber(form.calories);
  const protein = toNumber(form.protein);
  const carbs = toNumber(form.carbs);
  const fat = toNumber(form.fat);
  const fiber = toNumber(form.fiber);
  if (servingSize === null || calories === null || protein === null || carbs === null || fat === null || fiber === null) {
    return { ok: false, error: "numbers" };
  }
  if (servingSize <= 0 || servingSize > 5000 || calories < 0 || calories > 5000) {
    return { ok: false, error: "numbers" };
  }
  if ([protein, carbs, fat, fiber].some((value) => value < 0 || value > 1000)) {
    return { ok: false, error: "numbers" };
  }

  return {
    ok: true,
    input: {
      name,
      brand: form.brand.trim() === "" ? null : form.brand.trim(),
      servingSize,
      servingUnit: form.servingUnit,
      calories: Math.round(calories),
      proteinGrams: protein,
      carbsGrams: carbs,
      fatGrams: fat,
      fiberGrams: fiber,
      allergens: form.allergens,
    },
  };
}
