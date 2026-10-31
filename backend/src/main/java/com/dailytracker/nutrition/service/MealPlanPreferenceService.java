package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.MealPlanPreferences;
import com.dailytracker.nutrition.entity.MealPlanPreference;
import com.dailytracker.nutrition.repository.MealPlanPreferenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MealPlanPreferenceService {

    private final MealPlanPreferenceRepository repository;

    public MealPlanPreferenceService(MealPlanPreferenceRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public MealPlanPreferences get(UUID userId) {
        return repository.findById(userId)
                .map(MealPlanPreferenceService::toDto)
                .orElseGet(MealPlanPreferences::defaults);
    }

    @Transactional
    public MealPlanPreferences save(UUID userId, MealPlanPreferences values) {
        MealPlanPreference entity = repository.findById(userId).orElseGet(() -> new MealPlanPreference(userId));
        entity.update(values.vegetarian(), values.dairy(), values.eggs(), values.nuts(), values.gluten(), values.fish(),
                values.excludedFoods() == null ? "" : values.excludedFoods().trim(), values.mealsPerDay());
        repository.save(entity);
        return toDto(entity);
    }

    private static MealPlanPreferences toDto(MealPlanPreference entity) {
        return new MealPlanPreferences(
                entity.isVegetarian(),
                entity.getDairy(),
                entity.isEggs(),
                entity.isNuts(),
                entity.isGluten(),
                entity.isFish(),
                entity.getExcludedFoods(),
                entity.getMealsPerDay());
    }
}
