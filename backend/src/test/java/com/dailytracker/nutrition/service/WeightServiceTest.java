package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.WeightEntryResponse;
import com.dailytracker.nutrition.dto.WeightRequest;
import com.dailytracker.nutrition.entity.WeightEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.WeightEntryRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WeightServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 20);

    @Mock
    private WeightEntryRepository entries;

    @Test
    void saveCreatesAWeighInWhenTheDayIsEmpty() {
        UUID userId = UUID.randomUUID();
        when(entries.findByUserIdAndLogDate(userId, DAY)).thenReturn(Optional.empty());

        WeightEntryResponse response = new WeightService(entries).save(userId, new WeightRequest(DAY, 80.04));

        assertEquals(80.0, response.weightKg());
        verify(entries).save(any(WeightEntry.class));
    }

    @Test
    void saveReplacesTheValueOfAnExistingDay() {
        UUID userId = UUID.randomUUID();
        WeightEntry existing = new WeightEntry(userId, DAY, 80.0);
        when(entries.findByUserIdAndLogDate(userId, DAY)).thenReturn(Optional.of(existing));

        WeightEntryResponse response = new WeightService(entries).save(userId, new WeightRequest(DAY, 79.4));

        assertEquals(79.4, response.weightKg());
        verify(entries).save(same(existing));
    }

    @Test
    void saveRejectsWeighInsForFutureDays() {
        UUID userId = UUID.randomUUID();
        WeightService service = new WeightService(entries);

        assertThrows(InvalidRequestException.class,
                () -> service.save(userId, new WeightRequest(LocalDate.now().plusDays(1), 80.0)));

        verify(entries, never()).save(any(WeightEntry.class));
    }

    @Test
    void listRejectsPeriodsLongerThanAYear() {
        WeightService service = new WeightService(entries);

        assertThrows(InvalidRequestException.class,
                () -> service.list(UUID.randomUUID(), DAY, DAY.plusDays(400)));
    }

    @Test
    void deleteCannotRemoveAnotherUsersWeighIn() {
        UUID userId = UUID.randomUUID();
        UUID entryId = UUID.randomUUID();
        when(entries.findByIdAndUserId(entryId, userId)).thenReturn(Optional.empty());

        WeightService service = new WeightService(entries);
        assertThrows(ResourceNotFoundException.class, () -> service.delete(userId, entryId));

        verify(entries, never()).delete(any(WeightEntry.class));
    }
}
