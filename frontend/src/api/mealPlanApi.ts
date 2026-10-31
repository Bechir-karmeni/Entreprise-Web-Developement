import { authedRequest } from "./authedRequest";
import type { MealPlanEntry, MealPlanPreferences, MealPlanSetInput } from "../types/mealPlan";

export const mealPlanApi = {
  range: (from: string, to: string) => authedRequest<MealPlanEntry[]>(`/meal-plan?from=${from}&to=${to}`),
  set: (input: MealPlanSetInput) => authedRequest<MealPlanEntry>("/meal-plan", { method: "PUT", body: input }),
  clear: (id: string) => authedRequest<void>(`/meal-plan/${id}`, { method: "DELETE" }),
  preferences: () => authedRequest<MealPlanPreferences>("/meal-plan/preferences"),
  savePreferences: (input: MealPlanPreferences) =>
    authedRequest<MealPlanPreferences>("/meal-plan/preferences", { method: "PUT", body: input }),
};
