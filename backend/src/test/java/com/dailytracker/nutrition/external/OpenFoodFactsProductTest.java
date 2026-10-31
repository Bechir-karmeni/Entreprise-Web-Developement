package com.dailytracker.nutrition.external;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OpenFoodFactsProductTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readsAProductWithNameAndEnergy() throws Exception {
        var product = mapper.readTree("""
                {"code": "4006381333931", "product_name": "Greek yogurt", "brands": "Acme",
                 "nutriments": {"energy-kcal_100g": 97, "proteins_100g": 10, "carbohydrates_100g": 4,
                                "fat_100g": 5, "fiber_100g": 0}}
                """);
        Optional<ExternalFood> food = OpenFoodFactsClient.productFrom(product);
        assertTrue(food.isPresent());
        assertEquals("4006381333931", food.get().externalId());
        assertEquals("Acme", food.get().brand());
        assertEquals(97, food.get().calories());
    }

    @Test
    void skipsAProductWithoutEnergy() throws Exception {
        var product = mapper.readTree("""
                {"code": "123456", "product_name": "Mystery", "nutriments": {"proteins_100g": 3}}
                """);
        assertFalse(OpenFoodFactsClient.productFrom(product).isPresent());
    }
}
