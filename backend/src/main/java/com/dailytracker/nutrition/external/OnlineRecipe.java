package com.dailytracker.nutrition.external;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

/**
 * A recipe from TheMealDB. Search by name, lookup and random return the full recipe.
 * Category and area filters return only the name and picture, so those fields are null and the lists are empty.
 */
public record OnlineRecipe(
        int id,
        String name,
        String category,
        String area,
        String thumbnail,
        List<String> instructions,
        List<Ingredient> ingredients,
        String youtube,
        String source
) {

    /** One ingredient with its measure as TheMealDB writes it (for example "2 tbsp"). The measure may be empty. */
    public record Ingredient(String name, String measure) {
    }

    /** A full recipe. Reads TheMealDB's strMeal, strIngredient1..20 and strMeasure1..20 fields. */
    public static OnlineRecipe fromMeal(JsonNode meal) {
        List<String> steps = new ArrayList<>();
        for (String line : text(meal, "strInstructions").split("\\r?\\n")) {
            String step = line.trim();
            if (!step.isEmpty()) {
                steps.add(step);
            }
        }
        List<Ingredient> ingredients = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            String name = text(meal, "strIngredient" + i).trim();
            if (!name.isEmpty()) {
                ingredients.add(new Ingredient(name, text(meal, "strMeasure" + i).trim()));
            }
        }
        return new OnlineRecipe(
                parseId(meal),
                text(meal, "strMeal").trim(),
                blankToNull(text(meal, "strCategory")),
                blankToNull(text(meal, "strArea")),
                blankToNull(text(meal, "strMealThumb")),
                steps,
                ingredients,
                blankToNull(text(meal, "strYoutube")),
                blankToNull(text(meal, "strSource")));
    }

    /** Name, picture and id only, as returned by the category and area filters. */
    public static OnlineRecipe fromSummary(JsonNode meal) {
        return new OnlineRecipe(
                parseId(meal),
                text(meal, "strMeal").trim(),
                null,
                null,
                blankToNull(text(meal, "strMealThumb")),
                List.of(),
                List.of(),
                null,
                null);
    }

    /** The text of a field. Missing and null fields give an empty string, never "null". */
    public static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isTextual() ? value.asText() : "";
    }

    private static int parseId(JsonNode meal) {
        try {
            return Integer.parseInt(text(meal, "idMeal").trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
