import { authedRequest } from "./authedRequest";
import type { ShoppingItem } from "../types/shopping";
import type { OnlineRecipe, OnlineRecipeOptions, OnlineRecipePage, SavedOnlineRecipe } from "../types/onlineRecipe";

export interface OnlineRecipeFilterValues {
  search: string;
  category: string;
  area: string;
}

/** Builds "?a=b&c=d" from the non-empty values. */
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const onlineRecipeApi = {
  search: (filters: OnlineRecipeFilterValues, page: number) =>
    authedRequest<OnlineRecipePage>(
      `/online-recipes${query({ search: filters.search, category: filters.category, area: filters.area, page })}`,
    ),
  random: () => authedRequest<OnlineRecipe>("/online-recipes/random"),
  /** Recipes that Gemini writes for the request. They can be opened, saved and added to the shopping list for an hour. */
  generate: (request: string) =>
    authedRequest<OnlineRecipe[]>("/online-recipes/generate", { method: "POST", body: { request } }),
  options: () => authedRequest<OnlineRecipeOptions>("/online-recipes/options"),
  detail: (id: number) => authedRequest<OnlineRecipe>(`/online-recipes/${id}`),
  saved: () => authedRequest<SavedOnlineRecipe[]>("/online-recipes/saved"),
  save: (id: number) => authedRequest<SavedOnlineRecipe>("/online-recipes/saved", { method: "POST", body: { id } }),
  remove: (savedId: string) => authedRequest<void>(`/online-recipes/saved/${savedId}`, { method: "DELETE" }),
  /** Adds the ingredients at these positions (all when omitted) to the shopping list. */
  addToShopping: (id: number, ingredientIndexes?: number[]) =>
    authedRequest<ShoppingItem[]>(`/online-recipes/${id}/shopping`, { method: "POST", body: { ingredientIndexes } }),
};
