package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.TargetsResponse;
import com.dailytracker.nutrition.dto.TodayResponse;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.nutrition.LunchSuggester;
import com.dailytracker.nutrition.repository.FoodLogRepository;
import com.dailytracker.nutrition.repository.WaterIntakeRepository;
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
class TodayServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 25);
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-25T08:00:00Z"), ZoneOffset.UTC);
    private static final TargetsResponse TARGETS =
            new TargetsResponse(1850, 120, 200, 60, 30, 2.5, 1500, 2000, false, "estimate");

    @Mock
    private FoodLogRepository entries;
    @Mock
    private WaterIntakeRepository water;
    @Mock
    private ProfileService profiles;

    private final UUID userId = UUID.randomUUID();

    private TodayService service() {
        return new TodayService(entries, water, profiles, CLOCK);
    }

    private static FoodLogEntry entry(UUID userId, LocalDate date, MealType meal, int calories, double protein) {
        return new FoodLogEntry(userId, date, meal, null, "Food", 100, "g", calories, protein, 10, 2, 3);
    }

    private void stubDay(LocalDate date, List<FoodLogEntry> dayEntries) {
        when(profiles.getTargets(userId)).thenReturn(TARGETS);
        when(entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date)).thenReturn(dayEntries);
        when(water.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date)).thenReturn(List.of());
    }

    @Test
    void summarisesTheDayAndTheMeals() {
        List<FoodLogEntry> dayEntries = List.of(
                entry(userId, TODAY, MealType.BREAKFAST, 300, 10),
                entry(userId, TODAY, MealType.BREAKFAST, 200, 5));
        stubDay(TODAY, dayEntries);

        TodayResponse response = service().today(userId, TODAY);

        assertEquals(500, response.totals().calories());
        assertEquals(1350, response.remainingKcal());
        assertEquals(27, response.percentOfTarget());
        assertEquals(4, response.meals().size());
        assertTrue(response.meals().get(0).logged());
        assertEquals(500, response.meals().get(0).calories());
        assertEquals(15.0, response.meals().get(0).proteinGrams());
        assertFalse(response.meals().get(1).logged());
        assertEquals(0, response.meals().get(1).calories());
    }

    @Test
    void suggestsLunchForTodayWhenBreakfastIsLoggedAndLunchIsNot() {
        stubDay(TODAY, List.of(entry(userId, TODAY, MealType.BREAKFAST, 300, 10)));

        TodayResponse response = service().today(userId, TODAY);

        assertEquals(LunchSuggester.Status.SUGGESTED, response.lunchSuggestion().status());
        assertEquals(650, response.lunchSuggestion().calories());
    }

    @Test
    void doesNotSuggestLunchWhenLunchIsAlreadyLogged() {
        stubDay(TODAY, List.of(
                entry(userId, TODAY, MealType.BREAKFAST, 300, 10),
                entry(userId, TODAY, MealType.LUNCH, 600, 30)));

        assertNull(service().today(userId, TODAY).lunchSuggestion());
    }

    @Test
    void doesNotSuggestLunchForAPastDay() {
        LocalDate yesterday = TODAY.minusDays(1);
        stubDay(yesterday, List.of(entry(userId, yesterday, MealType.BREAKFAST, 300, 10)));

        assertNull(service().today(userId, yesterday).lunchSuggestion());
    }

    @Test
    void doesNotSuggestLunchWithoutBreakfast() {
        stubDay(TODAY, List.of(entry(userId, TODAY, MealType.SNACK, 150, 3)));

        assertNull(service().today(userId, TODAY).lunchSuggestion());
    }

    @Test
    void usesTodayWhenNoDateIsGiven() {
        stubDay(TODAY, List.of());

        assertEquals(TODAY, service().today(userId, null).date());
    }

    @Test
    void eatingWindowIsTheFirstAndLastLogOfTheDay() {
        FoodLogEntry first = entry(userId, TODAY, MealType.BREAKFAST, 300, 10);
        FoodLogEntry last = entry(userId, TODAY, MealType.DINNER, 600, 30);
        stubDay(TODAY, List.of(first, last));

        TodayResponse.EatingWindow window = service().today(userId, TODAY).eatingWindow();

        assertEquals(first.getCreatedAt(), window.firstLoggedAt());
        assertEquals(last.getCreatedAt(), window.lastLoggedAt());
    }

    @Test
    void eatingWindowIsNullWhenNothingIsLogged() {
        stubDay(TODAY, List.of());

        assertNull(service().today(userId, TODAY).eatingWindow());
    }
}
