package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.dto.RecipeResponse;

/** One of our recipes, with how many of its ingredients the user has in the fridge. */
public record OwnFridgeMatch(RecipeResponse recipe, int matchedIngredients, int totalIngredients) {
}
