package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;

import java.util.Set;

/**
 * A food as returned by an online source, already converted to our units (per 100 g or 100 ml).
 *
 * @param allergensKnown false when the source gives no allergen information; the allergens set is then empty
 *                       and must not be read as "allergen-free"
 */
public record ExternalFood(
        String source,
        String externalId,
        String name,
        String brand,
        FoodCategory category,
        double servingSize,
        String servingUnit,
        int calories,
        double protein,
        double carbs,
        double fat,
        double fiber,
        Set<Allergen> allergens,
        boolean allergensKnown) {
}
