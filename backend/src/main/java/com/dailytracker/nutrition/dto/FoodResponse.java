package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;

import java.util.List;
import java.util.UUID;

public record FoodResponse(
        UUID id,
        String name,
        String brand,
        String source,
        FoodCategory category,
        double servingSize,
        String servingUnit,
        int calories,
        double proteinGrams,
        double carbsGrams,
        double fatGrams,
        double fiberGrams,
        String ingredients,
        List<Allergen> allergens,
        /** False when the source has no allergen information: the list is then not a statement that the food is safe. */
        boolean allergensKnown
) {
    /** Must be called inside a transaction, because the allergens are loaded lazily. */
    public static FoodResponse from(Food food) {
        return new FoodResponse(
                food.getId(),
                food.getName(),
                food.getBrand(),
                food.getSource(),
                food.getCategory(),
                food.getServingSize(),
                food.getServingUnit(),
                food.getCalories(),
                food.getProtein(),
                food.getCarbs(),
                food.getFat(),
                food.getFiber(),
                food.getIngredients(),
                food.getAllergens().stream().sorted().toList(),
                food.isAllergensKnown());
    }
}
