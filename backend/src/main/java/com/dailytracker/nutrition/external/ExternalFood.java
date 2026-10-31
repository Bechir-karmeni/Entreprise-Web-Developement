package com.dailytracker.nutrition.external;

import com.dailytracker.nutrition.food.Allergen;
import com.dailytracker.nutrition.food.FoodCategory;

import java.util.Map;
import java.util.Set;

/**
 * A food as returned by an online source, already converted to our units (per 100 g or 100 ml).
 *
 * @param allergensKnown  false when the source gives no allergen information; the allergens set is then empty
 *                        and must not be read as "allergen-free"
 * @param micronutrients  vitamin and mineral amounts per 100 g, keyed by Micronutrient name; only the nutrients
 *                        the source lists are present; null when the source has no such data
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
        boolean allergensKnown,
        Map<String, Double> micronutrients) {

    /** For sources that give no vitamin and mineral data. */
    public ExternalFood(String source, String externalId, String name, String brand, FoodCategory category,
                        double servingSize, String servingUnit, int calories, double protein, double carbs,
                        double fat, double fiber, Set<Allergen> allergens, boolean allergensKnown) {
        this(source, externalId, name, brand, category, servingSize, servingUnit, calories, protein, carbs,
                fat, fiber, allergens, allergensKnown, null);
    }
}
