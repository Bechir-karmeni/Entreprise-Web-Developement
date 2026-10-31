package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.WaterDayResponse;
import com.dailytracker.nutrition.dto.WaterIntakeRequest;
import com.dailytracker.nutrition.entity.WaterIntakeEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.WaterIntakeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class WaterService {

    /**
     * Safety limit: drinking very large amounts of water in a short time can lower blood sodium
     * to dangerous levels. 5 litres a day is well above normal needs.
     */
    static final int MAX_DAILY_ML = 5000;

    private final WaterIntakeRepository entries;

    public WaterService(WaterIntakeRepository entries) {
        this.entries = entries;
    }

    @Transactional
    public WaterDayResponse add(UUID userId, WaterIntakeRequest request) {
        List<WaterIntakeEntry> day = new ArrayList<>(
                entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, request.date()));
        int total = day.stream().mapToInt(WaterIntakeEntry::getAmountMl).sum();
        if (total + request.amountMl() > MAX_DAILY_ML) {
            throw new InvalidRequestException(
                    "That would be more than 5 litres today. Spread your drinks over the day.");
        }
        WaterIntakeEntry entry = new WaterIntakeEntry(userId, request.date(), request.amountMl());
        entries.save(entry);
        day.add(entry);
        return WaterDayResponse.of(request.date(), day);
    }

    @Transactional(readOnly = true)
    public WaterDayResponse day(UUID userId, LocalDate date) {
        return WaterDayResponse.of(date, entries.findByUserIdAndLogDateOrderByCreatedAtAsc(userId, date));
    }

    @Transactional
    public void delete(UUID userId, UUID entryId) {
        WaterIntakeEntry entry = entries.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Entry not found."));
        entries.delete(entry);
    }
}
