export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  /** Amount for the whole recipe, in grams. */
  grams: number;
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
}
