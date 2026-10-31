package com.dailytracker.nutrition.external;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class UsdaFoodClientParseTest {

    /** Two foods: one with energy and some nutrients, one without energy (skipped). */
    private static final String SAMPLE = """
            {"foods": [
              {"fdcId": 170390, "description": "Lentils, raw",
               "foodNutrients": [
                 {"nutrientId": 1008, "value": 352.0},
                 {"nutrientId": 1003, "value": 25.8},
                 {"nutrientId": 1162, "value": 4.4},
                 {"nutrientId": 1089, "value": 7.5},
                 {"nutrientId": 1106, "value": 0.0},
                 {"nutrientId": 2000, "value": 2.0},
                 {"nutrientId": 1258, "value": 0.1},
                 {"nutrientId": 1093, "value": 500.0},
                 {"nutrientId": 9999, "value": 3.0}
               ]},
              {"fdcId": 1, "description": "No energy here",
               "foodNutrients": [{"nutrientId": 1003, "value": 1.0}]}
            ]}
            """;

    @Test
    void readsNutrientsPer100gAndSkipsNutrientsThatAreNotListed() throws Exception {
        List<ExternalFood> foods = UsdaFoodClient.parse(new ObjectMapper().readTree(SAMPLE));

        assertEquals(1, foods.size());
        ExternalFood lentils = foods.get(0);
        assertEquals(352, lentils.calories());
        Map<String, Double> micronutrients = lentils.micronutrients();
        assertEquals(4.4, micronutrients.get("VITAMIN_C").doubleValue());
        assertEquals(7.5, micronutrients.get("IRON").doubleValue());
        assertEquals(0.0, micronutrients.get("VITAMIN_A").doubleValue());
        assertEquals(2.0, micronutrients.get("SUGAR").doubleValue());
        assertEquals(0.1, micronutrients.get("SATURATED_FAT").doubleValue());
        assertEquals(1.25, micronutrients.get("SALT").doubleValue());
        assertFalse(micronutrients.containsKey("ZINC"));
    }

    @Test
    void aFoodThatListsNoNutrientsGetsAnEmptyMap() {
        assertEquals(Map.of(), UsdaFoodClient.micronutrients(Map.of(1008, 100.0)));
    }
}
