package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.FoodLogEntryResponse;
import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.dto.TodayResponse.MealSummary;
import com.dailytracker.nutrition.dto.WaterDayResponse;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.food.Micronutrient;
import com.dailytracker.nutrition.nutrition.LunchSuggester;
import com.dailytracker.nutrition.repository.FoodLogRepository;
import com.dailytracker.nutrition.repository.WaterIntakeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Builds the Today page: targets, totals, meals, water and the lunch suggestion for one day. */
@Service
public class TodayService {

    private static final List<MealType> MEAL_ORDER = List.of(
            MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK);

    private final FoodLogRepository entries;
    private final WaterIntakeRepository water;
    private final ProfileService profiles;
    private final Clock clock;

    public TodayService(FoodLogRepository entries, WaterIntakeRepository water, ProfileService profiles, Clock clock) {
        this.entries = entries;
        this.water = water;
        this.profiles = profiles;
        this.clock = clock;
    }

    /** Without a date, returns today (server clock). */
    @Transactional(readOnly = true)
    public TodayResponse today(UUID userId, LocalDate requestedDate) {
        LocalDate today = LocalDate.now(clock);
        LocalDate date = requestedDate != null ? requestedDate : today;

        TargetsResponse targets = profiles.getTargets(userId);
        List<FoodLogEntry> dayEntries = entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date);
        NutrientTotals totals = FoodLogService.totalsOf(dayEntries);

        int remainingKcal = targets.calories() - totals.calories();
        int percent = targets.calories() > 0
                ? (int) Math.round((double) totals.calories() / targets.calories() * 100)
                : 0;

        List<MealSummary> meals = MEAL_ORDER.stream()
                .map(meal -> mealSummary(meal, dayEntries))
                .toList();

        WaterDayResponse waterDay = WaterDayResponse.of(
                date, water.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date));

        LunchSuggester.Suggestion lunch = null;
        if (date.equals(today) && hasMeal(dayEntries, MealType.BREAKFAST) && !hasMeal(dayEntries, MealType.LUNCH)) {
            lunch = LunchSuggester.suggest(targets, totals);
        }

        // Entries come back ordered by creation time, so the first and last entries are the first and last logs.
        TodayResponse.EatingWindow window = dayEntries.isEmpty()
                ? null
                : new TodayResponse.EatingWindow(
                        dayEntries.get(0).getCreatedAt(),
                        dayEntries.get(dayEntries.size() - 1).getCreatedAt());

        return new TodayResponse(date, targets, totals, remainingKcal, percent, meals, waterDay, lunch, window,
                micronutrientDay(dayEntries));
    }

    static MealSummary mealSummary(MealType meal, List<FoodLogEntry> dayEntries) {
        List<FoodLogEntry> items = dayEntries.stream().filter(entry -> entry.getMealType() == meal).toList();
        return new MealSummary(
                meal,
                !items.isEmpty(),
                items.stream().mapToInt(FoodLogEntry::getCalories).sum(),
                FoodLogService.round1(items.stream().mapToDouble(FoodLogEntry::getProtein).sum()),
                FoodLogService.round1(items.stream().mapToDouble(FoodLogEntry::getCarbs).sum()),
                FoodLogService.round1(items.stream().mapToDouble(FoodLogEntry::getFat).sum()),
                items.stream().map(FoodLogEntryResponse::from).toList());
    }

    /**
     * The day's vitamins and minerals, each against its EU reference value. Entries without nutrient data
     * add nothing, and entriesWithDetails says how many entries did carry data.
     */
    static TodayResponse.MicronutrientDay micronutrientDay(List<FoodLogEntry> dayEntries) {
        Map<String, Double> sums = new HashMap<>();
        int withDetails = 0;
        for (FoodLogEntry entry : dayEntries) {
            Map<String, Double> values = entry.getMicronutrients();
            if (values == null) {
                continue;
            }
            withDetails++;
            values.forEach((key, value) -> sums.merge(key, value, Double::sum));
        }
        List<TodayResponse.NutrientAmount> nutrients = new ArrayList<>();
        for (Micronutrient nutrient : Micronutrient.values()) {
            double amount = FoodLogService.round1(sums.getOrDefault(nutrient.name(), 0.0));
            Double reference = nutrient.referenceAmount();
            Integer percent = reference == null ? null : (int) Math.round(amount / reference * 100);
            nutrients.add(new TodayResponse.NutrientAmount(
                    nutrient.name(), nutrient.unit(), amount, reference, percent));
        }
        return new TodayResponse.MicronutrientDay(dayEntries.size(), withDetails, nutrients);
    }

    static boolean hasMeal(List<FoodLogEntry> dayEntries, MealType meal) {
        return dayEntries.stream().anyMatch(entry -> entry.getMealType() == meal);
    }
}
