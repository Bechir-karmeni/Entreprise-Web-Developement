package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.ai.AnalysisPromptBuilder;
import com.dailytracker.nutrition.dto.AnalysisResponse;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** A short written summary of the user's last 7 days, made by Gemini. */
@Service
public class SummaryService {

    static final int PERIOD_DAYS = 7;

    private final AiInsightService insights;

    public SummaryService(AiInsightService insights) {
        this.insights = insights;
    }

    public AnalysisResponse summarise(UUID userId, String language) {
        return insights.run(userId, language, PERIOD_DAYS, AnalysisPromptBuilder.summarySystemPrompt(),
                "The AI summary is not set up yet.", "summary");
    }
}
