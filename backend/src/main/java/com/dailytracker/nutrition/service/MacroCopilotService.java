package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisPromptBuilder;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Personal macro guidance (protein, carbs, fat, fiber) from the last 14 days, made by Gemini. */
@Service
public class MacroCopilotService {

    static final int PERIOD_DAYS = 14;

    private final AiInsightService insights;

    public MacroCopilotService(AiInsightService insights) {
        this.insights = insights;
    }

    public AnalysisResponse guidance(UUID userId, String language) {
        return insights.run(userId, language, PERIOD_DAYS, AnalysisPromptBuilder.macroSystemPrompt(),
                "The AI guidance is not set up yet.", "copilot");
    }
}
