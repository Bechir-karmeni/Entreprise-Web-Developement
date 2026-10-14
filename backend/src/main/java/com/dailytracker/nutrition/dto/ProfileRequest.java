package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.nutrition.ActivityLevel;
import com.dailytracker.nutrition.nutrition.NutritionGoal;
import com.dailytracker.nutrition.nutrition.Sex;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public record ProfileRequest(
        @NotNull Sex sex,
        @NotNull @Past LocalDate dateOfBirth,
        @NotNull @DecimalMin("100") @DecimalMax("250") Double heightCm,
        @NotNull @DecimalMin("30") @DecimalMax("300") Double weightKg,
        @NotNull ActivityLevel activityLevel,
        @NotNull NutritionGoal goal
) {
}
