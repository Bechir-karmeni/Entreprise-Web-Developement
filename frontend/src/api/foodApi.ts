import { authedRequest } from "./authedRequest";
import type {
  CustomFoodInput,
  DayLog,
  FoodItem,
  FoodLogEntry,
  FoodScope,
  MealType,
  NutrientTotals,
  PageResponse,
} from "../types/food";

/** Nutrient totals for one day that has food logged. Days without entries are not returned. */
export interface DailyTotal {
  date: string;
  totals: NutrientTotals;
}

export interface AddEntryInput {
  foodId: string;
  mealType: MealType;
  date: string;
  amount: number;
}

export interface QuickEntryInput {
  mealType: MealType;
  date: string;
  name: string | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export const foodApi = {
  search: (query: string, scope: FoodScope) =>
    authedRequest<PageResponse<FoodItem>>(
      `/foods?query=${encodeURIComponent(query)}&scope=${scope}&size=20`,
    ),
  searchOnline: (query: string) => authedRequest<FoodItem[]>(`/foods/online?query=${encodeURIComponent(query)}`),
  createFood: (input: CustomFoodInput) => authedRequest<FoodItem>("/foods", { method: "POST", body: input }),
  deleteFood: (id: string) => authedRequest<void>(`/foods/${id}`, { method: "DELETE" }),
  /** The user's starred foods, most recently starred first. */
  favorites: () => authedRequest<FoodItem[]>("/foods/favorites"),
  setFavorite: (id: string, favorite: boolean) =>
    authedRequest<void>(`/foods/${id}/favorite`, { method: favorite ? "PUT" : "DELETE" }),
  /** Looks up a product by barcode (6 to 14 digits). The server saves it so it can be logged. */
  barcode: (code: string) => authedRequest<FoodItem>(`/foods/barcode/${encodeURIComponent(code)}`),
  /** Totals per day from `from` to `to` (inclusive, at most one year). */
  range: (from: string, to: string) => authedRequest<DailyTotal[]>(`/food-log/range?from=${from}&to=${to}`),
  getDay: (date: string) => authedRequest<DayLog>(`/food-log?date=${date}`),
  addEntry: (input: AddEntryInput) => authedRequest<FoodLogEntry>("/food-log", { method: "POST", body: input }),
  addQuickEntry: (input: QuickEntryInput) =>
    authedRequest<FoodLogEntry>("/food-log/quick", { method: "POST", body: input }),
  deleteEntry: (id: string) => authedRequest<void>(`/food-log/${id}`, { method: "DELETE" }),
  /** Changes how much of an entry was eaten. The server scales the values to the new amount. */
  updateEntryAmount: (id: string, amount: number) =>
    authedRequest<FoodLogEntry>(`/food-log/${id}`, { method: "PATCH", body: { amount } }),
};
