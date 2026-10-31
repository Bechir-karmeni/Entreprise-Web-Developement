export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  /** Amount for the whole recipe, in the food's serving unit. */
  grams: number;
  /** Barcode for foods from Open Food Facts, so the shopping list can find store prices. Null otherwise. */
  barcode: string | null;
}

export interface RecipeNutrition {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  prepMinutes: number;
  tags: string[];
  perServing: RecipeNutrition;
  steps: string[];
  ingredients: RecipeIngredient[];
  /** Allergens of any ingredient, as allergen names (for example "MILK"). */
  allergens: string[];
  /** False when an ingredient has no allergen information, so an empty list is not a statement that the recipe is safe. */
  allergensKnown: boolean;
}
