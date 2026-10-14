package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class FoodLogQuickEntryTest {

    @Test
    void emptyNameGetsDefault() {
        assertEquals("Quick entry", FoodLogService.quickName(null));
        assertEquals("Quick entry", FoodLogService.quickName("   "));
    }

    @Test
    void nameIsTrimmed() {
        assertEquals("Business dinner", FoodLogService.quickName("  Business dinner "));
    }
}
