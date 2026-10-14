export type ShoppingCategory = "PROTEIN" | "DAIRY" | "PRODUCE" | "GRAINS_PANTRY" | "OTHER";

export const SHOPPING_CATEGORIES: ShoppingCategory[] = ["PROTEIN", "DAIRY", "PRODUCE", "GRAINS_PANTRY", "OTHER"];

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  checked: boolean;
}

export interface ShoppingItemInput {
  name: string;
  quantity: string;
  category: ShoppingCategory;
}
