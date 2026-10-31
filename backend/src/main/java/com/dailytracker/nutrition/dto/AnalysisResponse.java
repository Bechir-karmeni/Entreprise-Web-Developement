package com.dailytracker.nutrition.dto;

import java.time.Instant;

/**
 * @param generatedAt when the analysis was created
 * @param loggedDays  days in the last 30 with food logged; 0 means there was nothing to analyse
 * @param text        the analysis as plain text (empty when loggedDays is 0)
 */
public record AnalysisResponse(Instant generatedAt, int loggedDays, String text) {
}
