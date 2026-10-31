/** Same limit as the backend (WaterService.MAX_DAILY_ML). Drinking more can be dangerous. */
export const MAX_DAILY_ML = 5000;

/** Quick-add buttons in the water card. */
export const WATER_PRESETS_ML = [250, 500, 1000] as const;

/** Share of the daily goal reached, capped at 100. */
export function waterPercent(totalMl: number, goalMl: number): number {
  return goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;
}

/** True when adding this amount keeps the day within the safety limit. */
export function canAddWater(totalMl: number, amountMl: number): boolean {
  return totalMl + amountMl <= MAX_DAILY_ML;
}

/** Millilitres to litres with one decimal, for example 2500 becomes "2.5". */
export function formatLiters(ml: number): string {
  return (ml / 1000).toFixed(1);
}
