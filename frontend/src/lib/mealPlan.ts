import { localDateIso } from "./foodLog";
import { MEAL_SHARE } from "./profile";
import type { MealPlanEntry, PlanMeal } from "../types/mealPlan";
import type { Recipe } from "../types/recipe";

export const PLAN_MEALS: PlanMeal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

/** Daily targets from the profile, as returned by the targets endpoint. */
export interface DailyTargets {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

/** The part of the daily targets that one meal should carry. */
export type MealTargets = DailyTargets;

/** Monday of the week that contains the given date. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** The seven local dates (yyyy-MM-dd) that start at the given Monday. */
export function weekDates(start: Date): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    localDateIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)),
  );
}

export function slotKey(date: string, meal: PlanMeal): string {
  return `${date}|${meal}`;
}

/** The calories and macros one meal should carry, from the daily targets and the meal split in the profile. */
export function mealTargets(daily: DailyTargets, meal: PlanMeal): MealTargets {
  const share = MEAL_SHARE[meal];
  return {
    calories: Math.round(daily.calories * share),
    proteinGrams: Math.round(daily.proteinGrams * share),
    carbsGrams: Math.round(daily.carbsGrams * share),
    fatGrams: Math.round(daily.fatGrams * share),
  };
}

/**
 * How far a recipe is from a meal's targets: the sum of the relative differences for calories, protein, carbs and fat.
 * Zero means a perfect match. A goal below 1 is treated as 1 so that tiny goals do not dominate the score.
 */
export function mealMismatch(recipe: Recipe, target: MealTargets): number {
  const off = (actual: number, goal: number) => Math.abs(actual - goal) / Math.max(goal, 1);
  const { perServing } = recipe;
  return (
    off(perServing.calories, target.calories) +
    off(perServing.proteinGrams, target.proteinGrams) +
    off(perServing.carbsGrams, target.carbsGrams) +
    off(perServing.fatGrams, target.fatGrams)
  );
}

export interface PlannedSlot {
  date: string;
  mealType: PlanMeal;
  recipeId: string;
}

/**
 * Chooses a recipe for every empty slot of the week. For each slot it picks the recipe whose calories and macros
 * are closest to that meal's targets, preferring recipes not yet used this week so the plan does not repeat itself.
 * Slots that already have a recipe are left alone.
 */
export function fillPlan(
  days: string[],
  entries: MealPlanEntry[],
  recipes: Recipe[],
  daily: DailyTargets,
  meals: PlanMeal[] = PLAN_MEALS,
): PlannedSlot[] {
  if (recipes.length === 0) return [];
  const filled = new Set(entries.map((entry) => slotKey(entry.date, entry.mealType)));
  const used = new Set(entries.map((entry) => entry.recipeId));
  const planned: PlannedSlot[] = [];

  for (const date of days) {
    for (const meal of meals) {
      if (filled.has(slotKey(date, meal))) continue;
      const target = mealTargets(daily, meal);
      const ranked = [...recipes].sort((a, b) => mealMismatch(a, target) - mealMismatch(b, target));
      const choice = ranked.find((recipe) => !used.has(recipe.id)) ?? ranked[0];
      used.add(choice.id);
      planned.push({ date, mealType: meal, recipeId: choice.id });
    }
  }
  return planned;
}

export interface DayTotals {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  planned: number;
}

/** Totals of the planned meals for one day. One planned meal is one portion of its recipe. */
export function dayTotals(entries: MealPlanEntry[], recipesById: Map<string, Recipe>): DayTotals {
  const totals: DayTotals = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, planned: 0 };
  for (const entry of entries) {
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) continue;
    totals.calories += recipe.perServing.calories;
    totals.proteinGrams += recipe.perServing.proteinGrams;
    totals.carbsGrams += recipe.perServing.carbsGrams;
    totals.fatGrams += recipe.perServing.fatGrams;
    totals.planned += 1;
  }
  return {
    ...totals,
    proteinGrams: Math.round(totals.proteinGrams * 10) / 10,
    carbsGrams: Math.round(totals.carbsGrams * 10) / 10,
    fatGrams: Math.round(totals.fatGrams * 10) / 10,
  };
}

export interface ShoppingNeed {
  foodId: string;
  name: string;
  grams: number;
}

/** Ingredients the planned meals need, summed over the week. Each planned meal takes one serving's share of a recipe. */
export function shoppingFromPlan(entries: MealPlanEntry[], recipesById: Map<string, Recipe>): ShoppingNeed[] {
  const needs = new Map<string, ShoppingNeed>();
  for (const entry of entries) {
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) continue;
    const share = 1 / Math.max(recipe.servings, 1);
    for (const ingredient of recipe.ingredients) {
      const current = needs.get(ingredient.foodId) ?? { foodId: ingredient.foodId, name: ingredient.foodName, grams: 0 };
      current.grams += ingredient.grams * share;
      needs.set(ingredient.foodId, current);
    }
  }
  return [...needs.values()]
    .map((need) => ({ ...need, grams: Math.round(need.grams) }))
    .filter((need) => need.grams > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface PlanRow {
  date: string;
  meal: PlanMeal;
  recipe: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

/** One row per planned meal, in day and meal order. Shared by the CSV and PDF exports. */
export function planRows(days: string[], entries: MealPlanEntry[], recipesById: Map<string, Recipe>): PlanRow[] {
  const bySlot = new Map(entries.map((entry) => [slotKey(entry.date, entry.mealType), entry]));
  const rows: PlanRow[] = [];
  for (const date of days) {
    for (const meal of PLAN_MEALS) {
      const entry = bySlot.get(slotKey(date, meal));
      const recipe = entry ? recipesById.get(entry.recipeId) : undefined;
      if (!recipe) continue;
      rows.push({
        date,
        meal,
        recipe: recipe.name,
        kcal: recipe.perServing.calories,
        proteinGrams: recipe.perServing.proteinGrams,
        carbsGrams: recipe.perServing.carbsGrams,
        fatGrams: recipe.perServing.fatGrams,
      });
    }
  }
  return rows;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The week as CSV, one row per planned meal in day and meal order. Returns null when nothing is planned.
 * Headers and meal names stay in English so the file can be read by spreadsheet tools in any language.
 */
export function planToCsv(days: string[], entries: MealPlanEntry[], recipesById: Map<string, Recipe>): string | null {
  const planned = planRows(days, entries, recipesById);
  if (planned.length === 0) return null;
  const header = ["date", "meal", "recipe", "kcal", "protein_g", "carbs_g", "fat_g"];
  const rows = planned.map((row) => [row.date, row.meal, row.recipe, row.kcal, row.proteinGrams, row.carbsGrams, row.fatGrams]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
