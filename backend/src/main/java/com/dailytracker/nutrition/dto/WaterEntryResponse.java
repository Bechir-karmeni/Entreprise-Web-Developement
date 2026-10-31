package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.WaterIntakeEntry;

import java.time.Instant;
import java.util.UUID;

public record WaterEntryResponse(UUID id, int amountMl, Instant createdAt) {

    public static WaterEntryResponse from(WaterIntakeEntry entry) {
        return new WaterEntryResponse(entry.getId(), entry.getAmountMl(), entry.getCreatedAt());
    }
}
