package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.MealType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/** Puts a recipe into one slot of the plan. Setting a slot that already has a recipe replaces it. */
public record MealPlanSetRequest(
        @NotNull LocalDate date,
        @NotNull MealType mealType,
        @NotNull UUID recipeId
) {
}
