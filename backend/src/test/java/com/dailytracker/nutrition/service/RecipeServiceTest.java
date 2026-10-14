package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.entity.Food;
import com.dailytracker.nutrition.entity.RecipeIngredient;
import com.dailytracker.nutrition.food.FoodCategory;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecipeServiceTest {

    @Test
    void nutritionPerServingScalesEachFoodAndDividesByServings() {
        // 200 kcal per 100 g, bought 150 g => 300 kcal. Shared by 2 servings => 150 kcal each.
        Food rice = new Food("Test rice", FoodCategory.GRAIN, 100, "g", 200, 20, 0, 10, 0);
        RecipeIngredient item = new RecipeIngredient(null, rice, 150, 1);

        NutrientTotals perServing = RecipeService.perServing(List.of(item), 2);

        assertEquals(150, perServing.calories());
        assertEquals(15.0, perServing.proteinGrams());
        assertEquals(7.5, perServing.fatGrams());
    }

    @Test
    void tagsAreSplitAndTrimmed() {
        assertEquals(List.of("VEGETARIAN", "QUICK"), RecipeService.splitTags(" VEGETARIAN, QUICK ,"));
    }
}
