package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.external.OnlineRecipe;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Turns the JSON that Gemini returns into recipes. Anything that does not have a name, steps and
 * ingredients is skipped, so a half-finished answer never reaches the app.
 */
final class AiRecipeParser {

    static final int MAX_RECIPES = 3;
    private static final int MAX_STEPS = 30;
    private static final int MAX_INGREDIENTS = 40;
    private static final int MAX_NAME = 200;
    private static final int MAX_TEXT = 200;
    private static final ObjectMapper JSON = new ObjectMapper();

    private AiRecipeParser() {
    }

    /** Parses the model reply. Returns an empty list when the reply is not usable JSON. */
    static List<OnlineRecipe> parse(String reply) {
        List<OnlineRecipe> recipes = new ArrayList<>();
        JsonNode root;
        try {
            root = JSON.readTree(stripFence(reply));
        } catch (JsonProcessingException | IllegalArgumentException e) {
            return recipes;
        }
        JsonNode items = root.isArray() ? root : root.path("recipes");
        for (JsonNode item : items) {
            if (recipes.size() >= MAX_RECIPES) {
                break;
            }
            OnlineRecipe recipe = toRecipe(item);
            if (recipe != null) {
                recipes.add(recipe);
            }
        }
        return recipes;
    }

    private static OnlineRecipe toRecipe(JsonNode item) {
        String name = OnlineRecipe.text(item, "name").trim();
        List<String> steps = new ArrayList<>();
        for (JsonNode step : item.path("instructions")) {
            if (step.isTextual() && !step.asText().isBlank() && steps.size() < MAX_STEPS) {
                steps.add(truncate(step.asText().trim(), MAX_TEXT));
            }
        }
        List<OnlineRecipe.Ingredient> ingredients = new ArrayList<>();
        for (JsonNode ingredient : item.path("ingredients")) {
            if (ingredients.size() >= MAX_INGREDIENTS) {
                break;
            }
            String ingredientName = OnlineRecipe.text(ingredient, "name").trim();
            if (!ingredientName.isEmpty()) {
                ingredients.add(new OnlineRecipe.Ingredient(
                        truncate(ingredientName, MAX_TEXT),
                        truncate(OnlineRecipe.text(ingredient, "measure").trim(), MAX_TEXT)));
            }
        }
        if (name.isEmpty() || steps.isEmpty() || ingredients.isEmpty()) {
            return null;
        }
        return new OnlineRecipe(
                randomGeneratedId(),
                truncate(name, MAX_NAME),
                blankToNull(OnlineRecipe.text(item, "category")),
                blankToNull(OnlineRecipe.text(item, "area")),
                null,
                steps,
                ingredients,
                null,
                null);
    }

    /** Generated recipes get negative ids, so they never clash with TheMealDB ids (which are positive). */
    static int randomGeneratedId() {
        return -ThreadLocalRandom.current().nextInt(1, 1_000_000_000);
    }

    private static String stripFence(String reply) {
        String text = reply == null ? "" : reply.trim();
        if (text.startsWith("```")) {
            int firstLineEnd = text.indexOf('\n');
            text = firstLineEnd < 0 ? "" : text.substring(firstLineEnd + 1);
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
        }
        return text.trim();
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
