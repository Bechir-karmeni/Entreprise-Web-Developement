package com.dailytracker.nutrition.dto;

import com.dailytracker.nutrition.shopping.ShoppingCategory;
import jakarta.validation.constraints.NotNull;

public record ShoppingItemCategoryRequest(@NotNull ShoppingCategory category) {
}
