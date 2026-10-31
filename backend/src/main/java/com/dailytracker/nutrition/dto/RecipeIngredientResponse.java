package com.dailytracker.nutrition.dto;

import java.util.UUID;

/**
 * Amount of one food for the whole recipe. The barcode is set only for foods imported from Open Food Facts,
 * so the shopping list can look up store prices for it; it is null otherwise.
 */
public record RecipeIngredientResponse(UUID foodId, String foodName, double grams, String barcode) {
}
