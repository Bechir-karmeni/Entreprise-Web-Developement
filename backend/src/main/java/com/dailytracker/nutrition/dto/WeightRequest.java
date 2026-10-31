package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record WeightRequest(
        @NotNull LocalDate date,
        @DecimalMin("30") @DecimalMax("300") double weightKg
) {
}
