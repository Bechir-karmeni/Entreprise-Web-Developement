/** Recipes from TheMealDB. Search results with only a name and picture have null category, area and ingredients. */
export interface OnlineIngredient {
  name: string;
  /** The measure as the source writes it, for example "2 tbsp". Can be empty. */
  measure: string;
}

export interface OnlineRecipe {
  id: number;
  name: string;
  category: string | null;
  area: string | null;
  thumbnail: string | null;
  instructions: string[];
  ingredients: OnlineIngredient[];
  youtube: string | null;
  source: string | null;
}

export interface OnlineRecipePage {
  items: OnlineRecipe[];
  page: number;
  lastPage: number;
  total: number;
}

export interface OnlineRecipeOptions {
  categories: string[];
  areas: string[];
}

export interface SavedOnlineRecipe {
  id: string;
  recipe: OnlineRecipe;
}
