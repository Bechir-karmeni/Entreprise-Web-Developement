package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.MealPlanSetRequest;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.repository.MealPlanRepository;
import com.dailytracker.nutrition.repository.RecipeRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MealPlanServiceTest {

    private final MealPlanRepository plans = mock(MealPlanRepository.class);
    private final RecipeRepository recipes = mock(RecipeRepository.class);
    private final MealPlanService service = new MealPlanService(plans, recipes);
    private final UUID userId = UUID.randomUUID();

    @Test
    void rangeRejectsEndBeforeStart() {
        assertThrows(InvalidRequestException.class,
                () -> service.range(userId, LocalDate.of(2026, 10, 26), LocalDate.of(2026, 10, 20)));
    }

    @Test
    void rangeRejectsMoreThanThirtyOneDays() {
        assertThrows(InvalidRequestException.class,
                () -> service.range(userId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 1)));
    }

    @Test
    void setRejectsUnknownRecipe() {
        UUID recipeId = UUID.randomUUID();
        when(recipes.existsById(recipeId)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class,
                () -> service.set(userId, new MealPlanSetRequest(LocalDate.of(2026, 10, 26), MealType.LUNCH, recipeId)));
    }
}
