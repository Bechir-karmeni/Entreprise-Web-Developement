package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Price of a shopping item in cents (up to 10,000 euros). Null removes the price. */
public record ShoppingItemPriceRequest(@Min(0) @Max(1_000_000) Integer priceCents) {
}
