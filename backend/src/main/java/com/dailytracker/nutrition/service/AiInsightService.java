package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisCooldown;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.DayRow;
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
import java.util.List;
import java.util.UUID;

/**
 * Gathers the user's recent food, water and weight, and asks Gemini for a short written answer.
 * Used by the weekly summary and the macro copilot. Each feature has its own cooldown, named by the caller.
 */
@Service
public class AiInsightService {

    private final ProfileService profiles;
    private final FoodLogRepository foodLog;
    private final WaterIntakeRepository water;
    private final WeightEntryRepository weights;
    private final GeminiClient client;
    private final AnalysisCooldown cooldown;
    private final Clock clock;

    public AiInsightService(ProfileService profiles, FoodLogRepository foodLog, WaterIntakeRepository water,
                            WeightEntryRepository weights, GeminiClient client, AnalysisCooldown cooldown, Clock clock) {
        this.profiles = profiles;
        this.foodLog = foodLog;
        this.water = water;
        this.weights = weights;
        this.client = client;
        this.cooldown = cooldown;
        this.clock = clock;
    }

    /** Answers with the given system prompt, using the last {@code periodDays} days of the user's data. */
    @Transactional(readOnly = true)
    public AnalysisResponse run(UUID userId, String language, int periodDays, String systemPrompt, String notSetUpMessage,
                                String feature) {
        ProfileResponse profile = profiles.getProfile(userId);
        TargetsResponse targets = profiles.getTargets(userId);
        if (!client.isConfigured()) {
            throw new ExternalServiceUnavailableException(notSetUpMessage);
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate from = today.minusDays(periodDays - 1);
        List<FoodLogEntry> foods = foodLog.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today);
        List<WaterIntakeEntry> waterEntries = water.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today);
        List<WeightEntryResponse> weightRows = weights.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, today)
                .stream()
                .map(WeightEntryResponse::from)
                .toList();

        List<DayRow> days = AnalysisService.dailyRows(foods, waterEntries);
        long loggedDays = days.stream().filter(day -> day.entries() > 0).count();
        if (loggedDays == 0) {
            // Nothing to write about yet: no API call and no cooldown used.
            return new AnalysisResponse(clock.instant(), 0, "");
        }

        cooldown.requireAllowed(userId, feature);
        AnalysisPromptBuilder.Input input = new AnalysisPromptBuilder.Input(
                profile, targets, today, periodDays, days, weightRows, AnalysisService.topFoods(foods));
        String text = client.complete(systemPrompt, AnalysisPromptBuilder.userMessage(input, language));
        return new AnalysisResponse(clock.instant(), (int) loggedDays, text);
    }
}
