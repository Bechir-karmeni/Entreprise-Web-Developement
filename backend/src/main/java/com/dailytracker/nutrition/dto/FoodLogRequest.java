package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.MealType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.util.UUID;

/** amount is in the food's serving unit (grams or millilitres for our foods). */
public record FoodLogRequest(
        @NotNull UUID foodId,
        @NotNull MealType mealType,
        @NotNull LocalDate date,
        @Positive @DecimalMax("5000") double amount
) {
}
