package com.dailytracker.nutrition.dto;

import java.time.LocalDate;
import java.util.List;

public record DayLogResponse(
        LocalDate date,
        NutrientTotals totals,
        List<FoodLogEntryResponse> entries
) {
}
