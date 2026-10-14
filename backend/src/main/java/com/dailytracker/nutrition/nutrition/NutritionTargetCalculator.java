package com.dailytracker.nutrition.nutrition;

import java.time.LocalDate;
import java.time.Period;
import java.util.Objects;

/**
 * Calculates daily nutrition targets. Method, in order:
 * <ol>
 *   <li>BMR with the Mifflin-St Jeor equation:
 *       10 x weight(kg) + 6.25 x height(cm) - 5 x age + 5 (men) or - 161 (women).</li>
 *   <li>TDEE = BMR x activity factor.</li>
 *   <li>Calories = TDEE + goal adjustment, but never below the configured minimum.</li>
 *   <li>Protein = body weight x grams per kg for the goal (4 kcal per gram).</li>
 *   <li>Fat = share of calories (9 kcal per gram).</li>
 *   <li>Carbohydrates = calories that remain after protein and fat (4 kcal per gram), never negative.</li>
 *   <li>Fiber = grams per 1000 kcal; water = ml per kg body weight.</li>
 * </ol>
 * All constants are in {@link NutritionSettings}. These are estimates, not medical advice.
 */
public final class NutritionTargetCalculator {

    static final double KCAL_PER_GRAM_PROTEIN = 4.0;
    static final double KCAL_PER_GRAM_CARBS = 4.0;
    static final double KCAL_PER_GRAM_FAT = 9.0;

    /** Input limits. Values outside these ranges are rejected before any calculation. */
    static final double MIN_HEIGHT_CM = 100;
    static final double MAX_HEIGHT_CM = 250;
    static final double MIN_WEIGHT_KG = 30;
    static final double MAX_WEIGHT_KG = 300;
    static final int MIN_AGE_YEARS = 13;
    static final int MAX_AGE_YEARS = 120;

    private final NutritionSettings settings;

    public NutritionTargetCalculator(NutritionSettings settings) {
        this.settings = Objects.requireNonNull(settings, "settings must not be null");
    }

    public NutritionTargetCalculator() {
        this(NutritionSettings.defaults());
    }

    public NutritionTargets calculate(BodyProfile profile, LocalDate today) {
        Objects.requireNonNull(profile, "profile must not be null");
        Objects.requireNonNull(today, "today must not be null");

        int age = Period.between(profile.dateOfBirth(), today).getYears();
        validate(profile, age);

        double bmr = basalMetabolicRate(profile.sex(), profile.weightKg(), profile.heightCm(), age);
        double tdee = bmr * settings.activityFactors().get(profile.activityLevel());
        double rawCalories = tdee + settings.calorieAdjustments().get(profile.goal());
        boolean minimumApplied = rawCalories < settings.minimumCalories();
        double calories = Math.max(rawCalories, settings.minimumCalories());

        long protein = Math.round(profile.weightKg() * settings.proteinGramsPerKg().get(profile.goal()));
        long fat = Math.round(calories * settings.fatShareOfCalories() / KCAL_PER_GRAM_FAT);
        double remainingKcal = calories - protein * KCAL_PER_GRAM_PROTEIN - fat * KCAL_PER_GRAM_FAT;
        long carbs = Math.max(0, Math.round(remainingKcal / KCAL_PER_GRAM_CARBS));
        long fiber = Math.round(calories / 1000.0 * settings.fiberGramsPerThousandKcal());
        double waterLiters = profile.weightKg() * settings.waterMlPerKg() / 1000.0;

        return new NutritionTargets(
                (int) Math.round(bmr),
                (int) Math.round(tdee),
                (int) Math.round(calories),
                (int) protein,
                (int) carbs,
                (int) fat,
                (int) fiber,
                Math.round(waterLiters * 10) / 10.0,
                minimumApplied);
    }

    /** Mifflin-St Jeor basal metabolic rate in kcal per day. */
    static double basalMetabolicRate(Sex sex, double weightKg, double heightCm, int ageYears) {
        double base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
        return sex == Sex.MALE ? base + 5 : base - 161;
    }

    private static void validate(BodyProfile profile, int age) {
        if (profile.heightCm() < MIN_HEIGHT_CM || profile.heightCm() > MAX_HEIGHT_CM) {
            throw new IllegalArgumentException("height must be between " + MIN_HEIGHT_CM + " and " + MAX_HEIGHT_CM + " cm");
        }
        if (profile.weightKg() < MIN_WEIGHT_KG || profile.weightKg() > MAX_WEIGHT_KG) {
            throw new IllegalArgumentException("weight must be between " + MIN_WEIGHT_KG + " and " + MAX_WEIGHT_KG + " kg");
        }
        if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
            throw new IllegalArgumentException("age must be between " + MIN_AGE_YEARS + " and " + MAX_AGE_YEARS + " years");
        }
        Objects.requireNonNull(profile.sex(), "sex must not be null");
        Objects.requireNonNull(profile.activityLevel(), "activity level must not be null");
        Objects.requireNonNull(profile.goal(), "goal must not be null");
    }
}
