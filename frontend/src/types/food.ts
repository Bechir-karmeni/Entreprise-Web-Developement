export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type FoodSource = "LOCAL" | "OPEN_FOOD_FACTS" | "USDA" | "CUSTOM";

/** COMMON = shared foods; CUSTOM = the user's own foods. */
export type FoodScope = "COMMON" | "CUSTOM";

export type ServingUnit = "g" | "ml" | "piece";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** A food from our database, an online source, or the user's own list. Values are per serving. */
export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  category: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  ingredients: string | null;
  allergens: string[];
  allergensKnown: boolean;
}

export interface CustomFoodInput {
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: ServingUnit;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  allergens: string[];
}

export interface NutrientTotals {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface FoodLogEntry {
  id: string;
  date: string;
  mealType: MealType;
  foodId: string | null;
  foodName: string;
  amount: number;
  servingUnit: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  /** When the food was logged (ISO time), not when it was eaten. */
  loggedAt: string;
}

export interface DayLog {
  date: string;
  totals: NutrientTotals;
  entries: FoodLogEntry[];
}
