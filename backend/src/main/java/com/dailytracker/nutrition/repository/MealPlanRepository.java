package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.MealPlanEntry;
import com.dailytracker.nutrition.food.MealType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealPlanRepository extends JpaRepository<MealPlanEntry, UUID> {

    List<MealPlanEntry> findByUserIdAndPlanDateBetweenOrderByPlanDateAsc(UUID userId, LocalDate from, LocalDate to);

    Optional<MealPlanEntry> findByUserIdAndPlanDateAndMealType(UUID userId, LocalDate planDate, MealType mealType);

    /** Only returns the entry if it belongs to this user. */
    Optional<MealPlanEntry> findByIdAndUserId(UUID id, UUID userId);
}
