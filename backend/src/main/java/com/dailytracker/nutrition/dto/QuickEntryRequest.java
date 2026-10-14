package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.MealType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Calories and macros typed in by the user, without a food from the database (restaurants, estimates). */
public record QuickEntryRequest(
        @NotNull MealType mealType,
        @NotNull LocalDate date,
        @Size(max = 150) String name,
        @Min(0) @Max(5000) int calories,
        @DecimalMin("0") @DecimalMax("1000") double proteinGrams,
        @DecimalMin("0") @DecimalMax("1000") double carbsGrams,
        @DecimalMin("0") @DecimalMax("1000") double fatGrams,
        @DecimalMin("0") @DecimalMax("1000") double fiberGrams
) {
}
