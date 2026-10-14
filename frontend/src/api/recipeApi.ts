import { authedRequest } from "./authedRequest";
import type { Recipe } from "../types/recipe";

export const recipeApi = {
  list: () => authedRequest<Recipe[]>("/recipes"),
  get: (id: string) => authedRequest<Recipe>(`/recipes/${id}`),
};
