import type { MealPlanPreferences, PlanMeal } from "../types/mealPlan";
import type { Recipe } from "../types/recipe";
import { localDateIso } from "./foodLog";

export const DEFAULT_PREFERENCES: MealPlanPreferences = {
  vegetarian: false,
  dairy: "ALL",
  eggs: true,
  nuts: true,
  gluten: true,
  fish: true,
  excludedFoods: "",
  mealsPerDay: 3,
};

/** Ingredient names that contain milk. Used to check the lactose-free answer. */
const DAIRY_WORDS = /milk|cheese|yog|butter|cream|quark|whey|kefir|mozzarella|feta|parmesan|paneer|ricotta/i;

/** The foods the user does not want, as lowercase words. Empty entries are dropped. */
export function excludedTerms(text: string): string[] {
  return text
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);
}

/** A recipe is allowed when none of its ingredients breaks an answer. */
export function recipeAllowed(recipe: Recipe, prefs: MealPlanPreferences): boolean {
  const allergens = new Set(recipe.allergens);
  const hasAllergyLimit =
    !prefs.eggs || !prefs.nuts || !prefs.gluten || !prefs.fish || prefs.dairy !== "ALL";
  // Without allergen information the recipe cannot be shown as safe, so it is left out when a limit applies.
  if (hasAllergyLimit && !recipe.allergensKnown) return false;

  if (prefs.vegetarian && (!recipe.tags.includes("VEGETARIAN") || allergens.has("FISH") || allergens.has("SHELLFISH"))) {
    return false;
  }
  if (prefs.dairy === "NONE" && allergens.has("MILK")) return false;
  if (prefs.dairy === "LACTOSE_FREE" && allergens.has("MILK") && !onlyLactoseFreeDairy(recipe)) return false;
  if (!prefs.eggs && allergens.has("EGGS")) return false;
  if (!prefs.nuts && (allergens.has("TREE_NUTS") || allergens.has("PEANUTS"))) return false;
  if (!prefs.gluten && (allergens.has("GLUTEN") || allergens.has("WHEAT"))) return false;
  if (!prefs.fish && (allergens.has("FISH") || allergens.has("SHELLFISH"))) return false;

  const terms = excludedTerms(prefs.excludedFoods);
  if (terms.length > 0) {
    const names = [recipe.name, ...recipe.ingredients.map((ingredient) => ingredient.foodName)].map((name) =>
      name.toLowerCase(),
    );
    if (terms.some((term) => names.some((name) => name.includes(term)))) return false;
  }
  return true;
}

/**
 * Lactose-free answer: a recipe with milk products is allowed only when it names a lactose-free
 * product for every dairy ingredient. Hidden milk in foods without a name is not detectable.
 */
function onlyLactoseFreeDairy(recipe: Recipe): boolean {
  const dairyNames = recipe.ingredients
    .map((ingredient) => ingredient.foodName)
    .filter((name) => DAIRY_WORDS.test(name));
  if (dairyNames.length === 0) return false;
  return dairyNames.every((name) => /lactose[\s-]*free/i.test(name));
}

export function filterRecipes(recipes: Recipe[], prefs: MealPlanPreferences): Recipe[] {
  return recipes.filter((recipe) => recipeAllowed(recipe, prefs));
}

/** Meal slots used by a day, for the number of meals the user picked. */
export function mealsFor(mealsPerDay: number): PlanMeal[] {
  return mealsPerDay >= 4 ? ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] : ["BREAKFAST", "LUNCH", "DINNER"];
}

/** Local calendar days, starting at the given day, as yyyy-MM-dd. */
export function nextDays(start: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return localDateIso(day);
  });
}
