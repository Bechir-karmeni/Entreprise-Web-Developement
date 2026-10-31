package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisCooldown;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder;
import com.dailytracker.nutrition.ai.GeminiClient;
import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.TodayCoachResponse;
import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Writes a short note about one day with Gemini, from the dashboard numbers for that day. It uses the same safety
 * prompt as the 30-day analysis, and its own cooldown of ten minutes per user.
 */
@Service
public class TodayCoachService {

    private final TodayService today;
    private final GeminiClient client;
    private final AnalysisCooldown cooldown;
    private final Clock clock;

    public TodayCoachService(TodayService today, GeminiClient client, AnalysisCooldown cooldown, Clock clock) {
        this.today = today;
        this.client = client;
        this.cooldown = cooldown;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public TodayCoachResponse coach(UUID userId, LocalDate date, String language) {
        if (!client.isConfigured()) {
            throw new ExternalServiceUnavailableException("The AI coach is not set up yet.");
        }
        TodayResponse day = today.today(userId, date);
        boolean anythingLogged = day.meals().stream().anyMatch(TodayResponse.MealSummary::logged);
        if (!anythingLogged) {
            // Nothing to write about yet: no API call and no cooldown used.
            return new TodayCoachResponse(clock.instant(), "");
        }

        cooldown.requireAllowed(userId, "coach");
        String text = client.complete(AnalysisPromptBuilder.systemPrompt(), userMessage(day, language));
        return new TodayCoachResponse(clock.instant(), text);
    }

    /** The facts about the day, in plain text, and the length and style the note should have. */
    static String userMessage(TodayResponse day, String language) {
        TargetsResponse targets = day.targets();
        NutrientTotals eaten = day.totals();
        StringBuilder message = new StringBuilder();
        message.append("Date: ").append(day.date()).append('\n');
        message.append("Daily targets: ").append(targets.calories()).append(" kcal, protein ")
                .append(targets.proteinGrams()).append(" g, carbs ").append(targets.carbsGrams())
                .append(" g, fat ").append(targets.fatGrams()).append(" g, fiber ").append(targets.fiberGrams()).append(" g\n");
        message.append("Eaten so far: ").append(eaten.calories()).append(" kcal, protein ")
                .append(eaten.proteinGrams()).append(" g, carbs ").append(eaten.carbsGrams())
                .append(" g, fat ").append(eaten.fatGrams()).append(" g, fiber ").append(eaten.fiberGrams()).append(" g\n");
        message.append("Water: ").append(day.water().totalMl()).append(" ml of about ")
                .append(Math.round(targets.waterLiters() * 1000)).append(" ml goal\n");
        message.append("Per meal:\n");
        for (TodayResponse.MealSummary meal : day.meals()) {
            message.append("- ").append(meal.meal()).append(": ").append(meal.calories()).append(" kcal");
            if (!meal.logged()) {
                message.append(" (not logged)");
            }
            message.append('\n');
        }
        message.append('\n');
        message.append("de".equals(language) ? "Antworte auf Deutsch." : "Answer in English.").append(' ');
        message.append("Write a short note about today: three to four sentences in plain text, no lists. ");
        message.append("Say what went well, then give one practical idea for the next meal. ");
        message.append("Do not diagnose, do not recommend supplements, and do not suggest fasting or eating less.");
        return message.toString();
    }
}
