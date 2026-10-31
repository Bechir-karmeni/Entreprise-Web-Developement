import type { Recipe } from "./recipe";
import type { OnlineRecipe } from "./onlineRecipe";

export interface PromptRecommendation {
  /** Filters the prompt asked for, for example HIGH_PROTEIN or VEGETARIAN. */
  tags: string[];
  /** Words used to search by name. */
  keywords: string[];
  ownRecipes: Recipe[];
  onlineRecipes: OnlineRecipe[];
}

export interface OwnFridgeMatch {
  recipe: Recipe;
  matchedIngredients: number;
  totalIngredients: number;
}

export interface OnlineFridgeMatch {
  recipe: OnlineRecipe;
  matchedItems: number;
}

export interface FridgeRecommendation {
  items: string[];
  ownRecipes: OwnFridgeMatch[];
  onlineRecipes: OnlineFridgeMatch[];
}

export interface FridgeItem {
  id: string;
  name: string;
}
