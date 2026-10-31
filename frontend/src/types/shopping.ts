export type ShoppingCategory = "PROTEIN" | "DAIRY" | "PRODUCE" | "GRAINS_PANTRY" | "OTHER";

export const SHOPPING_CATEGORIES: ShoppingCategory[] = ["PROTEIN", "DAIRY", "PRODUCE", "GRAINS_PANTRY", "OTHER"];

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  checked: boolean;
  /** Price in cents, or null when no price is known. */
  priceCents: number | null;
  /** Barcode digits when the item came from a product, otherwise null. */
  barcode: string | null;
}

/** A recent shelf price from Open Prices. Community-reported, may be out of date. */
export interface PriceOffer {
  store: string;
  brand: string | null;
  priceCents: number;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  discounted: boolean;
  /** Product the price was matched to by name, or null for a barcode match. */
  product: string | null;
}

export interface ShoppingBudget {
  /** Budget in cents, or null when no budget is set. */
  amountCents: number | null;
}

export interface ShoppingItemInput {
  name: string;
  quantity: string;
  category: ShoppingCategory;
  barcode?: string;
}
