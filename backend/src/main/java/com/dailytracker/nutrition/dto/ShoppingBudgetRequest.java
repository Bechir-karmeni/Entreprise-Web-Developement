package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Weekly shopping budget in cents (up to 100,000 euros). Null removes the budget. */
public record ShoppingBudgetRequest(@Min(0) @Max(10_000_000) Integer amountCents) {
}
