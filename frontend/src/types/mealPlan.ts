export type PlanMeal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

/** One planned meal. Dates are local calendar days in yyyy-MM-dd form. */
export interface MealPlanEntry {
  id: string;
  date: string;
  mealType: PlanMeal;
  recipeId: string;
}

export type DairyChoice = "ALL" | "LACTOSE_FREE" | "NONE";

/** The answers to the Generate Plan questions, saved on the account. */
export interface MealPlanPreferences {
  vegetarian: boolean;
  dairy: DairyChoice;
  eggs: boolean;
  nuts: boolean;
  gluten: boolean;
  fish: boolean;
  excludedFoods: string;
  mealsPerDay: number;
}

export interface MealPlanSetInput {
  date: string;
  mealType: PlanMeal;
  recipeId: string;
}
