package com.dailytracker.nutrition.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.dailytracker.nutrition.food.MealType;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FoodLogEntryRescaleTest {

    @Test
    void halvingTheAmountHalvesTheValuesAndTheVitamins() {
        FoodLogEntry entry = new FoodLogEntry(UUID.randomUUID(), LocalDate.of(2026, 10, 26), MealType.LUNCH,
                null, "Lentils", 100, "g", 200, 10, 20, 5, 2, Map.of("IRON", 4.0));

        entry.rescale(50);

        assertEquals(50, entry.getAmount());
        assertEquals(100, entry.getCalories());
        assertEquals(5.0, entry.getProtein());
        assertEquals(10.0, entry.getCarbs());
        assertEquals(1.0, entry.getFiber());
        assertEquals(2.0, entry.getMicronutrients().get("IRON").doubleValue());
    }

    @Test
    void anEntryWithoutVitaminDataKeepsNoVitaminData() {
        FoodLogEntry entry = new FoodLogEntry(UUID.randomUUID(), LocalDate.of(2026, 10, 26), MealType.SNACK,
                null, "Quick entry", 1, "portion", 300, 15, 30, 10, 3);

        entry.rescale(2);

        assertEquals(600, entry.getCalories());
        assertNull(entry.getMicronutrients());
    }
}
