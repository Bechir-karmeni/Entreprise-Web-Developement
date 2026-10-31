package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.Allergen;

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
        List<RecipeIngredientResponse> ingredients,
        /** Allergens of any ingredient, sorted. Empty when no ingredient contains one. */
        List<Allergen> allergens,
        /** False when an ingredient has no allergen information, so an empty list is not a statement that the recipe is safe. */
        boolean allergensKnown
) {
}
