import { foodApi } from "../api/foodApi";
import type { Recipe } from "../types/recipe";
import { defaultMealFor, localDateIso } from "./foodLog";

/**
 * Logs portions of a recipe. Each ingredient becomes one food-log entry with its share
 * of the recipe (one portion = grams / servings).
 */
export async function logRecipePortions(recipe: Recipe, portions: number): Promise<void> {
  const now = new Date();
  const mealType = defaultMealFor(now.getHours());
  const date = localDateIso(now);
  for (const ingredient of recipe.ingredients) {
    const amount = Math.round((ingredient.grams / recipe.servings) * portions * 10) / 10;
    await foodApi.addEntry({ foodId: ingredient.foodId, mealType, date, amount });
  }
}
