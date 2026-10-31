package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisCooldown;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.DayRow;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.FoodCount;
import com.dailytracker.nutrition.ai.GeminiClient;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.WeightEntryResponse;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.entity.WaterIntakeEntry;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.repository.FoodLogRepository;
import com.dailytracker.nutrition.repository.WaterIntakeRepository;
import com.dailytracker.nutrition.repository.WeightEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import java.util.function.ToDoubleFunction;
import java.util.stream.Collectors;

/** Gathers the user's last 30 days and asks Claude for a written analysis with recommendations. */
@Service
public class AnalysisService {

    static final int PERIOD_DAYS = 30;
    private static final int TOP_FOODS = 8;

    private final ProfileService profiles;
    private final FoodLogRepository foodLog;
    private final WaterIntakeRepository water;
    private final WeightEntryRepository weights;
    private final GeminiClient client;
    private final AnalysisCooldown cooldown;
    private final Clock clock;

    public AnalysisService(ProfileService profiles, FoodLogRepository foodLog, WaterIntakeRepository water,
                           WeightEntryRepository weights, GeminiClient client, AnalysisCooldown cooldown,
                           Clock clock) {
        this.profiles = profiles;
        this.foodLog = foodLog;
        this.water = water;
        this.weights = weights;
        this.client = client;
        this.cooldown = cooldown;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AnalysisResponse analyse(UUID userId, String language) {
        ProfileResponse profile = profiles.getProfile(userId);
        TargetsResponse targets = profiles.getTargets(userId);
        if (!client.isConfigured()) {
            throw new ExternalServiceUnavailableException("The AI analysis is not set up yet.");
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate from = today.minusDays(PERIOD_DAYS - 1);
        List<FoodLogEntry> foods = foodLog.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today);
        List<WaterIntakeEntry> waterEntries = water.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today);
        List<WeightEntryResponse> weightRows = weights.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today)
                .stream()
                .map(WeightEntryResponse::from)
                .toList();

        List<DayRow> days = dailyRows(foods, waterEntries);
        long loggedDays = days.stream().filter(day -> day.entries() > 0).count();
        if (loggedDays == 0) {
            // Nothing to analyse yet: no API call and no cooldown used.
            return new AnalysisResponse(clock.instant(), 0, "");
        }

        cooldown.requireAllowed(userId);
        AnalysisPromptBuilder.Input input = new AnalysisPromptBuilder.Input(
                profile, targets, today, PERIOD_DAYS, days, weightRows, topFoods(foods));
        String text = client.complete(
                AnalysisPromptBuilder.systemPrompt(),
                AnalysisPromptBuilder.userMessage(input, language));
        return new AnalysisResponse(clock.instant(), (int) loggedDays, text);
    }

    /** One row per day that has food or water, oldest first. */
    static List<DayRow> dailyRows(List<FoodLogEntry> foods, List<WaterIntakeEntry> waterEntries) {
        Map<LocalDate, List<FoodLogEntry>> foodByDay = foods.stream()
                .collect(Collectors.groupingBy(FoodLogEntry::getLogDate, TreeMap::new, Collectors.toList()));
        Map<LocalDate, Integer> waterByDay = waterEntries.stream()
                .collect(Collectors.groupingBy(WaterIntakeEntry::getLogDate, TreeMap::new,
                        Collectors.summingInt(WaterIntakeEntry::getAmountMl)));

        Set<LocalDate> dates = new TreeSet<>();
        dates.addAll(foodByDay.keySet());
        dates.addAll(waterByDay.keySet());

        List<DayRow> rows = new ArrayList<>();
        for (LocalDate date : dates) {
            List<FoodLogEntry> dayFoods = foodByDay.getOrDefault(date, List.of());
            rows.add(new DayRow(
                    date,
                    dayFoods.stream().mapToInt(FoodLogEntry::getCalories).sum(),
                    sum(dayFoods, FoodLogEntry::getProtein),
                    sum(dayFoods, FoodLogEntry::getCarbs),
                    sum(dayFoods, FoodLogEntry::getFat),
                    sum(dayFoods, FoodLogEntry::getFiber),
                    waterByDay.getOrDefault(date, 0),
                    dayFoods.size()));
        }
        return rows;
    }

    static List<FoodCount> topFoods(List<FoodLogEntry> foods) {
        return foods.stream()
                .collect(Collectors.groupingBy(FoodLogEntry::getFoodName, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(TOP_FOODS)
                .map(entry -> new FoodCount(entry.getKey(), entry.getValue().intValue()))
                .toList();
    }

    private static double sum(List<FoodLogEntry> list, ToDoubleFunction<FoodLogEntry> value) {
        return list.stream().mapToDouble(value).sum();
    }
}
