package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The answers to the Generate Plan questions. The same shape is used to read and to save them.
 * Each boolean is "yes, I eat this": false removes the matching recipes from the plan.
 */
public record MealPlanPreferences(
        boolean vegetarian,
        @NotNull @Pattern(regexp = "ALL|LACTOSE_FREE|NONE", message = "Choose one dairy option.") String dairy,
        boolean eggs,
        boolean nuts,
        boolean gluten,
        boolean fish,
        @Size(max = 500) String excludedFoods,
        @Min(3) @Max(4) int mealsPerDay
) {
    public static MealPlanPreferences defaults() {
        return new MealPlanPreferences(false, "ALL", true, true, true, true, "", 3);
    }
}
