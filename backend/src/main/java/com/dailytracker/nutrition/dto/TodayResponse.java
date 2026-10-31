package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.nutrition.LunchSuggester;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything the Today page shows for one day, in one response.
 *
 * @param remainingKcal    target minus consumed; negative when the day is over target
 * @param percentOfTarget  consumed as a share of the calorie target, rounded to a whole number
 * @param lunchSuggestion  present only for today, when breakfast is logged and lunch is still empty
 * @param eatingWindow     when the first and the last food of the day was logged; null when nothing is logged
 * @param micronutrients   vitamins and minerals for the day against the EU reference values
 */
public record TodayResponse(
        LocalDate date,
        TargetsResponse targets,
        NutrientTotals totals,
        int remainingKcal,
        int percentOfTarget,
        List<MealSummary> meals,
        WaterDayResponse water,
        LunchSuggester.Suggestion lunchSuggestion,
        EatingWindow eatingWindow,
        MicronutrientDay micronutrients
) {

    /** Times of logging only. This is not a fasting window and carries no advice. */
    public record EatingWindow(Instant firstLoggedAt, Instant lastLoggedAt) {
    }

    /** One meal block: its status, its totals and the logged foods. */
    public record MealSummary(
            MealType meal,
            boolean logged,
            int calories,
            double proteinGrams,
            double carbsGrams,
            double fatGrams,
            List<FoodLogEntryResponse> entries
    ) {
    }

    /**
     * Vitamins and minerals of the day. Only entries that carry nutrient data add to the amounts,
     * so entriesWithDetails tells how far the amounts can be trusted.
     */
    public record MicronutrientDay(int entriesTotal, int entriesWithDetails, List<NutrientAmount> nutrients) {
    }

    /**
     * One nutrient: the day's amount. referenceAmount and percentOfReference are null when there is no
     * reference value (sugar, saturated fat), so only the amount is shown.
     */
    public record NutrientAmount(String key, String unit, double amount, Double referenceAmount,
                                 Integer percentOfReference) {
    }
}
