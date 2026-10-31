package com.dailytracker.nutrition.repository;

import com.dailytracker.nutrition.entity.MealPlanPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MealPlanPreferenceRepository extends JpaRepository<MealPlanPreference, UUID> {
}
