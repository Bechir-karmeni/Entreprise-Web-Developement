package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.food.Micronutrient;
import com.dailytracker.nutrition.food.MealType;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TodayServiceMicronutrientTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 25);

    private static FoodLogEntry entry(Map<String, Double> micronutrients) {
        return new FoodLogEntry(UUID.randomUUID(), DAY, MealType.LUNCH, null, "Food", 100, "g",
                100, 1, 1, 1, 1, micronutrients);
    }

    private static TodayResponse.NutrientAmount find(TodayResponse.MicronutrientDay day, String key) {
        return day.nutrients().stream()
                .filter(nutrient -> nutrient.key().equals(key))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void addsUpTheAmountsAndCountsOnlyEntriesWithData() {
        List<FoodLogEntry> dayEntries = List.of(
                entry(Map.of("IRON", 7.5, "VITAMIN_C", 4.4)),
                entry(Map.of("IRON", 2.5)),
                entry(null));

        TodayResponse.MicronutrientDay result = TodayService.micronutrientDay(dayEntries);

        assertEquals(3, result.entriesTotal());
        assertEquals(2, result.entriesWithDetails());
        assertEquals(Micronutrient.values().length, result.nutrients().size());
        TodayResponse.NutrientAmount iron = find(result, "IRON");
        assertEquals(10.0, iron.amount());
        assertEquals(14.0, iron.referenceAmount().doubleValue());
        assertEquals(71, iron.percentOfReference().intValue());
    }

    @Test
    void aDayWithoutAnyDataHasZeroAmountsAndNoEntriesWithDetails() {
        TodayResponse.MicronutrientDay result = TodayService.micronutrientDay(List.of(entry(null)));

        assertEquals(0, result.entriesWithDetails());
        assertEquals(0.0, find(result, "ZINC").amount());
        assertEquals(0, find(result, "ZINC").percentOfReference().intValue());
    }

    @Test
    void sugarAndSaturatedFatHaveAmountsOnlyAndSaltIsCheckedAgainstTheWhoLimit() {
        TodayResponse.MicronutrientDay result = TodayService.micronutrientDay(
                List.of(entry(Map.of("SUGAR", 4.0, "SATURATED_FAT", 0.2, "SALT", 2.5))));

        assertNull(find(result, "SUGAR").referenceAmount());
        assertNull(find(result, "SUGAR").percentOfReference());
        assertNull(find(result, "SATURATED_FAT").percentOfReference());
        assertEquals(5.0, find(result, "SALT").referenceAmount().doubleValue());
        assertEquals(50, find(result, "SALT").percentOfReference().intValue());
    }
}
