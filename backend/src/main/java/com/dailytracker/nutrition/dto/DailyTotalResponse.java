package com.dailytracker.nutrition.dto;

import java.time.LocalDate;

/** Nutrient totals for one day that has food logged. */
public record DailyTotalResponse(LocalDate date, NutrientTotals totals) {
}
