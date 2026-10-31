package com.dailytracker.nutrition.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dailytracker.nutrition.dto.WaterDayResponse;
import com.dailytracker.nutrition.dto.WaterIntakeRequest;
import com.dailytracker.nutrition.entity.WaterIntakeEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.WaterIntakeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WaterServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 25);

    @Mock
    private WaterIntakeRepository entries;

    @Test
    void addReturnsTheUpdatedDayTotal() {
        UUID userId = UUID.randomUUID();
        when(entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, DAY))
                .thenReturn(List.of(new WaterIntakeEntry(userId, DAY, 250)));

        WaterDayResponse response = new WaterService(entries).add(userId, new WaterIntakeRequest(DAY, 500));

        assertEquals(750, response.totalMl());
        assertEquals(2, response.entries().size());
        verify(entries).save(any(WaterIntakeEntry.class));
    }

    @Test
    void addRejectsAmountsThatExceedTheDailyLimit() {
        UUID userId = UUID.randomUUID();
        when(entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, DAY))
                .thenReturn(List.of(new WaterIntakeEntry(userId, DAY, 4900)));

        WaterService service = new WaterService(entries);
        assertThrows(InvalidRequestException.class,
                () -> service.add(userId, new WaterIntakeRequest(DAY, 250)));

        verify(entries, never()).save(any(WaterIntakeEntry.class));
    }

    @Test
    void deleteCannotRemoveAnotherUsersEntry() {
        UUID userId = UUID.randomUUID();
        UUID entryId = UUID.randomUUID();
        when(entries.findByIdAndUserId(entryId, userId)).thenReturn(Optional.empty());

        WaterService service = new WaterService(entries);
        assertThrows(ResourceNotFoundException.class, () -> service.delete(userId, entryId));

        verify(entries, never()).delete(any(WaterIntakeEntry.class));
    }
}
