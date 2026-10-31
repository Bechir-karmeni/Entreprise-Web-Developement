package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dailytracker.nutrition.dto.OnlineRecipeFilters;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.external.OnlineRecipe;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OnlineRecipeServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void readsIngredientsAndStepsAndSkipsEmptyOnes() throws Exception {
        JsonNode meal = JSON.readTree("""
                {"idMeal": "52772", "strMeal": "Teriyaki Chicken", "strCategory": "Chicken", "strArea": "Japanese",
                 "strInstructions": "Mix the sauce.\\r\\n\\r\\nCook the chicken.",
                 "strIngredient1": "Chicken", "strMeasure1": "500g",
                 "strIngredient2": "", "strMeasure2": "",
                 "strIngredient3": null, "strMeasure3": null,
                 "strIngredient4": "Salt", "strMeasure4": " ",
                 "strYoutube": "", "strSource": null}
                """);

        OnlineRecipe recipe = OnlineRecipe.fromMeal(meal);

        assertEquals(52772, recipe.id());
        assertEquals("Japanese", recipe.area());
        assertEquals(2, recipe.instructions().size());
        assertEquals(2, recipe.ingredients().size());
        assertEquals("500g", recipe.ingredients().get(0).measure());
        assertEquals("", recipe.ingredients().get(1).measure());
        assertEquals(null, recipe.youtube());
    }

    @Test
    void summaryHasNameAndPictureOnly() throws Exception {
        JsonNode meal = JSON.readTree("{\"idMeal\": \"1\", \"strMeal\": \"Soup\", \"strMealThumb\": \"https://example.com/soup.jpg\"}");

        OnlineRecipe recipe = OnlineRecipe.fromSummary(meal);

        assertEquals("Soup", recipe.name());
        assertEquals("https://example.com/soup.jpg", recipe.thumbnail());
        assertTrue(recipe.ingredients().isEmpty());
        assertEquals(null, recipe.category());
    }

    @Test
    void emptyFiltersAreDetected() {
        assertTrue(new OnlineRecipeFilters("  ", null, null).isEmpty());
        assertTrue(!new OnlineRecipeFilters(null, "Seafood", null).isEmpty());
    }

    @Test
    void rejectsTooLongSearchText() {
        assertThrows(InvalidRequestException.class, () -> new OnlineRecipeFilters("x".repeat(101), null, null));
    }
}
