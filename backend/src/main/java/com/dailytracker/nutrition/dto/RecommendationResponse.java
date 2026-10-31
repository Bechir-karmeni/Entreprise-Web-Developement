package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.external.OnlineRecipe;

import java.util.List;

/**
 * Recipes for a prompt. tags are the filters the prompt asked for (for example HIGH_PROTEIN),
 * keywords are the words used to search by name.
 */
public record RecommendationResponse(
        List<String> tags,
        List<String> keywords,
        List<RecipeResponse> ownRecipes,
        List<OnlineRecipe> onlineRecipes
) {
}
