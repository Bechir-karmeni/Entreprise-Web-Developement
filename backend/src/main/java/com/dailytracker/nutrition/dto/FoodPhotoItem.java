package com.dailytracker.nutrition.dto;

/** One food that the photo analysis found, with its estimated amount and nutrition for that amount. */
public record FoodPhotoItem(
        String name,
        double grams,
        double calories,
        double proteinGrams,
        double carbsGrams,
        double fatGrams,
        double fiberGrams
) {
}
