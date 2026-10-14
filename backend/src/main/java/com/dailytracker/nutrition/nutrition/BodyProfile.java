package com.dailytracker.nutrition.nutrition;

import java.time.LocalDate;

/** The body and goal data the calculation needs. Age is derived from the date of birth. */
public record BodyProfile(
        Sex sex,
        LocalDate dateOfBirth,
        double heightCm,
        double weightKg,
        ActivityLevel activityLevel,
        NutritionGoal goal) {
}
