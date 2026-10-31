package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.DailyTotalResponse;
import com.dailytracker.nutrition.entity.FoodLogEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.food.MealType;
import com.dailytracker.nutrition.repository.FoodLogRepository;
import com.dailytracker.nutrition.repository.FoodRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoodLogRangeTest {

    private final UUID userId = UUID.randomUUID();
    private final FoodLogRepository entries = mock(FoodLogRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-27T10:00:00Z"), ZoneOffset.UTC);
    private final FoodLogService service = new FoodLogService(entries, mock(FoodRepository.class), clock);

    @Test
    void rejectsRangeLongerThanAYear() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        assertThatThrownBy(() -> service.dailyTotals(userId, from, from.plusDays(FoodLogService.MAX_RANGE_DAYS + 1)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejectsEndBeforeStart() {
        LocalDate day = LocalDate.of(2026, 10, 27);
        assertThatThrownBy(() -> service.dailyTotals(userId, day, day.minusDays(1)))
                .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void sumsEntriesPerDayAndLeavesOutEmptyDays() {
        LocalDate first = LocalDate.of(2026, 10, 25);
        LocalDate second = LocalDate.of(2026, 10, 27);
        when(entries.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, first, second)).thenReturn(List.of(
                new FoodLogEntry(userId, first, MealType.BREAKFAST, null, "Oats", 1, "portion", 300, 10, 50, 5, 4),
                new FoodLogEntry(userId, first, MealType.LUNCH, null, "Rice", 1, "portion", 200, 4, 40, 1, 1),
                new FoodLogEntry(userId, second, MealType.DINNER, null, "Fish", 1, "portion", 500, 40, 0, 20, 0)));

        List<DailyTotalResponse> result = service.dailyTotals(userId, first, second);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).date()).isEqualTo(first);
        assertThat(result.get(0).totals().calories()).isEqualTo(500);
        assertThat(result.get(0).totals().proteinGrams()).isEqualTo(14.0);
        assertThat(result.get(1).date()).isEqualTo(second);
        assertThat(result.get(1).totals().calories()).isEqualTo(500);
    }
}
