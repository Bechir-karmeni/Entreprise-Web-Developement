package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dailytracker.nutrition.external.OnlineRecipe;
import org.junit.jupiter.api.Test;

class AiRecipeParserTest {

    @Test
    void readsRecipesWithNegativeIdsAndSkipsIncompleteOnes() {
        String reply = """
                [
                  {"name": "Lentil soup", "category": "Lunch", "area": "",
                   "instructions": ["Rinse the lentils.", "", "Simmer for 20 minutes."],
                   "ingredients": [{"name": "Red lentils", "measure": "80 g"}, {"name": "", "measure": "1 l"}]},
                  {"name": "No steps", "instructions": [], "ingredients": [{"name": "Rice", "measure": "1 cup"}]}
                ]
                """;

        var recipes = AiRecipeParser.parse(reply);

        assertEquals(1, recipes.size());
        OnlineRecipe soup = recipes.get(0);
        assertTrue(soup.id() < 0, "generated recipes use negative ids");
        assertEquals("Lentil soup", soup.name());
        assertNull(soup.area(), "an empty area becomes null");
        assertEquals(2, soup.instructions().size());
        assertEquals(1, soup.ingredients().size());
        assertEquals("80 g", soup.ingredients().get(0).measure());
    }

    @Test
    void acceptsAFencedReplyAndAWrappedList() {
        String reply = "```json\n{\"recipes\": [{\"name\": \"Omelette\", \"category\": \"Breakfast\", "
                + "\"instructions\": [\"Whisk the eggs.\"], \"ingredients\": [{\"name\": \"Eggs\", \"measure\": \"2\"}]}]}\n```";

        var recipes = AiRecipeParser.parse(reply);

        assertEquals(1, recipes.size());
        assertEquals("Breakfast", recipes.get(0).category());
    }

    @Test
    void returnsNothingForReplyThatIsNotJson() {
        assertTrue(AiRecipeParser.parse("Sorry, I cannot help with that.").isEmpty());
        assertTrue(AiRecipeParser.parse(null).isEmpty());
    }

    @Test
    void keepsAtMostThreeRecipes() {
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            if (i > 0) items.append(',');
            items.append("{\"name\": \"Dish ").append(i).append("\", \"instructions\": [\"Cook.\"], "
                    + "\"ingredients\": [{\"name\": \"Oats\", \"measure\": \"50 g\"}]}");
        }
        assertEquals(3, AiRecipeParser.parse("[" + items + "]").size());
    }
}
