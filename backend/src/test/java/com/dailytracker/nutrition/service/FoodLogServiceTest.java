package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.food.MealType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FoodLogServiceTest {

    private static FoodLogEntry entry(String name, int calories, double protein, double carbs, double fat, double fiber) {
        return new FoodLogEntry(UUID.randomUUID(), LocalDate.of(2026, 10, 9), MealType.LUNCH, UUID.randomUUID(),
                name, 100, "g", calories, protein, carbs, fat, fiber);
    }

    @Test
    void factorScalesTheServingSize() {
        assertEquals(1.5, FoodLogService.factor(150, 100));
        assertEquals(0.5, FoodLogService.factor(50, 100));
    }

    @Test
    void totalsAddUpAndRoundToOneDecimal() {
        NutrientTotals totals = FoodLogService.totalsOf(List.of(
                entry("Rice", 130, 2.5, 28.0, 0.5, 0.4),
                entry("Egg", 155, 12.5, 1.0, 10.5, 0.0)));

        assertEquals(285, totals.calories());
        assertEquals(15.0, totals.proteinGrams());
        assertEquals(29.0, totals.carbsGrams());
        assertEquals(11.0, totals.fatGrams());
        assertEquals(0.4, totals.fiberGrams());
    }

    @Test
    void emptyDayHasZeroTotals() {
        NutrientTotals totals = FoodLogService.totalsOf(List.of());
        assertEquals(0, totals.calories());
        assertEquals(0.0, totals.proteinGrams());
    }
}
