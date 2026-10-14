package com.dailytracker.nutrition.dto;

public record NutrientTotals(
        int calories,
        double proteinGrams,
        double carbsGrams,
        double fatGrams,
        double fiberGrams
) {
}
