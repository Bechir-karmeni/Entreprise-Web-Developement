package com.dailytracker.nutrition.dto;

/** The weekly shopping budget in cents. Null when no budget is set. */
public record ShoppingBudgetResponse(Integer amountCents) {
}
