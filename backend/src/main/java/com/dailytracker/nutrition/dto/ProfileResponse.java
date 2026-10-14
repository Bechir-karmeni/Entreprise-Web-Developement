package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.UserProfile;
import com.dailytracker.nutrition.nutrition.ActivityLevel;
import com.dailytracker.nutrition.nutrition.NutritionGoal;
import com.dailytracker.nutrition.nutrition.Sex;

import java.time.LocalDate;

public record ProfileResponse(
        Sex sex,
        LocalDate dateOfBirth,
        double heightCm,
        double weightKg,
        ActivityLevel activityLevel,
        NutritionGoal goal
) {
    public static ProfileResponse from(UserProfile profile) {
        return new ProfileResponse(
                profile.getSex(),
                profile.getDateOfBirth(),
                profile.getHeightCm(),
                profile.getWeightKg(),
                profile.getActivityLevel(),
                profile.getGoal());
    }
}
