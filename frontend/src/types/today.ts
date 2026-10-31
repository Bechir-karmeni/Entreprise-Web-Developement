import type { FoodLogEntry, MealType, NutrientTotals } from "./food";
import type { TargetsResponse } from "./nutrition";
import type { WaterDay } from "./water";

/** One meal block on the Today page. Matches MealSummary in the backend TodayResponse. */
export interface TodayMeal {
  meal: MealType;
  logged: boolean;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  entries: FoodLogEntry[];
}

/** The lunch suggestion as the backend sends it. Enum values are upper case. */
export interface ServerLunchSuggestion {
  status: "SUGGESTED" | "TARGET_REACHED";
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  focus: "PROTEIN" | "FIBER" | "BALANCED";
}

/** When the first and the last food of the day was logged. Logging times only, not eating times. */
export interface EatingWindow {
  firstLoggedAt: string;
  lastLoggedAt: string;
}

/** One vitamin or mineral for the day. Matches NutrientAmount in the backend. */
export interface NutrientAmount {
  /** Stable name from the backend, for example VITAMIN_C. Used to look up the label. */
  key: string;
  unit: string;
  amount: number;
  /** Null for sugars and saturated fat, which have no reference value. */
  referenceAmount: number | null;
  percentOfReference: number | null;
}

/** Vitamins and minerals of the day. Matches MicronutrientDay in the backend. */
export interface MicronutrientDay {
  entriesTotal: number;
  /** How many entries carried nutrient data; the amounts only count these. */
  entriesWithDetails: number;
  nutrients: NutrientAmount[];
}

/** Everything the Today page shows for one day. Matches TodayResponse in the backend. */
export interface TodayData {
  date: string;
  targets: TargetsResponse;
  totals: NutrientTotals;
  /** Target minus consumed. Negative when the day is over target. */
  remainingKcal: number;
  percentOfTarget: number;
  meals: TodayMeal[];
  water: WaterDay;
  /** Present only for today, when breakfast is logged and lunch is still empty. */
  lunchSuggestion: ServerLunchSuggestion | null;
  /** Null when nothing is logged. */
  eatingWindow: EatingWindow | null;
  micronutrients: MicronutrientDay;
}

/** The AI note about one day. Empty text means nothing was logged, so no note was written. */
export interface TodayCoachNote {
  generatedAt: string;
  text: string;
}
