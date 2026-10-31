package com.dailytracker.nutrition.ai;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.DayRow;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.FoodCount;
import com.dailytracker.nutrition.ai.AnalysisPromptBuilder.Input;
import com.dailytracker.nutrition.dto.ProfileResponse;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.WeightEntryResponse;
import com.dailytracker.nutrition.nutrition.ActivityLevel;
import com.dailytracker.nutrition.nutrition.NutritionGoal;
import com.dailytracker.nutrition.nutrition.Sex;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnalysisPromptBuilderTest {

    private static Input sampleInput() {
        ProfileResponse profile = new ProfileResponse(Sex.FEMALE, LocalDate.of(1990, 1, 1), 165, 60,
                ActivityLevel.MODERATELY_ACTIVE, NutritionGoal.LOSE_WEIGHT);
        TargetsResponse targets = new TargetsResponse(1500, 120, 150, 50, 25, 2.1, 1300, 2000, false, "estimate");
        List<DayRow> days = List.of(new DayRow(LocalDate.of(2026, 10, 20), 1850, 120.0, 200.0, 60.0, 25.0, 2000, 4));
        List<WeightEntryResponse> weights = List.of(new WeightEntryResponse(UUID.randomUUID(), LocalDate.of(2026, 10, 20), 60.0));
        List<FoodCount> foods = List.of(new FoodCount("Chicken", 3));
        return new Input(profile, targets, LocalDate.of(2026, 10, 25), 30, days, weights, foods);
    }

    @Test
    void userMessageContainsTheLoggedDataAndTheRequestedLanguage() {
        String message = AnalysisPromptBuilder.userMessage(sampleInput(), "de");

        assertTrue(message.startsWith("Answer in German."));
        assertTrue(message.contains("age: 36 years"));
        assertTrue(message.contains("2026-10-20: 1850 kcal"));
        assertTrue(message.contains("Chicken (3 times)"));
        assertTrue(message.contains("60.0"));
    }

    @Test
    void unknownLanguagesFallBackToEnglish() {
        assertTrue(AnalysisPromptBuilder.userMessage(sampleInput(), "en").startsWith("Answer in English."));
    }

    @Test
    void systemPromptKeepsTheSafetyRules() {
        String system = AnalysisPromptBuilder.systemPrompt();

        assertTrue(system.contains("not a doctor"));
        assertTrue(system.contains("supplements"));
        assertTrue(system.contains("restriction"));
    }
}
