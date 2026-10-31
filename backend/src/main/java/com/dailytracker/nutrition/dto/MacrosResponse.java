package com.dailytracker.nutrition.dto;

/**
 * Calories and macros per serving of the matched recipe. All fields are null when no recipe with the exact name was found.
 */
public record MacrosResponse(String matchedName, Double calories, Double proteinG, Double carbsG, Double fatG) {
}
