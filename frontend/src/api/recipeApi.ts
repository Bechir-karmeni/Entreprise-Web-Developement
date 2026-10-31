import { authedRequest } from "./authedRequest";
import type { Recipe } from "../types/recipe";
import type { ShoppingItem } from "../types/shopping";

export const recipeApi = {
  list: () => authedRequest<Recipe[]>("/recipes"),
  get: (id: string) => authedRequest<Recipe>(`/recipes/${id}`),
  /** Adds the chosen ingredients (all when foodIds is omitted) to the shopping list. */
  addToShopping: (id: string, input: { portions: number; foodIds?: string[] }) =>
    authedRequest<ShoppingItem[]>(`/recipes/${id}/shopping`, { method: "POST", body: input }),
};
