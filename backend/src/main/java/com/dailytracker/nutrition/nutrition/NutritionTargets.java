package com.dailytracker.nutrition.nutrition;

/**
 * Daily targets. BMR and TDEE are shown for transparency; the other values are the daily goals.
 *
 * @param minimumCaloriesApplied true when the calculated calories were below the configured minimum
 *                               and the minimum was used instead
 */
public record NutritionTargets(
        int bmr,
        int tdee,
        int calories,
        int proteinGrams,
        int carbsGrams,
        int fatGrams,
        int fiberGrams,
        double waterLiters,
        boolean minimumCaloriesApplied) {
}
