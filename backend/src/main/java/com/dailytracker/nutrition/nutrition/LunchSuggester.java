package com.dailytracker.nutrition.nutrition;

import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.TargetsResponse;

/**
 * Suggests a lunch target from what the user has eaten so far today.
 * The lunch share of each daily target is the base, capped by what the day still has left.
 * The focus compares how much of each macro is still missing with how much of the calorie budget is left.
 * This mirrors frontend/src/lib/lunchSuggestion.ts so both sides give the same numbers.
 */
public final class LunchSuggester {

    /** Share of the daily targets suggested for lunch. */
    static final double LUNCH_SHARE = 0.35;

    /** A macro must be this far (as a share of its goal) further behind than the calories to become the focus. */
    static final double FOCUS_MARGIN = 0.1;

    private LunchSuggester() {
    }

    public enum Status { SUGGESTED, TARGET_REACHED }

    public enum Focus { PROTEIN, FIBER, BALANCED }

    public record Suggestion(
            Status status,
            int calories,
            int proteinGrams,
            int carbsGrams,
            int fatGrams,
            int fiberGrams,
            Focus focus
    ) {
    }

    public static Suggestion suggest(TargetsResponse targets, NutrientTotals eaten) {
        int remainingKcal = Math.max(0, targets.calories() - eaten.calories());
        if (targets.calories() <= 0 || remainingKcal == 0) {
            return new Suggestion(Status.TARGET_REACHED, 0, 0, 0, 0, 0, Focus.BALANCED);
        }

        double proteinLeft = leftShare(targets.proteinGrams(), eaten.proteinGrams());
        double fiberLeft = leftShare(targets.fiberGrams(), eaten.fiberGrams());
        double kcalLeft = (double) remainingKcal / targets.calories();

        Focus focus = Focus.BALANCED;
        if (proteinLeft - kcalLeft >= FOCUS_MARGIN) {
            focus = Focus.PROTEIN;
        } else if (fiberLeft - kcalLeft >= FOCUS_MARGIN) {
            focus = Focus.FIBER;
        }

        int calories = (int) (Math.round(Math.min(remainingKcal, targets.calories() * LUNCH_SHARE) / 10.0) * 10);
        return new Suggestion(
                Status.SUGGESTED,
                calories,
                capGrams(targets.proteinGrams(), eaten.proteinGrams()),
                capGrams(targets.carbsGrams(), eaten.carbsGrams()),
                capGrams(targets.fatGrams(), eaten.fatGrams()),
                capGrams(targets.fiberGrams(), eaten.fiberGrams()),
                focus);
    }

    /** Share of a goal still left, between 0 and 1. A goal of 0 or less counts as nothing left. */
    static double leftShare(int goal, double eaten) {
        if (goal <= 0) {
            return 0;
        }
        return Math.max(0, goal - eaten) / goal;
    }

    static int capGrams(int goal, double eaten) {
        return (int) Math.round(Math.min(Math.max(0, goal - eaten), goal * LUNCH_SHARE));
    }
}
