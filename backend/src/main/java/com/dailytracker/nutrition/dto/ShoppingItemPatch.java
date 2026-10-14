package com.dailytracker.nutrition.dto;

import jakarta.validation.constraints.NotNull;

public record ShoppingItemPatch(@NotNull Boolean checked) {
}
