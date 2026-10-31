package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.MealPlanEntry;
import com.dailytracker.nutrition.food.MealType;

import java.time.LocalDate;
import java.util.UUID;

public record MealPlanEntryResponse(
        UUID id,
        LocalDate date,
        MealType mealType,
        UUID recipeId
) {

    public static MealPlanEntryResponse from(MealPlanEntry entry) {
        return new MealPlanEntryResponse(entry.getId(), entry.getPlanDate(), entry.getMealType(), entry.getRecipeId());
    }
}
