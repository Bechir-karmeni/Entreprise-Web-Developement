package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.dto.WeightEntryResponse;
import com.dailytracker.nutrition.dto.WeightRequest;
import com.dailytracker.nutrition.entity.WeightEntry;
import com.dailytracker.nutrition.exception.InvalidRequestException;
import com.dailytracker.nutrition.exception.ResourceNotFoundException;
import com.dailytracker.nutrition.repository.WeightEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class WeightService {

    /** Longest period one request may ask for (one year). */
    static final int MAX_RANGE_DAYS = 366;

    private final WeightEntryRepository entries;

    public WeightService(WeightEntryRepository entries) {
        this.entries = entries;
    }

    /** Creates the weigh-in for that day, or replaces the value if the day already has one. */
    @Transactional
    public WeightEntryResponse save(UUID userId, WeightRequest request) {
        if (request.date().isAfter(LocalDate.now())) {
            throw new InvalidRequestException("A weigh-in cannot be in the future.");
        }
        double weightKg = Math.round(request.weightKg() * 10) / 10.0;
        WeightEntry entry = entries.findByUserIdAndLogDate(userId, request.date())
                .map(existing -> {
                    existing.changeWeight(weightKg);
                    return existing;
                })
                .orElseGet(() -> new WeightEntry(userId, request.date(), weightKg));
        entries.save(entry);
        return WeightEntryResponse.from(entry);
    }

    @Transactional(readOnly = true)
    public List<WeightEntryResponse> list(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new InvalidRequestException("The end date must be after the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new InvalidRequestException("Choose a period of at most one year.");
        }
        return entries.findByUserIdAndLogDateBetweenOrderByLogDateAsc(userId, from, to).stream()
                .map(WeightEntryResponse::from)
                .toList();
    }

    @Transactional
    public void delete(UUID userId, UUID entryId) {
        WeightEntry entry = entries.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Weigh-in not found."));
        entries.delete(entry);
    }
}
