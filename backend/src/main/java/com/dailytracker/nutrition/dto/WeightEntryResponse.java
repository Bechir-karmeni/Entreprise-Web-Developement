package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.WeightEntry;

import java.time.LocalDate;
import java.util.UUID;

public record WeightEntryResponse(UUID id, LocalDate date, double weightKg) {

    public static WeightEntryResponse from(WeightEntry entry) {
        return new WeightEntryResponse(entry.getId(), entry.getLogDate(), entry.getWeightKg());
    }
}
