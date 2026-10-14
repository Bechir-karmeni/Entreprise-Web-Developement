package com.dailytracker.nutrition.dto;

import java.util.List;
import java.util.UUID;

/** A recipe with its nutrition for one serving. */
public record RecipeResponse(
        UUID id,
        String name,
        String description,
        int servings,
        int prepMinutes,
        List<String> tags,
        NutrientTotals perServing,
        List<String> steps,
        List<RecipeIngredientResponse> ingredients
) {
}
