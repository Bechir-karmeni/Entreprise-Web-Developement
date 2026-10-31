package com.dailytracker.nutrition.nutrition;

import java.util.EnumMap;
import java.util.Map;

/**
 * Every constant used by the calculation, in one place. Change a value here (or later, in application.yml)
 * and the targets change; no formula code needs to be edited.
 *
 * @param activityFactors          multiplier applied to BMR to get TDEE, per activity level
 * @param calorieAdjustments       kcal added to TDEE per day, per goal (negative = deficit)
 * @param proteinGramsPerKg        protein target in grams per kg body weight, per goal
 * @param fatShareOfCalories       share of daily calories from fat (0.25 = 25 %)
 * @param fiberGramsPerThousandKcal fiber target per 1000 kcal (14 g is a common guideline)
 * @param waterMlPerKg             water recommendation per kg body weight
 * @param minimumCalories          lowest calorie target per sex; the system never suggests less
 */
public record NutritionSettings(
        Map<ActivityLevel, Double> activityFactors,
        Map<NutritionGoal, Integer> calorieAdjustments,
        Map<NutritionGoal, Double> proteinGramsPerKg,
        double fatShareOfCalories,
        double fiberGramsPerThousandKcal,
        double waterMlPerKg,
        Map<Sex, Integer> minimumCalories) {

    public NutritionSettings {
        activityFactors = Map.copyOf(requireAll(activityFactors, ActivityLevel.class, "activityFactors"));
        calorieAdjustments = Map.copyOf(requireAll(calorieAdjustments, NutritionGoal.class, "calorieAdjustments"));
        proteinGramsPerKg = Map.copyOf(requireAll(proteinGramsPerKg, NutritionGoal.class, "proteinGramsPerKg"));
        minimumCalories = Map.copyOf(requireAll(minimumCalories, Sex.class, "minimumCalories"));
        if (fatShareOfCalories <= 0 || fatShareOfCalories >= 1) {
            throw new IllegalArgumentException("fatShareOfCalories must be between 0 and 1");
        }
        if (minimumCalories.values().stream().anyMatch(value -> value <= 0)) {
            throw new IllegalArgumentException("minimumCalories must be positive for every sex");
        }
    }

    /** Default values, documented in the report: Mifflin-St Jeor BMR and standard activity factors. */
    public static NutritionSettings defaults() {
        Map<ActivityLevel, Double> activity = new EnumMap<>(ActivityLevel.class);
        activity.put(ActivityLevel.SEDENTARY, 1.2);
        activity.put(ActivityLevel.LIGHTLY_ACTIVE, 1.375);
        activity.put(ActivityLevel.MODERATELY_ACTIVE, 1.55);
        activity.put(ActivityLevel.VERY_ACTIVE, 1.725);
        activity.put(ActivityLevel.EXTRA_ACTIVE, 1.9);

        Map<NutritionGoal, Integer> adjustments = new EnumMap<>(NutritionGoal.class);
        adjustments.put(NutritionGoal.LOSE_WEIGHT, -500);       // about 0.5 kg per week
        adjustments.put(NutritionGoal.MAINTAIN_WEIGHT, 0);
        adjustments.put(NutritionGoal.GAIN_WEIGHT, 300);
        adjustments.put(NutritionGoal.GAIN_MUSCLE, 250);
        adjustments.put(NutritionGoal.GENERAL_HEALTHY_EATING, 0);

        Map<NutritionGoal, Double> protein = new EnumMap<>(NutritionGoal.class);
        protein.put(NutritionGoal.LOSE_WEIGHT, 2.0);            // higher protein protects muscle in a deficit
        protein.put(NutritionGoal.MAINTAIN_WEIGHT, 1.6);
        protein.put(NutritionGoal.GAIN_WEIGHT, 1.8);
        protein.put(NutritionGoal.GAIN_MUSCLE, 2.2);
        protein.put(NutritionGoal.GENERAL_HEALTHY_EATING, 1.2);

        // Floors follow common guidelines: about 1500 kcal for men, 1200 kcal for women.
        Map<Sex, Integer> minimum = new EnumMap<>(Sex.class);
        minimum.put(Sex.MALE, 1500);
        minimum.put(Sex.FEMALE, 1200);

        return new NutritionSettings(activity, adjustments, protein, 0.25, 14.0, 35.0, minimum);
    }

    private static <K extends Enum<K>, V> Map<K, V> requireAll(Map<K, V> values, Class<K> keyType, String name) {
        if (values == null) {
            throw new IllegalArgumentException(name + " must not be null");
        }
        for (K key : keyType.getEnumConstants()) {
            if (!values.containsKey(key)) {
                throw new IllegalArgumentException(name + " is missing a value for " + key);
            }
        }
        return values;
    }
}
