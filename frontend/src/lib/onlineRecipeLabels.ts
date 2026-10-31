/** "side_dish" becomes "Side dish", "french" becomes "French". For values the recipe service sends in English. */
export function labelOf(value: string): string {
  const spaced = value.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Whole numbers without decimals, other amounts rounded to one decimal. */
export function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
