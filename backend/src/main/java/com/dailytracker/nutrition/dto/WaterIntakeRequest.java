package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record WaterIntakeRequest(
        @NotNull LocalDate date,
        @Min(1) @Max(2000) int amountMl
) {
}
