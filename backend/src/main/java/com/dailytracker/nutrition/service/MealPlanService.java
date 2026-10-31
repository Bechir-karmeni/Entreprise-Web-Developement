package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.MealPlanEntryResponse;
import com.dailytracker.nutrition.dto.MealPlanSetRequest;
import com.dailytracker.nutrition.entity.MealPlanEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.MealPlanRepository;
import com.dailytracker.nutrition.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class MealPlanService {

    /** A plan is shown and loaded in windows of at most this many days. */
    static final int MAX_RANGE_DAYS = 31;

    private final MealPlanRepository plans;
    private final RecipeRepository recipes;

    public MealPlanService(MealPlanRepository plans, RecipeRepository recipes) {
        this.plans = plans;
        this.recipes = recipes;
    }

    @Transactional(readOnly = true)
    public List<MealPlanEntryResponse> range(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new InvalidRequestException("The end date must be after the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw new InvalidRequestException("A plan can show up to 31 days at a time.");
        }
        return plans.findByUserIdAndPlanDateBetweenOrderByPlanDateAsc(userId, from, to).stream()
                .map(MealPlanEntryResponse::from)
                .toList();
    }

    /** Fills a slot, or replaces the recipe already in it. */
    @Transactional
    public MealPlanEntryResponse set(UUID userId, MealPlanSetRequest request) {
        if (!recipes.existsById(request.recipeId())) {
            throw new ResourceNotFoundException("Recipe not found.");
        }
        MealPlanEntry entry = plans.findByUserIdAndPlanDateAndMealType(userId, request.date(), request.mealType())
                .map(existing -> {
                    existing.changeRecipe(request.recipeId());
                    return existing;
                })
                .orElseGet(() -> new MealPlanEntry(userId, request.date(), request.mealType(), request.recipeId()));
        plans.save(entry);
        return MealPlanEntryResponse.from(entry);
    }

    @Transactional
    public void clear(UUID userId, UUID entryId) {
        MealPlanEntry entry = plans.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Planned meal not found."));
        plans.delete(entry);
    }
}
