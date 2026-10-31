package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Positive;

/** The new amount eaten, in the entry's serving unit. */
public record AmountUpdateRequest(
        @Positive @DecimalMax("5000") double amount
) {
}
