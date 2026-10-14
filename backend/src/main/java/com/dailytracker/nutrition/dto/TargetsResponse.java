package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.nutrition.NutritionTargets;

public record TargetsResponse(
        int calories,
        int proteinGrams,
        int carbsGrams,
        int fatGrams,
        int fiberGrams,
        double waterLiters,
        int bmr,
        int tdee,
        boolean minimumCaloriesApplied,
        String disclaimer
) {
    public static final String DISCLAIMER =
            "These values are estimates from a standard formula. They are not medical advice.";

    public static TargetsResponse from(NutritionTargets targets) {
        return new TargetsResponse(
                targets.calories(),
                targets.proteinGrams(),
                targets.carbsGrams(),
                targets.fatGrams(),
                targets.fiberGrams(),
                targets.waterLiters(),
                targets.bmr(),
                targets.tdee(),
                targets.minimumCaloriesApplied(),
                DISCLAIMER);
    }
}
