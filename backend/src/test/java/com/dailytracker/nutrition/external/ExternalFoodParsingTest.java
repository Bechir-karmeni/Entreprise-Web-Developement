package com.dailytracker.nutrition.external;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dailytracker.nutrition.food.Allergen;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.EnumSet;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExternalFoodParsingTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void mapsKnownAllergenTagsAndIgnoresTheRest() throws Exception {
        JsonNode tags = mapper.readTree("[\"en:milk\",\"en:gluten\",\"en:unknown-thing\",\"en:crustaceans\"]");

        assertEquals(EnumSet.of(Allergen.MILK, Allergen.GLUTEN, Allergen.SHELLFISH),
                OpenFoodFactsClient.allergensFromTags(tags));
    }

    @Test
    void parsesOpenFoodFactsProductsAndSkipsIncompleteOnes() throws Exception {
        String json = """
                {"products":[
                  {"code":"3017620422003","product_name":"Hazelnut spread","brands":"Example",
                   "nutriments":{"energy-kcal_100g":539,"proteins_100g":6.3,"carbohydrates_100g":57.5,"fat_100g":30.9,"fiber_100g":0},
                   "allergens_tags":["en:milk","en:nuts"]},
                  {"code":"111","product_name":"No energy value","nutriments":{"proteins_100g":1}},
                  {"code":"222","product_name":"No allergen list","brands":"",
                   "nutriments":{"energy-kcal_100g":100,"proteins_100g":1,"carbohydrates_100g":20,"fat_100g":0.5},
                   "allergens_tags":[]}
                ]}
                """;

        List<ExternalFood> foods = OpenFoodFactsClient.parse(mapper.readTree(json));

        assertEquals(2, foods.size());
        ExternalFood spread = foods.get(0);
        assertEquals(539, spread.calories());
        assertEquals("Example", spread.brand());
        assertEquals(EnumSet.of(Allergen.MILK, Allergen.TREE_NUTS), spread.allergens());
        assertTrue(spread.allergensKnown());

        ExternalFood noAllergenList = foods.get(1);
        assertFalse(noAllergenList.allergensKnown(), "an empty allergen list must not count as allergen-free");
        assertNull(noAllergenList.brand());
    }

    @Test
    void parsesUsdaFoodsAndNeverClaimsAllergenInformation() throws Exception {
        String json = """
                {"foods":[{"fdcId":171077,"description":"Chicken breast, cooked","dataType":"SR Legacy",
                  "foodNutrients":[
                    {"nutrientId":1008,"value":165},{"nutrientId":1003,"value":31},
                    {"nutrientId":1005,"value":0},{"nutrientId":1004,"value":3.6},{"nutrientId":1079,"value":0}]}]}
                """;

        List<ExternalFood> foods = UsdaFoodClient.parse(mapper.readTree(json));

        assertEquals(1, foods.size());
        ExternalFood chicken = foods.get(0);
        assertEquals("171077", chicken.externalId());
        assertEquals(165, chicken.calories());
        assertEquals(31.0, chicken.protein());
        assertFalse(chicken.allergensKnown());
    }
}
