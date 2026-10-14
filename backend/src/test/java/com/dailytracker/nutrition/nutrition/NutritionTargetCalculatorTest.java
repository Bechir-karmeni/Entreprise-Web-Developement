package com.dailytracker.nutrition.nutrition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class NutritionTargetCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 8);
    private final NutritionTargetCalculator calculator = new NutritionTargetCalculator();

    @Test
    void calculatesTargetsForMaintainingWeight() {
        // Male, 30 years, 180 cm, 80 kg, moderately active, maintain weight.
        // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; TDEE = 1780 * 1.55 = 2759.
        BodyProfile profile = new BodyProfile(Sex.MALE, LocalDate.of(1996, 10, 8), 180, 80,
                ActivityLevel.MODERATELY_ACTIVE, NutritionGoal.MAINTAIN_WEIGHT);

        NutritionTargets targets = calculator.calculate(profile, TODAY);

        assertEquals(1780, targets.bmr());
        assertEquals(2759, targets.tdee());
        assertEquals(2759, targets.calories());
        assertEquals(128, targets.proteinGrams());   // 80 kg x 1.6 g
        assertEquals(77, targets.fatGrams());        // 25 % of calories
        assertEquals(389, targets.carbsGrams());     // remaining calories / 4
        assertEquals(39, targets.fiberGrams());      // 14 g per 1000 kcal
        assertEquals(2.8, targets.waterLiters());    // 35 ml per kg
        assertFalse(targets.minimumCaloriesApplied());
    }

    @Test
    void appliesDeficitAndMinimumCalorieFloorForWeightLoss() {
        // Female, 40 years, 165 cm, 60 kg, sedentary, lose weight.
        // BMR = 10*60 + 6.25*165 - 5*40 - 161 = 1270.25; TDEE = 1524; 1524 - 500 = 1024, below the 1200 minimum.
        BodyProfile profile = new BodyProfile(Sex.FEMALE, LocalDate.of(1986, 10, 8), 165, 60,
                ActivityLevel.SEDENTARY, NutritionGoal.LOSE_WEIGHT);

        NutritionTargets targets = calculator.calculate(profile, TODAY);

        assertEquals(1270, targets.bmr());
        assertEquals(1524, targets.tdee());
        assertEquals(1200, targets.calories());
        assertEquals(120, targets.proteinGrams());   // 60 kg x 2.0 g
        assertEquals(33, targets.fatGrams());
        assertEquals(106, targets.carbsGrams());
        assertTrue(targets.minimumCaloriesApplied());
    }

    @Test
    void rejectsImplausibleHeight() {
        BodyProfile profile = new BodyProfile(Sex.MALE, LocalDate.of(1996, 10, 8), 40, 80,
                ActivityLevel.MODERATELY_ACTIVE, NutritionGoal.MAINTAIN_WEIGHT);

        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(profile, TODAY));
    }

    @Test
    void rejectsSettingsWithMissingGoal() {
        assertThrows(IllegalArgumentException.class, () -> new NutritionSettings(
                NutritionSettings.defaults().activityFactors(),
                java.util.Map.of(NutritionGoal.MAINTAIN_WEIGHT, 0),
                NutritionSettings.defaults().proteinGramsPerKg(),
                0.25, 14, 35, 1200));
    }
}
