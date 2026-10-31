/** Same range as the backend validation for a weigh-in. */
export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 300;

export function isValidWeight(kg: number): boolean {
  return Number.isFinite(kg) && kg >= MIN_WEIGHT_KG && kg <= MAX_WEIGHT_KG;
}

/** Change from the first to the last weigh-in in kg, one decimal. Entries must be sorted oldest first. */
export function weightChange(entries: { weightKg: number }[]): number | null {
  if (entries.length < 2) return null;
  const change = entries[entries.length - 1].weightKg - entries[0].weightKg;
  return Math.round(change * 10) / 10;
}
