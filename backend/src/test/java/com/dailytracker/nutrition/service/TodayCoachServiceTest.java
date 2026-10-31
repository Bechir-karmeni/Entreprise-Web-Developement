package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.ai.AnalysisCooldown;
import com.dailytracker.nutrition.ai.GeminiClient;
import com.dailytracker.nutrition.dto.NutrientTotals;
import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.TodayCoachResponse;
import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.dto.WaterDayResponse;
import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import com.dailytracker.nutrition.food.MealType;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TodayCoachServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 25);
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T10:00:00Z"), ZoneOffset.UTC);

    @Mock
    private TodayService today;
    @Mock
    private GeminiClient client;
    @Mock
    private AnalysisCooldown cooldown;

    private TodayCoachService service() {
        return new TodayCoachService(today, client, cooldown, CLOCK);
    }

    /** A day with breakfast logged (or nothing logged at all). */
    private static TodayResponse day(boolean breakfastLogged) {
        List<TodayResponse.MealSummary> meals = List.of(
                new TodayResponse.MealSummary(MealType.BREAKFAST, breakfastLogged, breakfastLogged ? 500 : 0, 0, 0, 0, List.of()),
                new TodayResponse.MealSummary(MealType.LUNCH, false, 0, 0, 0, 0, List.of()),
                new TodayResponse.MealSummary(MealType.DINNER, false, 0, 0, 0, 0, List.of()),
                new TodayResponse.MealSummary(MealType.SNACK, false, 0, 0, 0, 0, List.of()));
        TargetsResponse targets = new TargetsResponse(1850, 120, 200, 60, 30, 2.8, 1470, 2100, false, "estimate");
        NutrientTotals totals = new NutrientTotals(breakfastLogged ? 1240 : 0, 0, 0, 0, 0);
        return new TodayResponse(DAY, targets, totals, 610, 67, meals,
                new WaterDayResponse(DAY, 0, List.of()), null, null, new TodayResponse.MicronutrientDay(0, 0, List.of()));
    }

    @Test
    void refusesWhenTheAiIsNotConfigured() {
        when(client.isConfigured()).thenReturn(false);

        assertThrows(ExternalServiceUnavailableException.class,
                () -> service().coach(UUID.randomUUID(), DAY, "en"));
        verify(client, never()).complete(anyString(), anyString());
    }

    @Test
    void returnsAnEmptyNoteWithoutAnApiCallWhenNothingIsLogged() {
        UUID userId = UUID.randomUUID();
        when(client.isConfigured()).thenReturn(true);
        when(today.today(userId, DAY)).thenReturn(day(false));

        TodayCoachResponse response = service().coach(userId, DAY, "en");

        assertEquals("", response.text());
        verify(client, never()).complete(anyString(), anyString());
        verify(cooldown, never()).requireAllowed(userId, "coach");
    }

    @Test
    void asksClaudeOnceAndReturnsItsText() {
        UUID userId = UUID.randomUUID();
        when(client.isConfigured()).thenReturn(true);
        when(today.today(userId, DAY)).thenReturn(day(true));
        when(client.complete(anyString(), anyString())).thenReturn("Good start today.");

        TodayCoachResponse response = service().coach(userId, DAY, "en");

        assertEquals("Good start today.", response.text());
        verify(cooldown).requireAllowed(userId, "coach");
    }

    @Test
    void theMessageContainsTheDayAndAsksForPlainShortText() {
        String message = TodayCoachService.userMessage(day(true), "en");

        assertTrue(message.contains("Eaten so far: 1240 kcal"));
        assertTrue(message.contains("Daily targets: 1850 kcal"));
        assertTrue(message.contains("- BREAKFAST: 500 kcal"));
        assertTrue(message.contains("Answer in English."));
        assertTrue(message.contains("no lists"));
    }

    @Test
    void theMessageAsksForGermanWhenTheLanguageIsGerman() {
        assertTrue(TodayCoachService.userMessage(day(true), "de").contains("Antworte auf Deutsch."));
    }
}
