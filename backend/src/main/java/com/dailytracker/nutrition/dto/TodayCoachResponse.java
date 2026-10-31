package com.dailytracker.nutrition.dto;

import java.time.Instant;

/**
 * @param generatedAt when the note was created
 * @param text        the note as plain text; empty when nothing was logged that day (no AI call is made)
 */
public record TodayCoachResponse(Instant generatedAt, String text) {
}
