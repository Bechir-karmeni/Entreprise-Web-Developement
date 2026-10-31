package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dailytracker.nutrition.dto.FoodPhotoItem;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import java.util.List;
import org.junit.jupiter.api.Test;

class FoodPhotoServiceTest {

    @Test
    void readsItemsAndSkipsNamelessOnes() {
        List<FoodPhotoItem> items = FoodPhotoService.parse("""
                {"items": [
                  {"name": "Grilled chicken", "grams": 150, "calories": 240, "proteinGrams": 45, "carbsGrams": 0, "fatGrams": 5, "fiberGrams": 0},
                  {"name": "  ", "grams": 50, "calories": 20},
                  {"name": "Rice", "grams": -10, "calories": 1e9, "proteinGrams": 4, "carbsGrams": 45, "fatGrams": 0.5, "fiberGrams": 0.6}
                ]}
                """);

        assertEquals(2, items.size());
        assertEquals("Grilled chicken", items.get(0).name());
        assertEquals(240, items.get(0).calories());
        assertEquals(0, items.get(1).grams(), "negative amounts are set to zero");
        assertEquals(5000, items.get(1).calories(), "absurd calories are capped");
    }

    @Test
    void emptyPhotoGivesNoItems() {
        assertTrue(FoodPhotoService.parse("{\"items\": []}").isEmpty());
    }

    @Test
    void replyThatIsNotJsonIsReportedAsUnavailable() {
        assertThrows(ExternalServiceUnavailableException.class, () -> FoodPhotoService.parse("I see a sandwich."));
    }
}
