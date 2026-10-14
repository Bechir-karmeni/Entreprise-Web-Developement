package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.food.MealType;

import java.time.LocalDate;
import java.util.UUID;

public record FoodLogEntryResponse(
        UUID id,
        LocalDate date,
        MealType mealType,
        UUID foodId,
        String foodName,
        double amount,
        String servingUnit,
        int calories,
        double proteinGrams,
        double carbsGrams,
        double fatGrams,
        double fiberGrams
) {
    public static FoodLogEntryResponse from(FoodLogEntry entry) {
        return new FoodLogEntryResponse(
                entry.getId(),
                entry.getLogDate(),
                entry.getMealType(),
                entry.getFoodId(),
                entry.getFoodName(),
                entry.getAmount(),
                entry.getServingUnit(),
                entry.getCalories(),
                entry.getProtein(),
                entry.getCarbs(),
                entry.getFat(),
                entry.getFiber());
    }
}
