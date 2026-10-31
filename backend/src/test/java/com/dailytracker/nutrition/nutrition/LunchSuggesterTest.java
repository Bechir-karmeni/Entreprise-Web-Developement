package com.dailytracker.nutrition.nutrition;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.TargetsResponse;
import org.junit.jupiter.api.Test;

class LunchSuggesterTest {

    private static final TargetsResponse TARGETS =
            new TargetsResponse(1850, 120, 200, 60, 30, 2.5, 1500, 2000, false, "estimate");

    private static NutrientTotals eaten(int calories, double protein, double carbs, double fat, double fiber) {
        return new NutrientTotals(calories, protein, carbs, fat, fiber);
    }

    @Test
    void usesTheLunchShareCappedByWhatIsLeft() {
        LunchSuggester.Suggestion result =
                LunchSuggester.suggest(TARGETS, eaten(500, 10, 60, 15, 2));

        assertEquals(LunchSuggester.Status.SUGGESTED, result.status());
        assertEquals(650, result.calories());
        assertEquals(42, result.proteinGrams());
        assertEquals(70, result.carbsGrams());
        assertEquals(21, result.fatGrams());
    }

    @Test
    void capsCaloriesAtWhatTheDayStillHas() {
        assertEquals(350, LunchSuggester.suggest(TARGETS, eaten(1500, 0, 0, 0, 0)).calories());
    }

    @Test
    void focusesOnProteinWhenProteinIsFurtherBehindThanCalories() {
        assertEquals(LunchSuggester.Focus.PROTEIN,
                LunchSuggester.suggest(TARGETS, eaten(500, 10, 0, 0, 2)).focus());
    }

    @Test
    void focusesOnFiberWhenOnlyFiberIsClearlyBehind() {
        assertEquals(LunchSuggester.Focus.FIBER,
                LunchSuggester.suggest(TARGETS, eaten(500, 110, 0, 0, 2)).focus());
    }

    @Test
    void staysBalancedWhenNoMacroIsClearlyBehind() {
        assertEquals(LunchSuggester.Focus.BALANCED,
                LunchSuggester.suggest(TARGETS, eaten(500, 110, 0, 0, 25)).focus());
    }

    @Test
    void reportsTargetReachedWhenTheCalorieTargetIsAlreadyMet() {
        LunchSuggester.Suggestion result = LunchSuggester.suggest(TARGETS, eaten(1900, 0, 0, 0, 0));

        assertEquals(LunchSuggester.Status.TARGET_REACHED, result.status());
        assertEquals(0, result.calories());
    }

    @Test
    void treatsAZeroCalorieTargetAsReached() {
        TargetsResponse none = new TargetsResponse(0, 0, 0, 0, 0, 0, 0, 0, false, "estimate");
        assertEquals(LunchSuggester.Status.TARGET_REACHED,
                LunchSuggester.suggest(none, eaten(0, 0, 0, 0, 0)).status());
    }
}
