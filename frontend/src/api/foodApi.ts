import { authedRequest } from "./authedRequest";
import type {
  CustomFoodInput,
  DayLog,
  FoodItem,
  FoodLogEntry,
  FoodScope,
  MealType,
  PageResponse,
} from "../types/food";

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
  getDay: (date: string) => authedRequest<DayLog>(`/food-log?date=${date}`),
  addEntry: (input: AddEntryInput) => authedRequest<FoodLogEntry>("/food-log", { method: "POST", body: input }),
  addQuickEntry: (input: QuickEntryInput) =>
    authedRequest<FoodLogEntry>("/food-log/quick", { method: "POST", body: input }),
  deleteEntry: (id: string) => authedRequest<void>(`/food-log/${id}`, { method: "DELETE" }),
};
