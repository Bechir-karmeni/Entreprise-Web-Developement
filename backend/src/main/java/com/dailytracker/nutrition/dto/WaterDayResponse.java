package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.entity.WaterIntakeEntry;

import java.time.LocalDate;
import java.util.List;

public record WaterDayResponse(LocalDate date, int totalMl, List<WaterEntryResponse> entries) {

    public static WaterDayResponse of(LocalDate date, List<WaterIntakeEntry> entries) {
        int total = entries.stream().mapToInt(WaterIntakeEntry::getAmountMl).sum();
        return new WaterDayResponse(date, total, entries.stream().map(WaterEntryResponse::from).toList());
    }
}
