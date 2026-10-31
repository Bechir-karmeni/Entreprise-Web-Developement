import type { ProfileResponse } from "../types/profile";
import type { Recipe } from "../types/recipe";

export type Goal = ProfileResponse["goal"];

/**
 * Whether one serving suits the user's goal. The thresholds are simple rules, not medical advice:
 * - lose weight: at most 500 kcal per serving
 * - gain weight or build muscle: at least 25 g protein per serving
 * - maintain weight: between 300 and 700 kcal per serving
 * - healthy eating: at least 5 g fibre per serving
 */
export function fitsGoal(recipe: Recipe, goal: Goal): boolean {
  const { calories, proteinGrams, fiberGrams } = recipe.perServing;
  switch (goal) {
    case "LOSE_WEIGHT":
      return calories <= 500;
    case "GAIN_WEIGHT":
    case "GAIN_MUSCLE":
      return proteinGrams >= 25;
    case "MAINTAIN_WEIGHT":
      return calories >= 300 && calories <= 700;
    case "GENERAL_HEALTHY_EATING":
      return fiberGrams >= 5;
    default:
      return false;
  }
}
