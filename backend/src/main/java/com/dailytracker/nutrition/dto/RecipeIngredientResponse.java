package com.dailytracker.nutrition.dto;

import java.util.UUID;

/** Amount of one food for the whole recipe. */
public record RecipeIngredientResponse(UUID foodId, String foodName, double grams) {
}
