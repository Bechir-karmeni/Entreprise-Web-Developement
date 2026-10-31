/** Largest price the app accepts, in cents (10,000 euros). */
export const MAX_PRICE_CENTS = 1_000_000;

/**
 * Turns an amount typed in euros ("2,50", "2.5" or "12") into cents.
 * Empty input means no price (null). Returns undefined when the text is not a valid amount.
 */
export function parseEuroToCents(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,5}([.,]\d{1,2})?$/.test(trimmed)) return undefined;
  const cents = Math.round(Number(trimmed.replace(",", ".")) * 100);
  return cents <= MAX_PRICE_CENTS ? cents : undefined;
}

/** Shows an amount in cents as euros in the given locale, for example "2,50 €" (de) or "€2.50" (en). */
export function formatEuro(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}
